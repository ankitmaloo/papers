from __future__ import annotations

import argparse
import calendar
import html
import json
import re
from pathlib import Path
from typing import Any


SITE_TITLE = "Paper Trail"
STYLE_CSS = """
:root {
  color-scheme: light dark;
  --bg: #050816;
  --panel: rgba(15, 23, 42, 0.78);
  --panel-strong: rgba(15, 23, 42, 0.92);
  --panel-border: rgba(148, 163, 184, 0.18);
  --text: #e2e8f0;
  --muted: #94a3b8;
  --accent: #8b5cf6;
  --accent-2: #38bdf8;
  --success: #34d399;
  --warning: #fbbf24;
  --shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
  --max: 1180px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at top, rgba(56, 189, 248, 0.14), transparent 32%),
    radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.16), transparent 28%),
    linear-gradient(180deg, #020617 0%, #0f172a 100%);
  color: var(--text);
}

a {
  color: inherit;
}

.shell {
  width: min(calc(100% - 2rem), var(--max));
  margin: 0 auto;
  padding: 2.2rem 0 4rem;
}

.hero,
.panel,
.topic-card,
.paper-card,
.step-card,
.timeline-entry {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 24px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.hero {
  padding: 2.2rem;
  margin-bottom: 1.4rem;
}

.hero__eyebrow,
.section-label,
.breadcrumb,
.timeline-entry__meta,
.meta-list dt {
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
}

.hero h1,
.topic-page h1,
.paper-page h1 {
  margin: 0.4rem 0 0.8rem;
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1.05;
}

.hero p,
.lead,
.empty-state,
.supporting-copy,
.timeline-entry p,
.paper-card p,
.topic-card p,
.step-card p,
.meta-list dd {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

.stats,
.button-row,
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.stats {
  margin-top: 1.2rem;
}

.pill,
.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.52rem 0.85rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: var(--muted);
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  text-decoration: none;
  color: var(--text);
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.button--primary {
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent) 0%, #2563eb 100%);
}

.controls {
  margin-top: 1.3rem;
  padding: 1rem;
}

.search-input {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 0.95rem 1rem;
  background: rgba(15, 23, 42, 0.85);
  color: var(--text);
  font-size: 1rem;
}

.section {
  margin-top: 1.35rem;
}

.section h2 {
  margin: 0.35rem 0 0.75rem;
  font-size: 1.35rem;
}

.grid {
  display: grid;
  gap: 1rem;
}

.topic-grid,
.paper-grid,
.step-grid {
  display: grid;
  gap: 1rem;
}

.topic-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.paper-grid,
.step-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.topic-card,
.paper-card,
.step-card,
.timeline-entry {
  padding: 1.2rem;
}

.topic-card h2,
.paper-card h3,
.step-card h3 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.3;
}

.topic-card__meta,
.paper-card__meta {
  color: var(--muted);
  font-size: 0.92rem;
}

.bullet-list {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--muted);
}

.bullet-list li + li {
  margin-top: 0.45rem;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.topic-page,
.paper-page {
  display: grid;
  gap: 1.15rem;
}

.hero-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1.4fr 1fr;
  align-items: start;
}

.hero-side {
  padding: 1.2rem;
  background: rgba(15, 23, 42, 0.48);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 20px;
}

.highlight {
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.12), rgba(15, 23, 42, 0.36));
}

.timeline {
  display: grid;
  gap: 0.8rem;
}

.timeline-entry__title {
  margin: 0.3rem 0 0.4rem;
  font-size: 1.05rem;
  line-height: 1.4;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.meta-list {
  margin: 0;
}

.meta-list dd {
  margin-top: 0.35rem;
  color: var(--text);
}

.footer {
  margin-top: 1.8rem;
  text-align: center;
  color: var(--muted);
}

.topic-explainer {
  display: grid;
  gap: 1rem;
}

.topic-explainer section,
.topic-explainer article,
.topic-explainer aside,
.topic-explainer .topic-explainer__panel {
  background: rgba(15, 23, 42, 0.56);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 22px;
  padding: 1.15rem;
  box-shadow: var(--shadow);
}

.topic-explainer svg {
  width: 100%;
  height: auto;
  display: block;
}

.diagram-drift {
  animation: diagram-drift 8s ease-in-out infinite;
  transform-origin: center;
}

.diagram-pulse {
  animation: diagram-pulse 3s ease-in-out infinite;
  transform-origin: center;
}

.diagram-draw {
  animation: diagram-draw 2.8s ease-in-out infinite;
}

@keyframes diagram-drift {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes diagram-pulse {
  0%, 100% { opacity: 0.82; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.02); }
}

@keyframes diagram-draw {
  0% { stroke-dashoffset: 120; }
  50% { stroke-dashoffset: 20; }
  100% { stroke-dashoffset: 0; }
}

.empty-state {
  padding: 1.3rem 0.2rem 0;
}

[hidden] {
  display: none !important;
}

@media (max-width: 860px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .shell {
    width: min(calc(100% - 1rem), var(--max));
  }

  .hero {
    padding: 1.4rem;
  }
}
""".strip()
APP_JS = """
const searchInput = document.querySelector("[data-search-input]");
const cards = Array.from(document.querySelectorAll("[data-search-card]"));
const emptyMessage = document.querySelector("[data-empty-message]");

if (searchInput) {
  const applyFilter = () => {
    const query = searchInput.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const haystack = card.dataset.search || "";
      const matches = !query || haystack.includes(query);
      card.hidden = !matches;
      if (matches) {
        visible += 1;
      }
    }
    if (emptyMessage) {
      emptyMessage.hidden = visible !== 0;
    }
  };

  searchInput.addEventListener("input", applyFilter);
  applyFilter();
}
""".strip()
STYLE_BLOCK_RE = re.compile(r"<style\b[^>]*>(.*?)</style>", re.IGNORECASE | re.DOTALL)


def load_json_records(directory: Path) -> list[dict[str, Any]]:
    if not directory.exists():
        return []
    records: list[dict[str, Any]] = []
    for path in sorted(directory.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            records.append(json.load(handle))
    return records


def load_papers(data_dir: Path) -> list[dict[str, Any]]:
    papers = load_json_records(data_dir / "papers")
    papers.sort(key=lambda paper: ((paper.get("updated_at") or ""), (paper.get("title") or "")), reverse=True)
    return papers


def load_topics(data_dir: Path) -> list[dict[str, Any]]:
    topics = load_json_records(data_dir / "topics")
    topics.sort(key=lambda topic: ((topic.get("updated_at") or ""), (topic.get("title") or "")), reverse=True)
    return topics


def load_topic_explainer(data_dir: Path, topic_slug: str) -> tuple[str | None, str]:
    explainer_path = data_dir / "topics" / f"{topic_slug}.explainer.html"
    if not explainer_path.exists():
        return None, ""
    raw = explainer_path.read_text(encoding="utf-8").strip()
    if not raw:
        return None, ""
    css = "\n\n".join(
        match.group(1).strip()
        for match in STYLE_BLOCK_RE.finditer(raw)
        if match.group(1).strip()
    )
    markup = STYLE_BLOCK_RE.sub("", raw).strip()
    return (markup or None), css


def format_date(value: str | None) -> str | None:
    if value is None:
        return None
    parts = value.split("-")
    if len(parts) == 3:
        year, month, day = parts
        return f"{calendar.month_name[int(month)]} {int(day)}, {year}"
    if len(parts) == 2:
        year, month = parts
        return f"{calendar.month_name[int(month)]} {year}"
    return value


def display_authors(authors: list[str]) -> str:
    if not authors:
        return "Authors unavailable"
    if len(authors) <= 4:
        return ", ".join(authors)
    return f"{', '.join(authors[:4])}, +{len(authors) - 4} more"


def excerpt(text: str | None, limit: int = 180) -> str | None:
    if not text:
        return None
    if len(text) <= limit:
        return text
    return f"{text[:limit - 3].rstrip()}..."


def render_tags(tags: list[str]) -> str:
    if not tags:
        return ""
    return '<div class="tag-row">' + "".join(
        f'<span class="tag">{html.escape(tag)}</span>' for tag in tags
    ) + "</div>"


def paper_primary_topic_slug(paper: dict[str, Any]) -> str | None:
    slug = paper.get("primary_topic_slug") or paper.get("topic_slug")
    return slug if isinstance(slug, str) and slug else None


def paper_primary_topic_title(paper: dict[str, Any]) -> str | None:
    title = paper.get("primary_topic_title") or paper.get("topic_title")
    return title if isinstance(title, str) and title else None


def paper_summary_text(paper: dict[str, Any]) -> str | None:
    for key in ("paper_summary", "paper_delta", "why_it_matters", "abstract"):
        value = paper.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def paper_topic_memberships(paper: dict[str, Any]) -> list[dict[str, str]]:
    memberships: list[dict[str, str]] = []
    seen: set[str] = set()

    def add_entry(
        slug: str | None,
        title: str | None,
        *,
        why_it_matters: str | None = None,
        relationship: str | None = None,
    ) -> None:
        if not slug or not title:
            return
        marker = slug.lower()
        if marker in seen:
            return
        seen.add(marker)
        entry: dict[str, str] = {
            "topic_slug": slug,
            "topic_title": title,
        }
        if why_it_matters:
            entry["why_it_matters"] = why_it_matters
        if relationship:
            entry["relationship"] = relationship
        memberships.append(entry)

    raw_memberships = paper.get("topic_memberships")
    if isinstance(raw_memberships, list):
        for item in raw_memberships:
            if not isinstance(item, dict):
                continue
            slug = item.get("topic_slug") or item.get("slug")
            title = item.get("topic_title") or item.get("title")
            why_it_matters = item.get("why_it_matters") or item.get("summary")
            relationship = item.get("relationship")
            add_entry(
                slug if isinstance(slug, str) else None,
                title if isinstance(title, str) else None,
                why_it_matters=why_it_matters if isinstance(why_it_matters, str) else None,
                relationship=relationship if isinstance(relationship, str) else None,
            )

    raw_updates = paper.get("topic_updates")
    if isinstance(raw_updates, list):
        for item in raw_updates:
            if not isinstance(item, dict):
                continue
            slug = item.get("topic_slug")
            title = item.get("topic_title")
            why_it_matters = item.get("why_it_matters") or item.get("summary")
            add_entry(
                slug if isinstance(slug, str) else None,
                title if isinstance(title, str) else None,
                why_it_matters=why_it_matters if isinstance(why_it_matters, str) else None,
            )

    add_entry(
        paper_primary_topic_slug(paper),
        paper_primary_topic_title(paper),
        why_it_matters=paper.get("why_it_matters") if isinstance(paper.get("why_it_matters"), str) else None,
        relationship="primary" if paper_primary_topic_slug(paper) else None,
    )
    return memberships


def papers_for_topic(topic: dict[str, Any], papers: list[dict[str, Any]], papers_by_slug: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    topic_slug = topic.get("slug")
    if not isinstance(topic_slug, str):
        return []

    collected: list[dict[str, Any]] = []
    seen: set[str] = set()
    for slug in topic.get("paper_slugs") or []:
        if not isinstance(slug, str) or slug not in papers_by_slug or slug in seen:
            continue
        seen.add(slug)
        collected.append(papers_by_slug[slug])
    if collected:
        return collected

    for paper in papers:
        paper_slug = paper.get("slug")
        if not isinstance(paper_slug, str) or paper_slug in seen:
            continue
        if any(entry.get("topic_slug") == topic_slug for entry in paper_topic_memberships(paper)):
            seen.add(paper_slug)
            collected.append(paper)
    return collected


def paper_topic_context(paper: dict[str, Any], topic_slug: str) -> dict[str, Any] | None:
    updates = paper.get("topic_updates")
    if isinstance(updates, list):
        for entry in sorted(updates, key=lambda item: item.get("added_at") or "", reverse=True):
            if isinstance(entry, dict) and entry.get("topic_slug") == topic_slug:
                return entry
    for entry in paper_topic_memberships(paper):
        if entry.get("topic_slug") == topic_slug:
            return entry
    return None


def topic_search_text(topic: dict[str, Any], topic_papers: list[dict[str, Any]]) -> str:
    parts = [
        topic.get("title") or "",
        topic.get("summary") or "",
        topic.get("update_headline") or "",
        " ".join(topic.get("tags") or []),
        " ".join(topic.get("key_takeaways") or []),
        " ".join(topic.get("open_questions") or []),
        " ".join(paper.get("title") or "" for paper in topic_papers),
        " ".join(paper_summary_text(paper) or "" for paper in topic_papers),
        " ".join(entry.get("summary") or "" for entry in topic.get("update_log") or []),
    ]
    return " ".join(parts).lower()


def paper_search_text(paper: dict[str, Any]) -> str:
    topic_titles = " ".join(entry.get("topic_title") or "" for entry in paper_topic_memberships(paper))
    parts = [
        paper.get("title") or "",
        topic_titles,
        " ".join(paper.get("authors") or []),
        " ".join(paper.get("tags") or []),
        paper_summary_text(paper) or "",
        " ".join(paper.get("key_points") or []),
        paper.get("doi") or "",
        paper.get("arxiv_id") or "",
    ]
    return " ".join(parts).lower()


def recent_updates(topics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    updates: list[dict[str, Any]] = []
    for topic in topics:
        for entry in topic.get("update_log") or []:
            updates.append({**entry, "topic_slug": topic.get("slug"), "topic_title": topic.get("title")})
    updates.sort(key=lambda entry: entry.get("added_at") or "", reverse=True)
    return updates


def derive_step_cards(topic: dict[str, Any], topic_papers: list[dict[str, Any]]) -> list[tuple[str, str]]:
    raw_steps = topic.get("explainer_steps") or []
    if raw_steps:
        derived: list[tuple[str, str]] = []
        for index, step in enumerate(raw_steps, start=1):
            if isinstance(step, dict):
                title = step.get("title")
                body = step.get("body")
                if isinstance(title, str) and isinstance(body, str):
                    derived.append((title.strip(), body.strip()))
            elif isinstance(step, str):
                if ":" in step:
                    title, body = step.split(":", 1)
                    derived.append((title.strip(), body.strip()))
                else:
                    derived.append((f"Step {index}", step))
        return derived

    latest_update = next(iter(topic.get("update_log") or []), {})
    evidence_titles = ", ".join((paper.get("title") or "Untitled paper") for paper in topic_papers[:3])
    if len(topic_papers) > 3:
        evidence_titles += f", +{len(topic_papers) - 3} more"
    return [
        ("Topic frame", topic.get("summary") or "This explainer follows how new papers change the topic."),
        (
            "Evidence trail",
            f"{len(topic_papers)} papers currently support this topic. Start with {evidence_titles or 'the current papers'} to see the evidence stack.",
        ),
        (
            "Newest delta",
            latest_update.get("summary")
            or "The newest paper addition will show up here once the topic starts accumulating updates.",
        ),
    ]


def render_meta_item(label: str, value: str | None) -> str:
    if not value:
        return ""
    return f"""
    <dl class="meta-list">
      <dt>{html.escape(label)}</dt>
      <dd>{html.escape(value)}</dd>
    </dl>
    """.strip()


def render_list_panel(label: str, title: str, items: list[str]) -> str:
    if not items:
        return ""
    bullets = "".join(f"<li>{html.escape(item)}</li>" for item in items)
    return f"""
    <article class="step-card">
      <p class="section-label">{html.escape(label)}</p>
      <h3>{html.escape(title)}</h3>
      <ul class="bullet-list">
        {bullets}
      </ul>
    </article>
    """.strip()


def render_topic_card(topic: dict[str, Any], topic_papers: list[dict[str, Any]]) -> str:
    summary = html.escape(excerpt(topic.get("summary"), 220) or "A topic explainer that is still gathering evidence.")
    latest_update = next(iter(topic.get("update_log") or []), {})
    latest_text = html.escape(
        excerpt(topic.get("update_headline") or latest_update.get("summary"), 110) or "No paper delta logged yet."
    )
    latest_date = format_date((latest_update.get("added_at") or "")[:10]) or "No updates yet"
    search_text = html.escape(topic_search_text(topic, topic_papers))
    return f"""
    <article class="topic-card" data-search-card data-search="{search_text}">
      <p class="section-label">{html.escape(latest_date)} · {len(topic_papers)} papers</p>
      <h2><a href="topics/{html.escape(topic['slug'])}/">{html.escape(topic['title'])}</a></h2>
      <p>{summary}</p>
      <p class="topic-card__meta">Latest delta: {latest_text}</p>
      {render_tags(topic.get("tags") or [])}
      <div class="button-row">
        <a class="button button--primary" href="topics/{html.escape(topic['slug'])}/">Open explainer</a>
        <a class="button" href="papers/">Browse papers</a>
      </div>
    </article>
    """.strip()


def render_recent_updates(updates: list[dict[str, Any]], root_prefix: str) -> str:
    if not updates:
        return ""
    entries = []
    for entry in updates[:8]:
        topic_href = f"{root_prefix}topics/{entry.get('topic_slug')}/"
        paper_href = f"{root_prefix}papers/{entry.get('paper_slug')}/"
        added_at = html.escape(format_date((entry.get("added_at") or "")[:10]) or (entry.get("added_at") or ""))
        issue_url = entry.get("issue_url")
        issue_markup = (
            f' · <a href="{html.escape(issue_url)}">Issue #{entry.get("issue_number")}</a>'
            if issue_url and entry.get("issue_number") is not None
            else ""
        )
        entries.append(
            f"""
            <article class="timeline-entry">
              <p class="timeline-entry__meta">{added_at}{issue_markup}</p>
              <p class="timeline-entry__title">
                <a href="{html.escape(topic_href)}">{html.escape(entry.get("topic_title") or "Topic")}</a>
                ←
                <a href="{html.escape(paper_href)}">{html.escape(entry.get("paper_title") or "Paper")}</a>
              </p>
              <p>{html.escape(entry.get("summary") or "No change summary recorded.")}</p>
            </article>
            """.strip()
        )
    return f"""
    <section class="section">
      <p class="section-label">Recent deltas</p>
      <h2>How the story is changing</h2>
      <div class="timeline">
        {''.join(entries)}
      </div>
    </section>
    """


def render_home_page(topics: list[dict[str, Any]], papers: list[dict[str, Any]]) -> str:
    papers_by_slug = {paper["slug"]: paper for paper in papers if isinstance(paper.get("slug"), str)}
    papers_by_topic = {
        topic.get("slug"): papers_for_topic(topic, papers, papers_by_slug)
        for topic in topics
    }
    topic_cards = "\n".join(render_topic_card(topic, papers_by_topic.get(topic.get("slug"), [])) for topic in topics)
    updates_markup = render_recent_updates(recent_updates(topics), "")
    empty_state = (
        '<p class="empty-state" data-empty-message hidden>No topic explainers match the current search.</p>'
        if topics
        else '<p class="empty-state" data-empty-message>Create your first paper issue and Copilot will decide whether it should update or create a topic page.</p>'
    )
    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{SITE_TITLE}</title>
    <link rel="stylesheet" href="assets/style.css">
    <script src="assets/app.js" defer></script>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <p class="hero__eyebrow">Paper-first topic explainers</p>
        <h1>Track a topic, not just a stack of papers</h1>
        <p class="lead">Submit a paper, let Copilot decide whether it materially changes a topic, and keep each strong-fit topic page as a living explainer.</p>
        <div class="stats">
          <span class="pill">{len(topics)} topics</span>
          <span class="pill">{len(papers)} papers</span>
          <span class="pill">{len(recent_updates(topics))} logged deltas</span>
        </div>
      </section>
      <section class="panel controls">
        <label class="section-label" for="search">Search topics</label>
        <input
          id="search"
          class="search-input"
          type="search"
          data-search-input
          placeholder="Filter by topic, tag, paper title, or update summary"
        >
      </section>
      {empty_state}
      <section class="topic-grid">
        {topic_cards}
      </section>
      {updates_markup}
      <p class="footer">Generated from repository data. Add papers through the issue form to update the explainer pages.</p>
    </main>
  </body>
</html>
"""


def render_topic_paper_card(paper: dict[str, Any], topic_slug: str) -> str:
    context = paper_topic_context(paper, topic_slug) or {}
    summary = html.escape(
        excerpt(
            context.get("why_it_matters") or context.get("summary") or paper_summary_text(paper),
            170,
        )
        or "No delta summary recorded."
    )
    abstract = excerpt(paper.get("abstract"), 150)
    abstract_markup = f"<p>{html.escape(abstract)}</p>" if abstract else ""
    key_points_markup = ""
    key_points = paper.get("key_points") or []
    if key_points:
        key_points_markup = '<ul class="bullet-list">' + "".join(
            f"<li>{html.escape(point)}</li>" for point in key_points
        ) + "</ul>"
    published = html.escape(format_date(paper.get("published_date")) or "Undated")
    authors = html.escape(display_authors(paper.get("authors") or []))
    paper_href = f"../../papers/{html.escape(paper['slug'])}/"
    source_url = html.escape(paper.get("canonical_url") or paper.get("source_url") or "#")
    return f"""
    <article class="paper-card">
      <p class="paper-card__meta">{published} · {authors}</p>
      <h3><a href="{paper_href}">{html.escape(paper['title'])}</a></h3>
      <p>{summary}</p>
      {abstract_markup}
      {key_points_markup}
      {render_tags(paper.get("tags") or [])}
      <div class="button-row">
        <a class="button button--primary" href="{paper_href}">Open paper context</a>
        <a class="button" href="{source_url}" target="_blank" rel="noreferrer">Source paper</a>
      </div>
    </article>
    """.strip()


def render_topic_page(
    topic: dict[str, Any],
    topic_papers: list[dict[str, Any]],
    *,
    explainer_html: str | None = None,
    explainer_css: str = "",
) -> str:
    updates = sorted(topic.get("update_log") or [], key=lambda entry: entry.get("added_at") or "", reverse=True)
    latest_update = updates[0] if updates else {}
    step_cards = "\n".join(
        f"""
        <article class="step-card">
          <p class="section-label">Explainer step</p>
          <h3>{html.escape(title)}</h3>
          <p>{html.escape(body)}</p>
        </article>
        """.strip()
        for title, body in derive_step_cards(topic, topic_papers)
    )
    update_entries = []
    for entry in updates:
        added_at = html.escape(format_date((entry.get("added_at") or "")[:10]) or (entry.get("added_at") or ""))
        paper_href = f"../../papers/{entry.get('paper_slug')}/"
        issue_url = entry.get("issue_url")
        issue_markup = (
            f' · <a href="{html.escape(issue_url)}">Issue #{entry.get("issue_number")}</a>'
            if issue_url and entry.get("issue_number") is not None
            else ""
        )
        notes = entry.get("notes")
        notes_markup = f"<p>{html.escape(notes)}</p>" if notes else ""
        update_entries.append(
            f"""
            <article class="timeline-entry">
              <p class="timeline-entry__meta">{added_at}{issue_markup}</p>
              <p class="timeline-entry__title"><a href="{paper_href}">{html.escape(entry.get("paper_title") or "Paper")}</a></p>
              <p>{html.escape(entry.get("summary") or "No change summary recorded.")}</p>
              {notes_markup}
            </article>
            """.strip()
        )
    topic_slug = topic.get("slug") if isinstance(topic.get("slug"), str) else ""
    evidence_cards = "\n".join(render_topic_paper_card(paper, topic_slug) for paper in topic_papers)
    insight_panels = "\n".join(
        panel
        for panel in [
            render_list_panel("Key takeaways", "What the current evidence says", topic.get("key_takeaways") or []),
            render_list_panel("Open questions", "What still needs more evidence", topic.get("open_questions") or []),
        ]
        if panel
    )
    if explainer_html:
        explainer_markup = f"""
        <section class="section">
          <p class="section-label">Copilot explainer</p>
          <h2>Understand the topic visually</h2>
          {explainer_html}
        </section>
        """.strip()
    else:
        explainer_markup = f"""
        <section class="section">
          <p class="section-label">Step-by-step explainer</p>
          <h2>How to read this topic</h2>
          <div class="step-grid">
            {step_cards}
          </div>
        </section>
        <section class="section">
          <p class="section-label">AI synthesis</p>
          <h2>What matters most right now</h2>
          <div class="insight-grid">
            {insight_panels}
          </div>
        </section>
        """.strip()
    extra_css = f"<style>\n{explainer_css}\n</style>" if explainer_css else ""
    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{html.escape(topic['title'])} · {SITE_TITLE}</title>
    <link rel="stylesheet" href="../../assets/style.css">
    {extra_css}
  </head>
  <body>
    <main class="shell topic-page">
      <section class="hero">
        <p class="breadcrumb"><a href="../../">Home</a> / <a href="../">Topics</a></p>
        <div class="hero-grid">
          <div>
            <p class="hero__eyebrow">Topic explainer</p>
            <h1>{html.escape(topic['title'])}</h1>
            <p class="lead">{html.escape(topic.get('summary') or 'This topic page is still being shaped by new papers.')}</p>
            <div class="stats">
              <span class="pill">{len(topic_papers)} papers linked</span>
              <span class="pill">{len(updates)} deltas logged</span>
              <span class="pill">{html.escape(format_date((topic.get('updated_at') or '')[:10]) or 'No update date')}</span>
            </div>
            {render_tags(topic.get("tags") or [])}
          </div>
          <aside class="hero-side highlight">
            <p class="section-label">What changed with this addition</p>
            <h2>{html.escape(latest_update.get('paper_title') or 'Waiting for the next paper')}</h2>
            <p>{html.escape(topic.get('update_headline') or latest_update.get('summary') or 'New paper deltas will be highlighted here as the topic evolves.')}</p>
          </aside>
        </div>
      </section>
      {explainer_markup}
      <section class="section">
        <p class="section-label">Evidence map</p>
        <h2>Papers supporting the story</h2>
        <div class="paper-grid">
          {evidence_cards}
        </div>
      </section>
      <section class="section">
        <p class="section-label">Update log</p>
        <h2>What changed with each paper</h2>
        <div class="timeline">
          {''.join(update_entries)}
        </div>
      </section>
    </main>
  </body>
</html>
"""


def render_notes(notes: list[dict[str, Any]]) -> str:
    if not notes:
        return ""
    entries = []
    for entry in notes:
        added_at = html.escape(format_date((entry.get("added_at") or "")[:10]) or (entry.get("added_at") or ""))
        issue_url = entry.get("issue_url")
        issue_markup = (
            f' · <a href="{html.escape(issue_url)}">Issue #{entry.get("issue_number")}</a>'
            if issue_url and entry.get("issue_number") is not None
            else ""
        )
        entries.append(
            f"""
            <article class="timeline-entry">
              <p class="timeline-entry__meta">{added_at}{issue_markup}</p>
              <p>{html.escape(entry.get("text") or "")}</p>
            </article>
            """.strip()
        )
    return f"""
    <section class="section">
      <p class="section-label">Notes</p>
      <h2>Submission notes</h2>
      <div class="timeline">
        {''.join(entries)}
      </div>
    </section>
    """


def render_topic_history(entries: list[dict[str, Any]]) -> str:
    if not entries:
        return ""
    items = []
    for entry in sorted(entries, key=lambda item: item.get("added_at") or "", reverse=True):
        added_at = html.escape(format_date((entry.get("added_at") or "")[:10]) or (entry.get("added_at") or ""))
        why_it_matters = entry.get("why_it_matters")
        why_markup = f"<p>{html.escape(why_it_matters)}</p>" if why_it_matters else ""
        items.append(
            f"""
            <article class="timeline-entry">
              <p class="timeline-entry__meta">{added_at} · {html.escape(entry.get('topic_title') or 'Topic')}</p>
              <p>{html.escape(entry.get('summary') or 'No summary recorded.')}</p>
              {why_markup}
            </article>
            """.strip()
        )
    return f"""
    <section class="section">
      <p class="section-label">Topic fit</p>
      <h2>How this paper fits related topics</h2>
      <div class="timeline">
        {''.join(items)}
      </div>
    </section>
    """


def render_related_topics(entries: list[dict[str, str]]) -> str:
    if not entries:
        return ""
    cards = []
    for entry in entries:
        topic_slug = entry.get("topic_slug")
        topic_title = entry.get("topic_title")
        if not topic_slug or not topic_title:
            continue
        why_it_matters = entry.get("why_it_matters")
        why_markup = f"<p>{html.escape(why_it_matters)}</p>" if why_it_matters else ""
        relationship = entry.get("relationship")
        relationship_markup = (
            f'<p class="paper-card__meta">{html.escape(relationship)}</p>'
            if relationship
            else ""
        )
        cards.append(
            f"""
            <article class="paper-card">
              {relationship_markup}
              <h3><a href="../../topics/{html.escape(topic_slug)}/">{html.escape(topic_title)}</a></h3>
              {why_markup}
            </article>
            """.strip()
        )
    if not cards:
        return ""
    return f"""
    <section class="section">
      <p class="section-label">Topic fit</p>
      <h2>Related topics</h2>
      <div class="paper-grid">
        {''.join(cards)}
      </div>
    </section>
    """


def render_paper_page(paper: dict[str, Any], topic: dict[str, Any] | None) -> str:
    source_url = html.escape(paper.get("canonical_url") or paper.get("source_url") or "#")
    primary_topic_slug = paper_primary_topic_slug(paper)
    primary_topic_title = paper_primary_topic_title(paper)
    topic_href = f"../../topics/{primary_topic_slug}/" if primary_topic_slug else "../../topics/"
    topic_markup = (
        f'<a class="button button--primary" href="{html.escape(topic_href)}">Open topic explainer</a>'
        if topic
        else '<a class="button button--primary" href="../../topics/">Browse topics</a>'
    )
    meta_items = "".join(
        [
            render_meta_item("Primary topic", primary_topic_title),
            render_meta_item("Authors", display_authors(paper.get("authors") or [])),
            render_meta_item("Venue", paper.get("venue")),
            render_meta_item("Published", format_date(paper.get("published_date"))),
            render_meta_item("DOI", paper.get("doi")),
            render_meta_item("arXiv", paper.get("arxiv_id")),
        ]
    )
    abstract_markup = ""
    if paper.get("abstract"):
        abstract_markup = f"""
        <section class="section">
          <p class="section-label">Abstract</p>
          <h2>Paper details</h2>
          <p class="supporting-copy">{html.escape(paper['abstract'])}</p>
        </section>
        """
    synthesis_markup = ""
    if paper_summary_text(paper) or paper.get("key_points"):
        bullets = paper.get("key_points") or []
        bullet_markup = ""
        if bullets:
            bullet_markup = '<ul class="bullet-list">' + "".join(
                f"<li>{html.escape(point)}</li>" for point in bullets
            ) + "</ul>"
        synthesis_markup = f"""
        <section class="section">
          <p class="section-label">Paper summary</p>
          <h2>What this paper contributes</h2>
          <p class="supporting-copy">{html.escape(paper_summary_text(paper) or '')}</p>
          {bullet_markup}
        </section>
        """
    related_topics_markup = render_related_topics(paper_topic_memberships(paper))
    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{html.escape(paper['title'])} · {SITE_TITLE}</title>
    <link rel="stylesheet" href="../../assets/style.css">
  </head>
  <body>
    <main class="shell paper-page">
      <section class="hero">
        <p class="breadcrumb"><a href="../../">Home</a> / <a href="../">Papers</a></p>
        <p class="hero__eyebrow">Supporting paper</p>
        <h1>{html.escape(paper['title'])}</h1>
        <p class="lead">{html.escape(paper_summary_text(paper) or 'This paper is waiting for its Copilot-authored summary.')}</p>
        <div class="button-row">
          {topic_markup}
          <a class="button" href="{source_url}" target="_blank" rel="noreferrer">Open source paper</a>
        </div>
        {render_tags(paper.get("tags") or [])}
      </section>
      <section class="panel">
        <div class="meta-grid">
          {meta_items}
        </div>
      </section>
      {synthesis_markup}
      {related_topics_markup}
      {abstract_markup}
      {render_topic_history(paper.get("topic_updates") or [])}
      {render_notes(paper.get("notes_history") or [])}
    </main>
  </body>
</html>
"""


def render_papers_index(papers: list[dict[str, Any]]) -> str:
    cards = []
    for paper in papers:
        cards.append(
            f"""
            <article class="paper-card" data-search-card data-search="{html.escape(paper_search_text(paper))}">
              <p class="paper-card__meta">{html.escape(paper_primary_topic_title(paper) or 'Topic still being evaluated')}</p>
              <h3><a href="{html.escape(paper['slug'])}/">{html.escape(paper['title'])}</a></h3>
              <p>{html.escape(excerpt(paper_summary_text(paper), 170) or 'No paper summary recorded.')}</p>
              {render_tags(paper.get("tags") or [])}
            </article>
            """.strip()
        )
    empty_state = (
        '<p class="empty-state" data-empty-message hidden>No papers match the current search.</p>'
        if papers
        else '<p class="empty-state" data-empty-message>Add a paper to create the first source page and let Copilot evaluate the topic fit.</p>'
    )
    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Papers · {SITE_TITLE}</title>
    <link rel="stylesheet" href="../assets/style.css">
    <script src="../assets/app.js" defer></script>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <p class="breadcrumb"><a href="../">Home</a></p>
        <p class="hero__eyebrow">Supporting source pages</p>
        <h1>All papers</h1>
        <p class="lead">These pages keep the paper-level metadata and explain how each source fits into a broader topic story.</p>
      </section>
      <section class="panel controls">
        <label class="section-label" for="search">Search papers</label>
        <input id="search" class="search-input" type="search" data-search-input placeholder="Filter by paper, topic, tag, author, DOI, or delta">
      </section>
      {empty_state}
      <section class="paper-grid">
        {''.join(cards)}
      </section>
    </main>
  </body>
</html>
"""


def build_site(data_dir: Path, site_dir: Path) -> None:
    papers = load_papers(data_dir)
    topics = load_topics(data_dir)
    topics_by_slug = {topic["slug"]: topic for topic in topics if isinstance(topic.get("slug"), str)}
    papers_by_slug = {paper["slug"]: paper for paper in papers if isinstance(paper.get("slug"), str)}

    site_dir.mkdir(parents=True, exist_ok=True)
    (site_dir / "assets").mkdir(parents=True, exist_ok=True)
    (site_dir / "topics").mkdir(parents=True, exist_ok=True)
    (site_dir / "papers").mkdir(parents=True, exist_ok=True)

    (site_dir / ".nojekyll").write_text("", encoding="utf-8")
    (site_dir / "assets" / "style.css").write_text(STYLE_CSS + "\n", encoding="utf-8")
    (site_dir / "assets" / "app.js").write_text(APP_JS + "\n", encoding="utf-8")
    (site_dir / "topics.json").write_text(json.dumps(topics, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (site_dir / "papers.json").write_text(json.dumps(papers, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    (site_dir / "index.html").write_text(render_home_page(topics, papers), encoding="utf-8")
    (site_dir / "topics" / "index.html").write_text(render_home_page(topics, papers).replace('href="topics/', 'href="').replace('href="papers/', 'href="../papers/').replace('src="assets/', 'src="../assets/').replace('href="assets/', 'href="../assets/'), encoding="utf-8")
    (site_dir / "papers" / "index.html").write_text(render_papers_index(papers), encoding="utf-8")

    for topic in topics:
        topic_dir = site_dir / "topics" / topic["slug"]
        topic_dir.mkdir(parents=True, exist_ok=True)
        topic_papers = papers_for_topic(topic, papers, papers_by_slug)
        explainer_html, explainer_css = load_topic_explainer(data_dir, topic["slug"])
        (topic_dir / "index.html").write_text(
            render_topic_page(topic, topic_papers, explainer_html=explainer_html, explainer_css=explainer_css),
            encoding="utf-8",
        )

        # Copy extra files
        extra_dir = data_dir / "topics" / f"{topic['slug']}_files"
        if extra_dir.exists():
            import shutil
            shutil.copytree(extra_dir, topic_dir, dirs_exist_ok=True)

    for paper in papers:
        paper_dir = site_dir / "papers" / paper["slug"]
        paper_dir.mkdir(parents=True, exist_ok=True)
        topic = topics_by_slug.get(paper_primary_topic_slug(paper))
        (paper_dir / "index.html").write_text(render_paper_page(paper, topic), encoding="utf-8")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the Paper Trail static site.")
    parser.add_argument("--data-dir", default="data", help="Directory containing paper and topic JSON records.")
    parser.add_argument("--site-dir", default="site", help="Directory to write the generated site into.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    build_site(Path(args.data_dir), Path(args.site_dir))
    print(f"built site -> {args.site_dir}")
    return 0
