from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import UTC, datetime
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, quote, unquote, urlparse, urlunparse
from urllib.request import Request, urlopen

from pypdf import PdfReader

from paper_trail.ai import DEFAULT_AGENT, DEFAULT_MODEL, DEFAULT_REASONING_EFFORT


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
FetchBytes = Callable[[str, str, int], tuple[bytes, str, str] | None]
GenerateTopicContentFunc = Callable[[dict[str, Any]], dict[str, Any]]


class PaperIngestError(RuntimeError):
    """Raised when a topic paper submission cannot be ingested."""


@dataclass(slots=True)
class IssueSubmission:
    topic_title: str | None
    topic_summary: str | None
    explainer_steps: list[str]
    paper_urls: list[str]
    title_override: str | None
    delta_summary: str | None
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
    pdf_url: str | None = None


@dataclass(slots=True)
class PlannedPaper:
    slug: str
    title: str
    record_path: Path
    metadata: Metadata
    existing_record: dict[str, Any] | None = None
    text_excerpt: str | None = None
    text_source: str = "abstract-only"


@dataclass(slots=True)
class PaperOutcome:
    status: str
    slug: str
    title: str
    record: dict[str, Any]


@dataclass(slots=True)
class IngestResult:
    status: str
    paper_slug: str | None = None
    paper_title: str | None = None
    topic_slug: str | None = None
    topic_title: str | None = None
    papers_count: int = 0
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
                self.meta.setdefault(key.strip().lower(), []).append(content.strip())
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
    return match.group(1).rstrip(").,;").lower()


def extract_arxiv_id(url: str | None) -> str | None:
    if url is None:
        return None
    match = ARXIV_PATTERN.search(url)
    if not match:
        return None
    return match.group(1).lower()


def canonical_arxiv_url(arxiv_id: str) -> str:
    return f"https://arxiv.org/abs/{arxiv_id}"


def canonical_arxiv_pdf_url(arxiv_id: str) -> str:
    return f"https://arxiv.org/pdf/{arxiv_id}.pdf"


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_only).strip("-").lower()
    return slug or "topic"


def short_fingerprint(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:8]


def split_tag_tokens(raw: str, *, lowercase: bool) -> list[str]:
    seen: set[str] = set()
    values: list[str] = []
    for token in re.split(r"[,|\n]", raw):
        cleaned = squash_whitespace(token)
        if cleaned is None:
            continue
        marker = cleaned.lower()
        if marker in seen:
            continue
        seen.add(marker)
        values.append(marker if lowercase else cleaned)
    return values


def normalize_tags(raw_tags: list[str]) -> list[str]:
    return split_tag_tokens("\n".join(raw_tags), lowercase=True)


def split_tags(raw: str) -> list[str]:
    return split_tag_tokens(raw, lowercase=True)


def parse_steps(raw: str | None) -> list[str]:
    if raw is None:
        return []
    steps: list[str] = []
    seen: set[str] = set()
    for line in raw.splitlines():
        cleaned = squash_whitespace(re.sub(r"^(?:[-*]|\d+[.)])\s*", "", line))
        if cleaned is None:
            continue
        marker = cleaned.lower()
        if marker in seen:
            continue
        seen.add(marker)
        steps.append(cleaned)
    return steps


def parse_url_list(raw: str) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    for piece in re.split(r"[\n,]+", raw):
        cleaned = squash_whitespace(re.sub(r"^(?:[-*]|\d+[.)])\s*", "", piece))
        if cleaned is None:
            continue
        normalized = normalize_url(cleaned)
        if normalized in seen:
            continue
        seen.add(normalized)
        urls.append(normalized)
    return urls


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


def normalize_string_list(value: Any, *, max_items: int | None = None) -> list[str]:
    if not isinstance(value, list):
        return []
    normalized: list[str] = []
    seen: set[str] = set()
    for item in value:
        if not isinstance(item, str):
            continue
        cleaned = squash_whitespace(item)
        if cleaned is None:
            continue
        marker = cleaned.lower()
        if marker in seen:
            continue
        seen.add(marker)
        normalized.append(cleaned)
        if max_items is not None and len(normalized) >= max_items:
            break
    return normalized


def normalize_explainer_steps(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    steps: list[dict[str, str]] = []
    for index, item in enumerate(value, start=1):
        if isinstance(item, dict):
            title = squash_whitespace(item.get("title")) if isinstance(item.get("title"), str) else None
            body = squash_whitespace(item.get("body")) if isinstance(item.get("body"), str) else None
        elif isinstance(item, str):
            if ":" in item:
                raw_title, raw_body = item.split(":", 1)
                title = squash_whitespace(raw_title)
                body = squash_whitespace(raw_body)
            else:
                title = f"Step {index}"
                body = squash_whitespace(item)
        else:
            continue
        if title and body:
            steps.append({"title": title, "body": body})
    return steps


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

    def section_text(*names: str) -> str | None:
        for name in names:
            raw_value = "\n".join(sections.get(name.lower(), [])).strip()
            if raw_value and raw_value != NO_RESPONSE:
                return raw_value
        return None

    raw_urls = section_text("paper urls", "paper url")
    if raw_urls is None:
        raise PaperIngestError("The issue form did not include a paper URL.")

    return IssueSubmission(
        topic_title=squash_whitespace(section_text("topic")),
        topic_summary=section_text("topic framing", "topic summary", "topic overview"),
        explainer_steps=parse_steps(section_text("explainer steps", "must-cover steps")),
        paper_urls=parse_url_list(raw_urls),
        title_override=section_text("title override"),
        delta_summary=section_text("what to focus on", "what this paper adds", "what changed", "delta"),
        tags=split_tags(section_text("tags") or ""),
        notes=section_text("notes", "optional notes"),
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


def fetch_bytes(url: str, accept: str = "application/pdf", timeout: int = 40) -> tuple[bytes, str, str] | None:
    request = Request(url, headers={"Accept": accept, "User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.read(), response.geturl(), response.headers.get_content_type()
    except (HTTPError, URLError):
        return None


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
    return dedupe_preserve_order(values)


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
    pdf_url = first_meta(parser.meta, "citation_pdf_url")
    canonical_url = parser.canonical_url or final_url
    return Metadata(
        title=title,
        authors=authors,
        venue=venue,
        published_date=published_date,
        doi=doi,
        arxiv_id=extract_arxiv_id(canonical_url),
        abstract=abstract,
        source_url=source_url,
        canonical_url=normalize_url(canonical_url),
        pdf_url=normalize_url(pdf_url) if pdf_url else None,
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

    pdf_url = first_value(
        html_metadata.pdf_url,
        canonical_arxiv_pdf_url(arxiv_id) if arxiv_id else None,
        normalized_source_url if normalized_source_url.endswith(".pdf") else None,
    )
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
        pdf_url=pdf_url,
    )
    if not metadata.title:
        raise PaperIngestError(
            "I couldn't extract a paper title from that URL. Use a landing page, DOI URL, or fill in Title override."
        )
    return metadata


def choose_pdf_url(metadata: Metadata) -> str | None:
    return first_value(
        metadata.pdf_url,
        metadata.source_url if isinstance(metadata.source_url, str) and metadata.source_url.endswith(".pdf") else None,
        metadata.canonical_url if isinstance(metadata.canonical_url, str) and metadata.canonical_url.endswith(".pdf") else None,
        canonical_arxiv_pdf_url(metadata.arxiv_id) if metadata.arxiv_id else None,
    )


def extract_pdf_excerpt(
    metadata: Metadata,
    fetch_bytes_func: FetchBytes = fetch_bytes,
    *,
    max_pages: int = 8,
    max_chars: int = 12000,
) -> tuple[str | None, str]:
    pdf_url = choose_pdf_url(metadata)
    if pdf_url is None:
        return None, "abstract-only"
    payload = fetch_bytes_func(pdf_url, "application/pdf", 60)
    if payload is None:
        return None, "abstract-only"
    pdf_bytes, _, _ = payload
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        snippets: list[str] = []
        for page in reader.pages[:max_pages]:
            page_text = squash_whitespace(page.extract_text() or "")
            if page_text:
                snippets.append(page_text)
        if not snippets:
            return None, "abstract-only"
        joined = "\n\n".join(snippets)
        return joined[:max_chars], "pdf-excerpt"
    except Exception:
        return None, "abstract-only"


def load_records(directory: Path) -> list[tuple[Path, dict[str, Any]]]:
    directory.mkdir(parents=True, exist_ok=True)
    records: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(directory.glob("*.json")):
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


def merge_structured_entry(
    entries: list[dict[str, Any]],
    new_entry: dict[str, Any],
    key_fields: list[str],
) -> list[dict[str, Any]]:
    updated: list[dict[str, Any]] = []
    replaced = False
    target = tuple(new_entry.get(field) for field in key_fields)
    for entry in entries:
        marker = tuple(entry.get(field) for field in key_fields)
        if marker == target:
            updated.append({**entry, **new_entry})
            replaced = True
        else:
            updated.append(entry)
    if not replaced:
        updated.append(new_entry)
    return updated


def write_record(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def update_cache(records: list[tuple[Path, dict[str, Any]]], path: Path, record: dict[str, Any]) -> None:
    for index, (existing_path, _) in enumerate(records):
        if existing_path == path:
            records[index] = (path, record)
            return
    records.append((path, record))


def default_topic_summary(topic_title: str) -> str:
    return f"This topic page tracks how new papers change the story around {topic_title}."


def default_delta_summary(topic_title: str, paper_title: str) -> str:
    return f"{paper_title} adds a new piece of evidence to the evolving {topic_title} story."


def default_update_headline(topic_title: str, papers: list[PlannedPaper]) -> str:
    if not papers:
        return f"{topic_title} is waiting for its first paper-backed update."
    return f"{papers[0].title} is the newest evidence shaping {topic_title}."


def default_explainer_steps(topic_title: str, topic_summary: str | None, headline: str) -> list[dict[str, str]]:
    return [
        {
            "title": "What this topic is really about",
            "body": topic_summary or default_topic_summary(topic_title),
        },
        {
            "title": "What changed with the latest paper",
            "body": headline,
        },
        {
            "title": "How to use this page",
            "body": f"Use the update log and supporting papers to see how evidence around {topic_title} is shifting over time.",
        },
    ]


def default_key_takeaways(topic_title: str, papers: list[PlannedPaper], delta_hint: str | None) -> list[str]:
    takeaways = [
        f"{topic_title} is being tracked as an evolving evidence trail rather than a one-off paper note.",
        delta_hint or default_update_headline(topic_title, papers),
        "The topic page preserves dated deltas so new papers can be compared against the previous story.",
    ]
    return normalize_string_list(takeaways, max_items=3)


def default_open_questions(topic_title: str) -> list[str]:
    return [
        f"What parts of {topic_title} are still weakly supported by the current paper set?",
        f"What new evidence would most change the current {topic_title} explainer?",
    ]


def fallback_key_points(metadata: Metadata) -> list[str]:
    points: list[str] = []
    if metadata.abstract:
        sentences = re.split(r"(?<=[.!?])\s+", metadata.abstract)
        points.extend(sentence.strip() for sentence in sentences[:2] if sentence.strip())
    if metadata.venue:
        points.append(f"Published via {metadata.venue}.")
    return normalize_string_list(points, max_items=3)


def default_paper_summary(metadata: Metadata) -> str:
    if metadata.abstract:
        sentences = re.split(r"(?<=[.!?])\s+", metadata.abstract)
        summary = " ".join(sentence.strip() for sentence in sentences[:2] if sentence.strip())
        if summary:
            return summary
    title = metadata.title or "This paper"
    return f"{title} has been ingested. Copilot should replace this placeholder with a grounded paper summary."


def normalize_topic_title(submission: IssueSubmission) -> str:
    if submission.topic_title:
        return submission.topic_title
    raise PaperIngestError("Topic is required. Fill in the Topic field or put the topic as the first tag.")


def plan_paper_record(
    papers_dir: Path,
    records: list[tuple[Path, dict[str, Any]]],
    metadata: Metadata,
    title_override: str | None,
) -> PlannedPaper:
    if metadata.source_url is None:
        raise PaperIngestError("Paper metadata did not include a source URL.")
    desired_keys = candidate_identity_keys(metadata.source_url, metadata)
    match: tuple[Path, dict[str, Any]] | None = None
    for record_path, record in records:
        if desired_keys & record_identity_keys(record):
            match = (record_path, record)
            break

    title = title_override or metadata.title or (match[1].get("title") if match else None)
    if title is None:
        raise PaperIngestError("This paper still needs a title. Fill in Title override and resubmit the issue.")

    if match is not None:
        record_path, existing_record = match
        return PlannedPaper(
            slug=existing_record["slug"],
            title=title,
            record_path=record_path,
            metadata=metadata,
            existing_record=existing_record,
        )

    identity_key = metadata.doi or metadata.arxiv_id or metadata.canonical_url or metadata.source_url or title
    slug = make_unique_slug(
        title,
        metadata.published_date,
        identity_key,
        {record["slug"] for _, record in records if isinstance(record.get("slug"), str)},
    )
    return PlannedPaper(
        slug=slug,
        title=title,
        record_path=papers_dir / f"{slug}.json",
        metadata=metadata,
    )


def build_generation_context(
    topic_title: str,
    topic_slug: str,
    submission: IssueSubmission,
    existing_topic: dict[str, Any] | None,
    existing_papers: list[dict[str, Any]],
    planned_papers: list[PlannedPaper],
) -> dict[str, Any]:
    return {
        "task": "Update the topic explainer and submitted paper summaries for this repository.",
        "topic": {
            "title": topic_title,
            "slug": topic_slug,
            "human_topic_framing": submission.topic_summary,
            "human_step_hints": submission.explainer_steps,
            "human_delta_hint": submission.delta_summary,
            "notes": submission.notes,
            "tags": submission.tags,
            "existing_topic_record": existing_topic or {},
        },
        "existing_papers": [
            {
                "slug": paper.get("slug"),
                "title": paper.get("title"),
                "paper_delta": paper.get("paper_delta"),
                "why_it_matters": paper.get("why_it_matters"),
                "key_points": paper.get("key_points"),
                "abstract": paper.get("abstract"),
                "published_date": paper.get("published_date"),
                "tags": paper.get("tags"),
            }
            for paper in existing_papers
        ],
        "new_papers": [
            {
                "slug": plan.slug,
                "title": plan.title,
                "authors": plan.metadata.authors,
                "venue": plan.metadata.venue,
                "published_date": plan.metadata.published_date,
                "doi": plan.metadata.doi,
                "arxiv_id": plan.metadata.arxiv_id,
                "abstract": plan.metadata.abstract,
                "canonical_url": plan.metadata.canonical_url,
                "paper_text_excerpt": plan.text_excerpt,
                "paper_text_source": plan.text_source,
                "human_delta_hint": submission.delta_summary,
            }
            for plan in planned_papers
        ],
    }


def normalize_generated_content(
    generated: dict[str, Any],
    *,
    topic_title: str,
    submission: IssueSubmission,
    existing_topic: dict[str, Any] | None,
    planned_papers: list[PlannedPaper],
) -> dict[str, Any]:
    paper_insights_raw = generated.get("paper_insights")
    paper_insights: dict[str, dict[str, Any]] = {}
    if isinstance(paper_insights_raw, list):
        for item in paper_insights_raw:
            if not isinstance(item, dict):
                continue
            paper_slug = item.get("paper_slug")
            if not isinstance(paper_slug, str):
                continue
            paper_insights[paper_slug] = item

    update_headline = (
        squash_whitespace(generated.get("update_headline") if isinstance(generated.get("update_headline"), str) else None)
        or submission.delta_summary
        or ((existing_topic or {}).get("update_headline"))
    )
    if update_headline is None:
        update_headline = default_update_headline(topic_title, planned_papers)

    explainer_steps = normalize_explainer_steps(generated.get("explainer_steps"))
    if not explainer_steps:
        explainer_steps = normalize_explainer_steps(submission.explainer_steps)
    if not explainer_steps:
        explainer_steps = normalize_explainer_steps((existing_topic or {}).get("explainer_steps"))
    if not explainer_steps:
        explainer_steps = default_explainer_steps(
            topic_title,
            submission.topic_summary or (existing_topic or {}).get("summary"),
            update_headline,
        )

    key_takeaways = normalize_string_list(generated.get("key_takeaways"), max_items=4)
    if not key_takeaways:
        key_takeaways = normalize_string_list((existing_topic or {}).get("key_takeaways"), max_items=4)
    if not key_takeaways:
        key_takeaways = default_key_takeaways(topic_title, planned_papers, submission.delta_summary)

    open_questions = normalize_string_list(generated.get("open_questions"), max_items=3)
    if not open_questions:
        open_questions = normalize_string_list((existing_topic or {}).get("open_questions"), max_items=3)
    if not open_questions:
        open_questions = default_open_questions(topic_title)

    topic_summary = squash_whitespace(
        generated.get("topic_summary") if isinstance(generated.get("topic_summary"), str) else None
    )
    if topic_summary is None:
        topic_summary = submission.topic_summary or (existing_topic or {}).get("summary") or default_topic_summary(topic_title)

    normalized_paper_insights: dict[str, dict[str, Any]] = {}
    for plan in planned_papers:
        raw = paper_insights.get(plan.slug, {})
        delta_summary = squash_whitespace(raw.get("delta_summary") if isinstance(raw.get("delta_summary"), str) else None)
        if delta_summary is None:
            delta_summary = submission.delta_summary or default_delta_summary(topic_title, plan.title)
        why_it_matters = squash_whitespace(raw.get("why_it_matters") if isinstance(raw.get("why_it_matters"), str) else None)
        if why_it_matters is None:
            why_it_matters = delta_summary
        key_points = normalize_string_list(raw.get("key_points"), max_items=4)
        if not key_points:
            key_points = fallback_key_points(plan.metadata)
        if not key_points:
            key_points = [delta_summary]
        normalized_paper_insights[plan.slug] = {
            "delta_summary": delta_summary,
            "why_it_matters": why_it_matters,
            "key_points": key_points,
        }

    return {
        "topic_summary": topic_summary,
        "update_headline": update_headline,
        "explainer_steps": explainer_steps,
        "key_takeaways": key_takeaways,
        "open_questions": open_questions,
        "paper_insights": normalized_paper_insights,
    }


def write_paper_record(
    records: list[tuple[Path, dict[str, Any]]],
    planned: PlannedPaper,
    submission: IssueSubmission,
    issue: dict[str, Any],
    timestamp: str,
) -> PaperOutcome:
    issue_number = issue.get("number") if isinstance(issue.get("number"), int) else None
    issue_url = issue.get("html_url") if isinstance(issue.get("html_url"), str) else None
    existing_record = planned.existing_record
    record = copy.deepcopy(existing_record) if existing_record is not None else {}
    record["slug"] = planned.slug
    record["title"] = planned.title
    record["source_url"] = planned.metadata.source_url
    record["canonical_url"] = planned.metadata.canonical_url or planned.metadata.source_url
    record["source_urls"] = dedupe_preserve_order(
        [
            value
            for value in [
                *(record.get("source_urls") or []),
                planned.metadata.source_url,
                planned.metadata.canonical_url,
                planned.metadata.pdf_url,
            ]
            if value
        ]
    )
    record["authors"] = planned.metadata.authors or record.get("authors") or []
    record["venue"] = planned.metadata.venue or record.get("venue")
    record["published_date"] = planned.metadata.published_date or record.get("published_date")
    record["doi"] = planned.metadata.doi or record.get("doi")
    record["arxiv_id"] = planned.metadata.arxiv_id or record.get("arxiv_id")
    record["abstract"] = planned.metadata.abstract or record.get("abstract")
    record["pdf_url"] = planned.metadata.pdf_url or record.get("pdf_url")
    existing_excerpt_source = record.get("source_excerpt_source")
    candidate_excerpt = planned.text_excerpt
    candidate_excerpt_source = planned.text_source
    if (
        candidate_excerpt
        and (
            record.get("source_excerpt") is None
            or candidate_excerpt_source == "pdf-excerpt"
            or existing_excerpt_source != "pdf-excerpt"
        )
    ):
        record["source_excerpt"] = candidate_excerpt
        record["source_excerpt_source"] = candidate_excerpt_source
    current_summary = first_value(
        record.get("paper_summary"),
        record.get("paper_delta"),
        record.get("why_it_matters"),
    )
    record["paper_summary"] = current_summary or default_paper_summary(planned.metadata)
    key_points = normalize_string_list(record.get("key_points"), max_items=4)
    if not key_points:
        key_points = fallback_key_points(planned.metadata)
    record["key_points"] = key_points
    record["primary_topic_slug"] = record.get("primary_topic_slug") or record.get("topic_slug")
    record["primary_topic_title"] = record.get("primary_topic_title") or record.get("topic_title")
    memberships = record.get("topic_memberships")
    if not isinstance(memberships, list):
        memberships = []
    if (
        not memberships
        and record.get("primary_topic_slug")
        and record.get("primary_topic_title")
    ):
        memberships = [
            {
                "topic_slug": record["primary_topic_slug"],
                "topic_title": record["primary_topic_title"],
                "relationship": "primary",
                "why_it_matters": first_value(record.get("why_it_matters"), record.get("paper_delta")),
            }
        ]
    record["topic_memberships"] = memberships
    topic_updates = record.get("topic_updates")
    record["topic_updates"] = topic_updates if isinstance(topic_updates, list) else []
    record["paper_delta"] = record.get("paper_delta") or record["paper_summary"]
    record["why_it_matters"] = record.get("why_it_matters") or record["paper_summary"]
    record["copilot_agent"] = DEFAULT_AGENT
    record["copilot_model"] = os.getenv("COPILOT_MODEL", DEFAULT_MODEL)
    record["copilot_reasoning_effort"] = os.getenv("COPILOT_REASONING_EFFORT", DEFAULT_REASONING_EFFORT)
    record["copilot_planned_at"] = timestamp
    record["notes_history"] = merge_notes(
        record.get("notes_history") or [],
        submission.notes,
        issue_number,
        issue_url,
        timestamp,
    )
    record["issue_numbers"] = sorted(
        dedupe_preserve_order([*(record.get("issue_numbers") or []), *([issue_number] if issue_number is not None else [])])
    )
    record["issue_urls"] = dedupe_preserve_order([*(record.get("issue_urls") or []), *([issue_url] if issue_url else [])])
    record["added_at"] = record.get("added_at") or timestamp
    record["updated_at"] = timestamp

    if existing_record is not None and json.dumps(record, sort_keys=True) == json.dumps(existing_record, sort_keys=True):
        return PaperOutcome(status="unchanged", slug=planned.slug, title=planned.title, record=record)

    write_record(planned.record_path, record)
    update_cache(records, planned.record_path, record)
    status = "added" if existing_record is None else "updated"
    return PaperOutcome(status=status, slug=planned.slug, title=planned.title, record=record)


def write_topic_record(
    topics_dir: Path,
    topic_records: list[tuple[Path, dict[str, Any]]],
    submission: IssueSubmission,
    topic_title: str,
    topic_slug: str,
    paper_outcomes: list[PaperOutcome],
    issue: dict[str, Any],
    timestamp: str,
    generated: dict[str, Any],
) -> str:
    issue_number = issue.get("number") if isinstance(issue.get("number"), int) else None
    issue_url = issue.get("html_url") if isinstance(issue.get("html_url"), str) else None
    match = next(
        ((record_path, record) for record_path, record in topic_records if record.get("slug") == topic_slug),
        None,
    )

    existing_topic = copy.deepcopy(match[1]) if match is not None else {}
    topic_record = existing_topic
    topic_record["slug"] = topic_slug
    topic_record["title"] = topic_title
    topic_record["summary"] = generated["topic_summary"]
    topic_record["update_headline"] = generated["update_headline"]
    topic_record["explainer_steps"] = generated["explainer_steps"]
    topic_record["key_takeaways"] = generated["key_takeaways"]
    topic_record["open_questions"] = generated["open_questions"]
    topic_record["tags"] = normalize_tags([*(topic_record.get("tags") or []), *submission.tags])
    topic_record["paper_slugs"] = dedupe_preserve_order(
        [*(topic_record.get("paper_slugs") or []), *[paper.slug for paper in paper_outcomes]]
    )
    topic_record["explainer_path"] = f"data/topics/{topic_slug}.explainer.html"
    topic_record["copilot_agent"] = DEFAULT_AGENT
    topic_record["copilot_model"] = os.getenv("COPILOT_MODEL", DEFAULT_MODEL)
    topic_record["copilot_reasoning_effort"] = os.getenv("COPILOT_REASONING_EFFORT", DEFAULT_REASONING_EFFORT)
    topic_record["copilot_planned_at"] = timestamp

    update_log = list(topic_record.get("update_log") or [])
    for paper in paper_outcomes:
        update_log = merge_structured_entry(
            update_log,
            {
                "added_at": timestamp,
                "issue_number": issue_number,
                "issue_url": issue_url,
                "paper_slug": paper.slug,
                "paper_title": paper.title,
                "summary": paper.record.get("paper_delta"),
                "why_it_matters": paper.record.get("why_it_matters"),
                "notes": submission.notes,
                "action": paper.status,
            },
            ["issue_number", "paper_slug"],
        )
    topic_record["update_log"] = update_log
    topic_record["issue_numbers"] = sorted(
        dedupe_preserve_order([*(topic_record.get("issue_numbers") or []), *([issue_number] if issue_number is not None else [])])
    )
    topic_record["issue_urls"] = dedupe_preserve_order(
        [*(topic_record.get("issue_urls") or []), *([issue_url] if issue_url else [])]
    )
    topic_record["added_at"] = topic_record.get("added_at") or timestamp
    topic_record["updated_at"] = timestamp

    topic_path = match[0] if match is not None else topics_dir / f"{topic_slug}.json"
    if match is not None and json.dumps(topic_record, sort_keys=True) == json.dumps(match[1], sort_keys=True):
        return "unchanged"

    write_record(topic_path, topic_record)
    update_cache(topic_records, topic_path, topic_record)
    return "added" if match is None else "updated"


def make_commit_subject(overall_status: str, papers: list[PaperOutcome], issue_number: int | None) -> str:
    verb = "add" if overall_status == "added" else "update"
    if len(papers) == 1:
        scope = papers[0].title
    else:
        scope = f"{len(papers)} papers"
    compact_scope = re.sub(r"\s+", " ", scope).strip()
    if len(compact_scope) > 72:
        compact_scope = f"{compact_scope[:69].rstrip()}..."
    issue_suffix = f" (#{issue_number})" if issue_number else ""
    return f"chore(papers): {verb} {compact_scope}{issue_suffix}"


def write_github_output(path: Path, outputs: dict[str, str | int | None]) -> None:
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


def ingest_issue_event(
    event: dict[str, Any],
    data_dir: Path,
    fetch_text_func: FetchText = fetch_text,
    fetch_json_func: FetchJson = fetch_json,
    fetch_bytes_func: FetchBytes = fetch_bytes,
    generate_topic_content_func: GenerateTopicContentFunc | None = None,
) -> IngestResult:
    submission, issue = parse_issue_event(event)
    if len(submission.paper_urls) > 1 and submission.title_override:
        return IngestResult(
            status="failed",
            message="Title override only works when a single paper URL is submitted.",
        )

    timestamp = utc_now()
    papers_dir = data_dir / "papers"
    paper_records = load_records(papers_dir)

    planned_papers: list[PlannedPaper] = []
    for index, paper_url in enumerate(submission.paper_urls):
        try:
            metadata = resolve_metadata(
                paper_url,
                fetch_text_func=fetch_text_func,
                fetch_json_func=fetch_json_func,
            )
        except PaperIngestError as error:
            if submission.title_override and index == 0 and len(submission.paper_urls) == 1:
                normalized_pdf_url = normalize_url(paper_url)
                metadata = Metadata(
                    title=submission.title_override,
                    source_url=normalized_pdf_url,
                    canonical_url=normalized_pdf_url,
                    pdf_url=normalized_pdf_url,
                )
            else:
                return IngestResult(status="failed", message=str(error))

        planned = plan_paper_record(
            papers_dir=papers_dir,
            records=paper_records,
            metadata=metadata,
            title_override=submission.title_override if len(submission.paper_urls) == 1 else None,
        )
        text_excerpt, text_source = extract_pdf_excerpt(planned.metadata, fetch_bytes_func=fetch_bytes_func)
        planned.text_excerpt = text_excerpt or planned.metadata.abstract
        planned.text_source = text_source if text_excerpt else "abstract-only"
        planned_papers.append(planned)

    paper_outcomes = [
        write_paper_record(
            records=paper_records,
            planned=plan,
            submission=submission,
            issue=issue,
            timestamp=timestamp,
        )
        for plan in planned_papers
    ]

    paper_statuses = {paper.status for paper in paper_outcomes}
    overall_status = "unchanged"
    if "added" in paper_statuses:
        overall_status = "added"
    elif "updated" in paper_statuses:
        overall_status = "updated"

    issue_number = issue.get("number") if isinstance(issue.get("number"), int) else None
    first_paper = paper_outcomes[0]
    return IngestResult(
        status=overall_status,
        paper_slug=first_paper.slug,
        paper_title=first_paper.title,
        papers_count=len(paper_outcomes),
        commit_subject=make_commit_subject(overall_status, paper_outcomes, issue_number),
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest a paper submission from a GitHub issue event.")
    parser.add_argument("--event-path", required=True, help="Path to the GitHub event payload JSON file.")
    parser.add_argument("--data-dir", default="data", help="Directory containing paper and topic JSON records.")
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
                "topic_slug": result.topic_slug,
                "topic_title": result.topic_title,
                "papers_count": result.papers_count,
                "commit_subject": result.commit_subject,
                "message": result.message,
            },
        )

    if result.status == "failed":
        print(result.message)
        return 1

    print(
        f"{result.status}: topic={result.topic_title} "
        f"papers={result.papers_count} first={result.paper_title} ({result.paper_slug})"
    )
    return 0
