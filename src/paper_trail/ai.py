from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


DEFAULT_MODEL = "gpt-5.4"
DEFAULT_REASONING_EFFORT = "high"
DEFAULT_AGENT = "paper-curator"
ALLOWED_ANIMATION_CLASSES = ("diagram-drift", "diagram-pulse", "diagram-draw")


def _load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _squash_whitespace(value: str | None) -> str | None:
    if value is None:
        return None
    squashed = re.sub(r"\s+", " ", value).strip()
    return squashed or None


def _trim_excerpt(value: str | None, *, limit: int = 1400) -> str | None:
    squashed = _squash_whitespace(value)
    if squashed is None:
        return None
    if len(squashed) <= limit:
        return squashed
    return f"{squashed[:limit - 3].rstrip()}..."


def load_paper_prompt_context(data_dir: Path, paper_slug: str) -> tuple[dict[str, Any], list[dict[str, Any]], Path]:
    paper_path = data_dir / "papers" / f"{paper_slug}.json"
    if not paper_path.exists():
        raise RuntimeError(f"Paper record not found: {paper_path}")

    paper = _load_json(paper_path)
    topics_dir = data_dir / "topics"
    topics: list[dict[str, Any]] = []
    if topics_dir.exists():
        for path in sorted(topics_dir.glob("*.json")):
            topics.append(_load_json(path))
    topics.sort(key=lambda topic: ((topic.get("updated_at") or ""), (topic.get("title") or "")), reverse=True)
    return paper, topics, paper_path


def build_paper_curation_prompt(data_dir: Path, paper_slug: str, *, issue_number: int | None = None) -> str:
    paper, topics, _ = load_paper_prompt_context(data_dir, paper_slug)

    paper_path = f"data/papers/{paper_slug}.json"
    read_paths = [
        "AGENTS.md",
        paper_path,
        *(f"data/topics/{topic['slug']}.json" for topic in topics if isinstance(topic.get("slug"), str)),
    ]

    explainer_paths = [
        f"data/topics/{topic['slug']}.explainer.html"
        for topic in topics
        if isinstance(topic.get("slug"), str) and (data_dir / "topics" / f"{topic['slug']}.explainer.html").exists()
    ]
    if explainer_paths:
        read_paths.extend(explainer_paths)

    latest_notes = None
    notes_history = paper.get("notes_history")
    if isinstance(notes_history, list):
        matching = [
            entry.get("text")
            for entry in notes_history
            if isinstance(entry, dict)
            and isinstance(entry.get("text"), str)
            and (issue_number is None or entry.get("issue_number") == issue_number)
        ]
        if matching:
            latest_notes = matching[-1]

    paper_context = {
        "slug": paper.get("slug"),
        "title": paper.get("title"),
        "authors": paper.get("authors") or [],
        "venue": paper.get("venue"),
        "published_date": paper.get("published_date"),
        "doi": paper.get("doi"),
        "arxiv_id": paper.get("arxiv_id"),
        "source_url": paper.get("canonical_url") or paper.get("source_url"),
        "abstract": _trim_excerpt(paper.get("abstract")),
        "source_excerpt_source": paper.get("source_excerpt_source"),
        "source_excerpt": _trim_excerpt(paper.get("source_excerpt")),
        "existing_paper_summary": _trim_excerpt(paper.get("paper_summary") or paper.get("paper_delta")),
        "existing_key_points": paper.get("key_points") or [],
        "current_primary_topic_slug": paper.get("primary_topic_slug") or paper.get("topic_slug"),
        "current_primary_topic_title": paper.get("primary_topic_title") or paper.get("topic_title"),
        "issue_number": issue_number,
        "latest_issue_notes": latest_notes,
    }

    topic_catalog = [
        {
            "slug": topic.get("slug"),
            "title": topic.get("title"),
            "summary": topic.get("summary"),
            "update_headline": topic.get("update_headline"),
            "paper_count": len(topic.get("paper_slugs") or []),
            "recent_papers": (topic.get("paper_slugs") or [])[-4:],
        }
        for topic in topics
    ]

    files_to_read = "\n".join(f"- `{path}`" for path in read_paths)
    animation_classes = ", ".join(f"`{name}`" for name in ALLOWED_ANIMATION_CLASSES)

    return f"""You are GitHub Copilot curating a new paper submission for a topic-explainer repository.

Primary target:
- `{paper_path}`

You may also update or create:
- `data/topics/*.json`
- `data/topics/*.explainer.html`

Read these files before editing:
{files_to_read}

What you must accomplish:
1. Write a real paper summary for this submission.
2. Decide whether the paper materially belongs in any existing topics.
3. Update only the topics where the fit is strong enough that the paper genuinely changes or strengthens the page.
4. Create a new topic only if the paper is central enough to anchor a coherent standalone topic page.
5. Keep every touched topic page coherent after the update.

Decision policy:
- The bar for updating a topic is high.
- Do not attach the paper to weak, passing, or generic overlaps.
- Prefer zero or one primary topic.
- It is okay to update multiple related topics, but only when the fit is clearly strong.
- If no topic clears the bar, keep the work at the paper level and leave topics untouched.

Repository conventions to preserve:
- The paper record should keep metadata fields intact and maintain these curated fields:
  - `paper_summary`
  - `key_points`
  - `primary_topic_slug`
  - `primary_topic_title`
  - `topic_memberships`
  - `topic_updates`
- Each `topic_memberships` item should include:
  - `topic_slug`
  - `topic_title`
  - `relationship`
  - `why_it_matters`
- When you touch a topic JSON, keep these fields coherent:
  - `slug`
  - `title`
  - `summary`
  - `update_headline`
  - `paper_slugs`
  - `update_log`
  - `explainer_path`
- When you touch a topic, update or create the matching explainer fragment at `data/topics/<slug>.explainer.html`.
- Topic explainer fragments must be self-contained HTML fragments with inline SVG and CSS-only motion. No JavaScript, no external assets. Prefer {animation_classes}.

Topic-page quality bar:
- The topic page should read like one coherent explainer, not a bag of papers.
- The newest paper should visibly change the story on the page.
- A new topic is justified only when the paper is central enough that the topic page has a clear point of view, not just a loose label.

Paper context:
```json
{json.dumps(paper_context, indent=2, ensure_ascii=False)}
```

Existing topic catalog:
```json
{json.dumps(topic_catalog, indent=2, ensure_ascii=False)}
```

Writing guidance:
- Ground claims in the abstract, extracted text, and repository evidence.
- Do not invent results, benchmarks, or equations.
- Keep paper summaries concise but substantive.
- For each touched topic, make clear why this paper belongs there and what changed.
- If evidence is partial, say so directly.

Done condition:
- Save the updated paper record.
- Update only the topic files that genuinely clear the fit bar.
- Create a new topic only if the paper is central enough.
- Leave unrelated files untouched.
""".strip()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render the Copilot prompt used to curate a submitted paper.")
    parser.add_argument("--data-dir", default="data", help="Directory containing topic and paper records.")
    parser.add_argument("--paper-slug", required=True, help="Paper slug to build the prompt for.")
    parser.add_argument("--issue-number", type=int, help="Optional issue number to emphasize in the update prompt.")
    parser.add_argument("--output", help="Optional file to write the rendered prompt into.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    prompt = build_paper_curation_prompt(
        Path(args.data_dir),
        args.paper_slug,
        issue_number=args.issue_number,
    )
    if args.output:
        Path(args.output).write_text(prompt + "\n", encoding="utf-8")
    else:
        print(prompt)
    return 0
