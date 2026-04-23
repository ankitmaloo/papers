from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, quote, unquote, urlparse, urlunparse
from urllib.request import Request, urlopen


DOI_PATTERN = re.compile(r"(10\.\d{4,9}/[-._;()/:A-Z0-9]+)", re.IGNORECASE)
ARXIV_PATTERN = re.compile(
    r"arxiv\.org/(?:abs|pdf)/([a-z\-]+/\d{7}|\d{4}\.\d{4,5})(?:\.pdf)?",
    re.IGNORECASE,
)
TRACKING_QUERY_PARAMS = {
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "utm_campaign",
    "utm_content",
    "utm_medium",
    "utm_source",
    "utm_term",
}
NO_RESPONSE = "_No response_"
USER_AGENT = "paper-trail-bot/1.0 (+https://github.com/actions)"
FetchJson = Callable[[str, str, int], tuple[dict[str, Any], str]]
FetchText = Callable[[str, str, int], tuple[str, str]]


class PaperIngestError(RuntimeError):
    """Raised when a paper cannot be ingested from the submitted URL."""


@dataclass(slots=True)
class IssueSubmission:
    paper_url: str
    title_override: str | None = None
    tags: list[str] = field(default_factory=list)
    notes: str | None = None


@dataclass(slots=True)
class Metadata:
    title: str | None = None
    authors: list[str] = field(default_factory=list)
    venue: str | None = None
    published_date: str | None = None
    doi: str | None = None
    arxiv_id: str | None = None
    abstract: str | None = None
    source_url: str | None = None
    canonical_url: str | None = None


@dataclass(slots=True)
class IngestResult:
    status: str
    paper_slug: str | None = None
    paper_title: str | None = None
    commit_subject: str | None = None
    message: str | None = None


class HtmlMetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.meta: dict[str, list[str]] = {}
        self.canonical_url: str | None = None
        self.title_parts: list[str] = []
        self._inside_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {key.lower(): value for key, value in attrs if value is not None}
        if tag.lower() == "meta":
            key = attributes.get("name") or attributes.get("property")
            content = attributes.get("content")
            if key and content:
                lowered = key.strip().lower()
                self.meta.setdefault(lowered, []).append(content.strip())
        if tag.lower() == "link":
            rel = attributes.get("rel", "").lower()
            href = attributes.get("href")
            if href and rel == "canonical":
                self.canonical_url = href.strip()
        if tag.lower() == "title":
            self._inside_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._inside_title = False

    def handle_data(self, data: str) -> None:
        if self._inside_title:
            self.title_parts.append(data)

    @property
    def title(self) -> str | None:
        return squash_whitespace("".join(self.title_parts))


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def squash_whitespace(value: str | None) -> str | None:
    if value is None:
        return None
    squashed = re.sub(r"\s+", " ", value).strip()
    return squashed or None


def clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    without_tags = re.sub(r"<[^>]+>", " ", value)
    return squash_whitespace(without_tags)


def normalize_date(value: str | None) -> str | None:
    if value is None:
        return None
    candidate = clean_text(value)
    if candidate is None:
        return None
    candidate = candidate.replace("/", "-")
    if "T" in candidate:
        candidate = candidate.split("T", 1)[0]
    match = re.search(r"(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?", candidate)
    if not match:
        return None
    year = match.group(1)
    month = match.group(2)
    day = match.group(3)
    if month and day:
        return f"{year}-{int(month):02d}-{int(day):02d}"
    if month:
        return f"{year}-{int(month):02d}"
    return year


def normalize_date_parts(parts: Any) -> str | None:
    if not isinstance(parts, dict):
        return None
    date_parts = parts.get("date-parts")
    if not isinstance(date_parts, list) or not date_parts:
        return None
    first = date_parts[0]
    if not isinstance(first, list) or not first:
        return None
    year = str(first[0])
    if len(first) >= 3:
        return f"{year}-{int(first[1]):02d}-{int(first[2]):02d}"
    if len(first) == 2:
        return f"{year}-{int(first[1]):02d}"
    return year


def normalize_url(url: str) -> str:
    candidate = url.strip()
    if not candidate:
        raise PaperIngestError("The issue is missing a paper URL.")
    parsed = urlparse(candidate)
    if not parsed.scheme or not parsed.netloc:
        raise PaperIngestError("Paper URL must be a full https:// link.")
    filtered_query = [
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if key.lower() not in TRACKING_QUERY_PARAMS
    ]
    path = parsed.path or "/"
    if path != "/" and path.endswith("/"):
        path = path[:-1]
    normalized = parsed._replace(
        scheme=parsed.scheme.lower(),
        netloc=parsed.netloc.lower(),
        path=path,
        query="&".join(f"{key}={value}" if value else key for key, value in filtered_query),
        fragment="",
    )
    return urlunparse(normalized)


def extract_doi(text: str | None) -> str | None:
    if text is None:
        return None
    decoded = unquote(text)
    match = DOI_PATTERN.search(decoded)
    if not match:
        return None
    doi = match.group(1).rstrip(").,;")
    return doi.lower()


def extract_arxiv_id(url: str | None) -> str | None:
    if url is None:
        return None
    match = ARXIV_PATTERN.search(url)
    if not match:
        return None
    return match.group(1).lower()


def canonical_arxiv_url(arxiv_id: str) -> str:
    return f"https://arxiv.org/abs/{arxiv_id}"


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_only).strip("-").lower()
    return slug or "paper"


def short_fingerprint(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:8]


def normalize_tags(raw_tags: list[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for tag in raw_tags:
        cleaned = squash_whitespace(tag)
        if cleaned is None:
            continue
        lowered = cleaned.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalized.append(lowered)
    return normalized


def split_tags(raw: str) -> list[str]:
    return normalize_tags(re.split(r"[,|\n]", raw))


def parse_issue_form(body: str) -> IssueSubmission:
    sections: dict[str, list[str]] = {}
    current_section: str | None = None
    for line in body.splitlines():
        heading = re.match(r"^###\s+(.+?)\s*$", line)
        if heading:
            current_section = heading.group(1).strip().lower()
            sections[current_section] = []
            continue
        if current_section is not None:
            sections[current_section].append(line)

    def section_text(name: str) -> str | None:
        raw_value = "\n".join(sections.get(name.lower(), [])).strip()
        if not raw_value or raw_value == NO_RESPONSE:
            return None
        return raw_value

    paper_url = section_text("paper url")
    if paper_url is None:
        raise PaperIngestError("The issue form did not include a paper URL.")
    return IssueSubmission(
        paper_url=paper_url,
        title_override=section_text("title override"),
        tags=split_tags(section_text("tags") or ""),
        notes=section_text("notes"),
    )


def parse_issue_event(event: dict[str, Any]) -> tuple[IssueSubmission, dict[str, Any]]:
    issue = event.get("issue")
    if not isinstance(issue, dict):
        raise PaperIngestError("This GitHub event does not include an issue payload.")
    body = issue.get("body")
    if not isinstance(body, str):
        raise PaperIngestError("The issue body is empty.")
    return parse_issue_form(body), issue


def fetch_text(url: str, accept: str = "text/html,application/xhtml+xml", timeout: int = 20) -> tuple[str, str]:
    request = Request(url, headers={"Accept": accept, "User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=timeout) as response:
            content_type = response.headers.get_content_type()
            if content_type == "application/pdf":
                raise PaperIngestError(
                    "The submitted URL resolved directly to a PDF. Use a landing page, DOI, or fill in Title override."
                )
            charset = response.headers.get_content_charset() or "utf-8"
            return response.read().decode(charset, errors="replace"), response.geturl()
    except HTTPError as error:
        raise PaperIngestError(f"Fetching paper metadata failed with HTTP {error.code}.") from error
    except URLError as error:
        raise PaperIngestError(f"Fetching paper metadata failed: {error.reason}.") from error


def fetch_json(url: str, accept: str = "application/json", timeout: int = 20) -> tuple[dict[str, Any], str]:
    request = Request(url, headers={"Accept": accept, "User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=timeout) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            payload = json.loads(response.read().decode(charset))
            return payload, response.geturl()
    except HTTPError as error:
        raise PaperIngestError(f"Metadata lookup failed with HTTP {error.code}.") from error
    except URLError as error:
        raise PaperIngestError(f"Metadata lookup failed: {error.reason}.") from error


def first_value(*values: str | None) -> str | None:
    for value in values:
        cleaned = squash_whitespace(value)
        if cleaned:
            return cleaned
    return None


def first_meta(meta: dict[str, list[str]], *keys: str) -> str | None:
    for key in keys:
        values = meta.get(key.lower())
        if not values:
            continue
        for value in values:
            cleaned = clean_text(value)
            if cleaned:
                return cleaned
    return None


def list_meta(meta: dict[str, list[str]], *keys: str) -> list[str]:
    values: list[str] = []
    for key in keys:
        for value in meta.get(key.lower(), []):
            cleaned = clean_text(value)
            if cleaned:
                values.append(cleaned)
    return normalize_tags(values) if any(key.lower() == "keywords" for key in keys) else dedupe_preserve_order(values)


def dedupe_preserve_order(values: list[Any]) -> list[Any]:
    seen: set[Any] = set()
    deduped: list[Any] = []
    for value in values:
        marker = json.dumps(value, sort_keys=True) if isinstance(value, (dict, list)) else value
        if marker in seen:
            continue
        seen.add(marker)
        deduped.append(value)
    return deduped


def metadata_from_csl(payload: dict[str, Any], source_url: str, doi_hint: str | None = None) -> Metadata:
    authors: list[str] = []
    for author in payload.get("author", []):
        if not isinstance(author, dict):
            continue
        literal = clean_text(author.get("literal"))
        if literal:
            authors.append(literal)
            continue
        name = first_value(
            " ".join(
                part
                for part in [clean_text(author.get("given")), clean_text(author.get("family"))]
                if part
            )
        )
        if name:
            authors.append(name)
    title_value = payload.get("title")
    if isinstance(title_value, list):
        title = first_value(*(clean_text(item) for item in title_value if isinstance(item, str)))
    else:
        title = clean_text(title_value if isinstance(title_value, str) else None)
    container = payload.get("container-title")
    if isinstance(container, list):
        venue = first_value(*(clean_text(item) for item in container if isinstance(item, str)))
    else:
        venue = clean_text(container if isinstance(container, str) else None)
    doi = extract_doi(payload.get("DOI")) or doi_hint
    return Metadata(
        title=title,
        authors=authors,
        venue=venue,
        published_date=normalize_date_parts(payload.get("issued")) or normalize_date_parts(payload.get("published")),
        doi=doi,
        abstract=clean_text(payload.get("abstract") if isinstance(payload.get("abstract"), str) else None),
        source_url=source_url,
        canonical_url=normalize_url(payload["URL"]) if isinstance(payload.get("URL"), str) else source_url,
    )


def resolve_doi_metadata(doi: str, source_url: str, fetch_json_func: FetchJson = fetch_json) -> Metadata:
    payload, _ = fetch_json_func(
        f"https://doi.org/{quote(doi, safe='/')}",
        "application/vnd.citationstyles.csl+json",
        20,
    )
    return metadata_from_csl(payload, source_url=source_url, doi_hint=doi)


def resolve_html_metadata(url: str, source_url: str, fetch_text_func: FetchText = fetch_text) -> Metadata:
    html, final_url = fetch_text_func(url, "text/html,application/xhtml+xml", 20)
    parser = HtmlMetadataParser()
    parser.feed(html)
    parser.close()
    title = first_meta(parser.meta, "citation_title", "og:title", "twitter:title") or parser.title
    authors = list_meta(parser.meta, "citation_author", "dc.creator", "author")
    venue = first_meta(
        parser.meta,
        "citation_journal_title",
        "citation_conference_title",
        "citation_technical_report_institution",
        "og:site_name",
    )
    published_date = normalize_date(
        first_meta(
            parser.meta,
            "citation_publication_date",
            "citation_online_date",
            "dc.date",
            "article:published_time",
        )
    )
    doi = extract_doi(first_meta(parser.meta, "citation_doi", "dc.identifier", "dc.identifier.doi"))
    abstract = first_meta(
        parser.meta,
        "citation_abstract",
        "description",
        "og:description",
        "twitter:description",
    )
    canonical_url = parser.canonical_url or final_url
    return Metadata(
        title=title,
        authors=authors,
        venue=venue,
        published_date=published_date,
        doi=doi,
        abstract=abstract,
        source_url=source_url,
        canonical_url=normalize_url(canonical_url),
    )


def resolve_metadata(
    paper_url: str,
    fetch_text_func: FetchText = fetch_text,
    fetch_json_func: FetchJson = fetch_json,
) -> Metadata:
    normalized_source_url = normalize_url(paper_url)
    arxiv_id = extract_arxiv_id(normalized_source_url)
    lookup_url = canonical_arxiv_url(arxiv_id) if arxiv_id else normalized_source_url
    doi = extract_doi(normalized_source_url)

    doi_metadata = Metadata(source_url=normalized_source_url, canonical_url=lookup_url, arxiv_id=arxiv_id)
    if doi:
        doi_metadata = resolve_doi_metadata(doi, normalized_source_url, fetch_json_func=fetch_json_func)
        doi_metadata.arxiv_id = arxiv_id

    html_metadata = Metadata(source_url=normalized_source_url, canonical_url=lookup_url, arxiv_id=arxiv_id)
    should_fetch_html = arxiv_id is not None or not doi or not doi_metadata.title or not doi_metadata.abstract
    if should_fetch_html:
        try:
            html_metadata = resolve_html_metadata(lookup_url, normalized_source_url, fetch_text_func=fetch_text_func)
            html_metadata.arxiv_id = arxiv_id
            if not doi:
                html_doi = extract_doi(html_metadata.doi) or extract_doi(html_metadata.canonical_url)
                if html_doi:
                    doi = html_doi
                    doi_metadata = resolve_doi_metadata(html_doi, normalized_source_url, fetch_json_func=fetch_json_func)
                    doi_metadata.arxiv_id = arxiv_id
        except PaperIngestError:
            if not doi_metadata.title:
                raise

    metadata = Metadata(
        title=first_value(doi_metadata.title, html_metadata.title),
        authors=doi_metadata.authors or html_metadata.authors,
        venue=first_value(doi_metadata.venue, html_metadata.venue),
        published_date=first_value(doi_metadata.published_date, html_metadata.published_date),
        doi=extract_doi(doi_metadata.doi) or extract_doi(html_metadata.doi) or doi,
        arxiv_id=arxiv_id,
        abstract=first_value(html_metadata.abstract, doi_metadata.abstract),
        source_url=normalized_source_url,
        canonical_url=first_value(html_metadata.canonical_url, doi_metadata.canonical_url, lookup_url),
    )
    if not metadata.title:
        raise PaperIngestError(
            "I couldn't extract a paper title from that URL. Use a landing page, DOI URL, or fill in Title override."
        )
    return metadata


def load_records(data_dir: Path) -> list[tuple[Path, dict[str, Any]]]:
    papers_dir = data_dir / "papers"
    papers_dir.mkdir(parents=True, exist_ok=True)
    records: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(papers_dir.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            records.append((path, json.load(handle)))
    return records


def record_identity_keys(record: dict[str, Any]) -> set[str]:
    keys: set[str] = set()
    doi = extract_doi(record.get("doi"))
    if doi:
        keys.add(f"doi:{doi}")
    arxiv_id = extract_arxiv_id(record.get("canonical_url")) or record.get("arxiv_id")
    if isinstance(arxiv_id, str) and arxiv_id:
        keys.add(f"arxiv:{arxiv_id.lower()}")
    for url in [record.get("source_url"), record.get("canonical_url"), *(record.get("source_urls") or [])]:
        if isinstance(url, str) and url:
            keys.add(f"url:{normalize_url(url)}")
    return keys


def candidate_identity_keys(source_url: str, metadata: Metadata) -> set[str]:
    keys = {f"url:{normalize_url(source_url)}"}
    if metadata.canonical_url:
        keys.add(f"url:{normalize_url(metadata.canonical_url)}")
    if metadata.doi:
        keys.add(f"doi:{extract_doi(metadata.doi)}")
    if metadata.arxiv_id:
        keys.add(f"arxiv:{metadata.arxiv_id.lower()}")
    return {key for key in keys if not key.endswith("None")}


def make_unique_slug(
    title: str,
    published_date: str | None,
    identity_key: str,
    existing_slugs: set[str],
) -> str:
    base = slugify(title)
    year = published_date[:4] if published_date else None
    if year and not base.endswith(f"-{year}"):
        base = f"{base}-{year}"
    if base not in existing_slugs:
        return base
    candidate = f"{base}-{short_fingerprint(identity_key)}"
    if candidate not in existing_slugs:
        return candidate
    counter = 2
    while f"{candidate}-{counter}" in existing_slugs:
        counter += 1
    return f"{candidate}-{counter}"


def merge_notes(
    notes_history: list[dict[str, Any]],
    notes: str | None,
    issue_number: int | None,
    issue_url: str | None,
    timestamp: str,
) -> list[dict[str, Any]]:
    if not notes:
        return notes_history
    normalized_notes = notes.strip()
    for entry in notes_history:
        if entry.get("text") == normalized_notes and entry.get("issue_number") == issue_number:
            return notes_history
    updated = list(notes_history)
    updated.append(
        {
            "added_at": timestamp,
            "issue_number": issue_number,
            "issue_url": issue_url,
            "text": normalized_notes,
        }
    )
    return updated


def write_record(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def make_commit_subject(action: str, title: str, issue_number: int | None) -> str:
    verb = "add" if action == "added" else "update"
    compact_title = re.sub(r"\s+", " ", title).strip()
    if len(compact_title) > 56:
        compact_title = f"{compact_title[:53].rstrip()}..."
    issue_suffix = f" (#{issue_number})" if issue_number else ""
    return f"chore(papers): {verb} {compact_title}{issue_suffix}"


def write_github_output(path: Path, outputs: dict[str, str | None]) -> None:
    lines: list[str] = []
    for key, value in outputs.items():
        rendered = "" if value is None else str(value)
        if "\n" in rendered:
            marker = f"EOF_{key}"
            lines.append(f"{key}<<{marker}\n{rendered}\n{marker}")
        else:
            lines.append(f"{key}={rendered}")
    with path.open("a", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
        handle.write("\n")


def upsert_record(
    data_dir: Path,
    submission: IssueSubmission,
    metadata: Metadata,
    issue: dict[str, Any],
) -> IngestResult:
    records = load_records(data_dir)
    timestamp = utc_now()
    issue_number = issue.get("number") if isinstance(issue.get("number"), int) else None
    issue_url = issue.get("html_url") if isinstance(issue.get("html_url"), str) else None

    match: tuple[Path, dict[str, Any]] | None = None
    desired_keys = candidate_identity_keys(submission.paper_url, metadata)
    for record_path, record in records:
        if desired_keys & record_identity_keys(record):
            match = (record_path, record)
            break

    if match is None:
        title = submission.title_override or metadata.title
        if title is None:
            raise PaperIngestError("This paper still needs a title. Fill in Title override and resubmit the issue.")
        identity_key = metadata.doi or metadata.arxiv_id or metadata.canonical_url or submission.paper_url
        slug = make_unique_slug(
            title,
            metadata.published_date,
            identity_key,
            {record["slug"] for _, record in records if isinstance(record.get("slug"), str)},
        )
        record = {
            "slug": slug,
            "title": title,
            "source_url": normalize_url(submission.paper_url),
            "canonical_url": metadata.canonical_url or normalize_url(submission.paper_url),
            "source_urls": dedupe_preserve_order(
                [
                    normalize_url(submission.paper_url),
                    *( [metadata.canonical_url] if metadata.canonical_url else [] ),
                ]
            ),
            "authors": metadata.authors,
            "venue": metadata.venue,
            "published_date": metadata.published_date,
            "doi": metadata.doi,
            "arxiv_id": metadata.arxiv_id,
            "abstract": metadata.abstract,
            "tags": normalize_tags(submission.tags),
            "notes_history": merge_notes([], submission.notes, issue_number, issue_url, timestamp),
            "issue_numbers": [issue_number] if issue_number is not None else [],
            "issue_urls": [issue_url] if issue_url else [],
            "added_at": timestamp,
            "updated_at": timestamp,
        }
        record_path = data_dir / "papers" / f"{slug}.json"
        write_record(record_path, record)
        return IngestResult(
            status="added",
            paper_slug=slug,
            paper_title=record["title"],
            commit_subject=make_commit_subject("added", record["title"], issue_number),
        )

    record_path, existing_record = match
    updated_record = copy.deepcopy(existing_record)
    updated_record["title"] = submission.title_override or metadata.title or updated_record.get("title")
    updated_record["source_url"] = updated_record.get("source_url") or normalize_url(submission.paper_url)
    updated_record["canonical_url"] = metadata.canonical_url or updated_record.get("canonical_url")
    updated_record["source_urls"] = dedupe_preserve_order(
        [
            *(updated_record.get("source_urls") or []),
            normalize_url(submission.paper_url),
            *( [metadata.canonical_url] if metadata.canonical_url else [] ),
        ]
    )
    updated_record["authors"] = metadata.authors or updated_record.get("authors") or []
    updated_record["venue"] = metadata.venue or updated_record.get("venue")
    updated_record["published_date"] = metadata.published_date or updated_record.get("published_date")
    updated_record["doi"] = metadata.doi or updated_record.get("doi")
    updated_record["arxiv_id"] = metadata.arxiv_id or updated_record.get("arxiv_id")
    updated_record["abstract"] = metadata.abstract or updated_record.get("abstract")
    updated_record["tags"] = normalize_tags([*(updated_record.get("tags") or []), *submission.tags])
    updated_record["notes_history"] = merge_notes(
        updated_record.get("notes_history") or [],
        submission.notes,
        issue_number,
        issue_url,
        timestamp,
    )
    updated_record["issue_numbers"] = sorted(
        dedupe_preserve_order([*(updated_record.get("issue_numbers") or []), *( [issue_number] if issue_number is not None else [] )])
    )
    updated_record["issue_urls"] = dedupe_preserve_order(
        [*(updated_record.get("issue_urls") or []), *( [issue_url] if issue_url else [] )]
    )
    updated_record["updated_at"] = timestamp

    if json.dumps(updated_record, sort_keys=True) == json.dumps(existing_record, sort_keys=True):
        return IngestResult(
            status="unchanged",
            paper_slug=updated_record.get("slug"),
            paper_title=updated_record.get("title"),
        )

    write_record(record_path, updated_record)
    return IngestResult(
        status="updated",
        paper_slug=updated_record.get("slug"),
        paper_title=updated_record.get("title"),
        commit_subject=make_commit_subject("updated", updated_record["title"], issue_number),
    )


def ingest_issue_event(
    event: dict[str, Any],
    data_dir: Path,
    fetch_text_func: FetchText = fetch_text,
    fetch_json_func: FetchJson = fetch_json,
) -> IngestResult:
    submission, issue = parse_issue_event(event)
    try:
        metadata = resolve_metadata(
            submission.paper_url,
            fetch_text_func=fetch_text_func,
            fetch_json_func=fetch_json_func,
        )
    except PaperIngestError as error:
        if submission.title_override:
            metadata = Metadata(
                title=submission.title_override,
                source_url=normalize_url(submission.paper_url),
                canonical_url=normalize_url(submission.paper_url),
            )
        else:
            return IngestResult(status="failed", message=str(error))
    return upsert_record(data_dir, submission, metadata, issue)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest a paper from a GitHub issue event.")
    parser.add_argument("--event-path", required=True, help="Path to the GitHub event payload JSON file.")
    parser.add_argument("--data-dir", default="data", help="Directory containing paper JSON records.")
    parser.add_argument("--github-output", help="Optional path to the GitHub Actions output file.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    event_path = Path(args.event_path)
    with event_path.open(encoding="utf-8") as handle:
        event = json.load(handle)
    result = ingest_issue_event(event, Path(args.data_dir))

    if args.github_output:
        write_github_output(
            Path(args.github_output),
            {
                "status": result.status,
                "paper_slug": result.paper_slug,
                "paper_title": result.paper_title,
                "commit_subject": result.commit_subject,
                "message": result.message,
            },
        )

    if result.status == "failed":
        print(result.message)
        return 1

    print(f"{result.status}: {result.paper_title} ({result.paper_slug})")
    return 0

