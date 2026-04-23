from __future__ import annotations

import argparse
import calendar
import html
import json
from pathlib import Path
from typing import Any


SITE_TITLE = "Paper Trail"
STYLE_CSS = """
:root {
  color-scheme: light dark;
  --bg: #0b1020;
  --panel: rgba(15, 23, 42, 0.78);
  --panel-border: rgba(148, 163, 184, 0.18);
  --text: #e2e8f0;
  --muted: #94a3b8;
  --accent: #8b5cf6;
  --accent-soft: rgba(139, 92, 246, 0.18);
  --shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
  --max: 1100px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at top, rgba(76, 29, 149, 0.28), transparent 38%),
    linear-gradient(180deg, #020617 0%, #0f172a 100%);
  color: var(--text);
}

a {
  color: inherit;
}

.shell {
  width: min(calc(100% - 2rem), var(--max));
  margin: 0 auto;
  padding: 2.5rem 0 4rem;
}

.hero,
.panel,
.paper-card,
.paper-page__content {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 24px;
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.hero {
  padding: 2rem;
  margin-bottom: 1.5rem;
}

.hero__eyebrow,
.paper-card__eyebrow,
.meta-list dt,
.section-label,
.breadcrumb {
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
}

.hero h1,
.paper-page h1 {
  margin: 0.35rem 0 0.75rem;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 1.05;
}

.hero p,
.paper-page__dek,
.empty-state {
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.7;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.stat-pill,
.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.8rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: var(--muted);
  text-decoration: none;
}

.controls,
.paper-list {
  margin-top: 1.5rem;
}

.controls {
  padding: 1rem;
}

.search-input {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 0.95rem 1rem;
  background: rgba(15, 23, 42, 0.8);
  color: var(--text);
  font-size: 1rem;
}

.paper-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.paper-card {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  padding: 1.25rem;
}

.paper-card h2 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.3;
}

.paper-card p,
.meta-list dd,
.note-entry p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.button-row,
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  text-decoration: none;
  border: 1px solid rgba(148, 163, 184, 0.24);
  color: var(--text);
}

.button--primary {
  background: linear-gradient(135deg, var(--accent) 0%, #2563eb 100%);
  border-color: transparent;
}

.paper-page {
  display: grid;
  gap: 1.5rem;
}

.paper-page__content {
  padding: 2rem;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0 0;
}

.meta-list {
  margin: 0;
}

.meta-list dd {
  margin-top: 0.35rem;
  color: var(--text);
}

.section {
  margin-top: 1.75rem;
}

.section h2 {
  margin: 0.25rem 0 0.85rem;
  font-size: 1.2rem;
}

.note-list {
  display: grid;
  gap: 0.9rem;
}

.note-entry {
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.45);
}

.footer {
  margin-top: 2rem;
  text-align: center;
  color: var(--muted);
}

[hidden] {
  display: none !important;
}

@media (max-width: 720px) {
  .shell {
    width: min(calc(100% - 1rem), var(--max));
  }

  .hero,
  .paper-page__content {
    padding: 1.4rem;
  }
}
""".strip()
APP_JS = """
const searchInput = document.querySelector("[data-search-input]");
const cards = Array.from(document.querySelectorAll("[data-paper-card]"));
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


def load_papers(data_dir: Path) -> list[dict[str, Any]]:
    papers: list[dict[str, Any]] = []
    for path in sorted((data_dir / "papers").glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            papers.append(json.load(handle))
    papers.sort(key=lambda paper: ((paper.get("added_at") or ""), (paper.get("title") or "")), reverse=True)
    return papers


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


def relative_href(root_prefix: str, slug: str) -> str:
    return f"{root_prefix}papers/{slug}/"


def render_tags(tags: list[str]) -> str:
    if not tags:
        return ""
    return '<div class="tag-row">' + "".join(
        f'<span class="tag">{html.escape(tag)}</span>' for tag in tags
    ) + "</div>"


def card_search_text(paper: dict[str, Any]) -> str:
    parts = [
        paper.get("title") or "",
        " ".join(paper.get("authors") or []),
        paper.get("venue") or "",
        " ".join(paper.get("tags") or []),
        paper.get("doi") or "",
        paper.get("arxiv_id") or "",
    ]
    return " ".join(parts).lower()


def render_card(paper: dict[str, Any], root_prefix: str) -> str:
    title = html.escape(paper["title"])
    venue = html.escape(paper.get("venue") or "Paper")
    authors = html.escape(display_authors(paper.get("authors") or []))
    added_at = html.escape(format_date((paper.get("added_at") or "")[:10]) or (paper.get("added_at") or ""))
    source_url = html.escape(paper.get("canonical_url") or paper.get("source_url") or "#")
    href = html.escape(relative_href(root_prefix, paper["slug"]))
    tags = render_tags(paper.get("tags") or [])
    published = html.escape(format_date(paper.get("published_date")) or "Undated")
    search_text = html.escape(card_search_text(paper))
    return f"""
    <article class="paper-card" data-paper-card data-search="{search_text}">
      <p class="paper-card__eyebrow">{published} · {venue}</p>
      <h2><a href="{href}">{title}</a></h2>
      <p>{authors}</p>
      <p>Added {added_at}</p>
      {tags}
      <div class="button-row">
        <a class="button button--primary" href="{href}">Open page</a>
        <a class="button" href="{source_url}" target="_blank" rel="noreferrer">Source paper</a>
      </div>
    </article>
    """.strip()


def render_list_page(
    papers: list[dict[str, Any]],
    *,
    page_title: str,
    heading: str,
    description: str,
    root_prefix: str,
    home_href: str | None,
) -> str:
    cards = "\n".join(render_card(paper, root_prefix) for paper in papers)
    stats = [
        f'<span class="stat-pill">{len(papers)} papers tracked</span>',
    ]
    tagged = sum(1 for paper in papers if paper.get("tags"))
    if tagged:
        stats.append(f'<span class="stat-pill">{tagged} tagged</span>')
    hero_actions = (
        f'<p class="breadcrumb"><a href="{html.escape(home_href)}">Home</a></p>' if home_href else ""
    )
    empty_state = (
        '<p class="empty-state" data-empty-message hidden>No papers match the current search.</p>'
        if papers
        else '<p class="empty-state" data-empty-message>Add your first paper through the GitHub issue form to populate this library.</p>'
    )
    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{html.escape(page_title)}</title>
    <link rel="stylesheet" href="{html.escape(root_prefix)}assets/style.css">
    <script src="{html.escape(root_prefix)}assets/app.js" defer></script>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        {hero_actions}
        <p class="hero__eyebrow">GitHub Actions + GitHub Pages</p>
        <h1>{html.escape(heading)}</h1>
        <p>{html.escape(description)}</p>
        <div class="stats">{''.join(stats)}</div>
      </section>
      <section class="panel controls">
        <label class="section-label" for="search">Search papers</label>
        <input
          class="search-input"
          id="search"
          type="search"
          data-search-input
          placeholder="Filter by title, author, venue, DOI, arXiv, or tag"
        >
      </section>
      {empty_state}
      <section class="paper-list">
        {cards}
      </section>
      <p class="footer">Generated from repository data. Edit the issue form, not the HTML.</p>
    </main>
  </body>
</html>
"""


def render_meta_item(label: str, value: str | None) -> str:
    if not value:
        return ""
    return f"""
    <dl class="meta-list">
      <dt>{html.escape(label)}</dt>
      <dd>{html.escape(value)}</dd>
    </dl>
    """.strip()


def render_notes(notes: list[dict[str, Any]]) -> str:
    if not notes:
        return ""
    items = []
    for entry in notes:
        added = html.escape(format_date((entry.get("added_at") or "")[:10]) or (entry.get("added_at") or ""))
        issue_number = entry.get("issue_number")
        issue_label = f"Issue #{issue_number}" if issue_number is not None else "Issue submission"
        issue_url = entry.get("issue_url")
        issue_markup = (
            f'<a href="{html.escape(issue_url)}">{html.escape(issue_label)}</a>'
            if isinstance(issue_url, str) and issue_url
            else html.escape(issue_label)
        )
        items.append(
            f"""
            <article class="note-entry">
              <p class="section-label">{added} · {issue_markup}</p>
              <p>{html.escape(entry.get("text") or "")}</p>
            </article>
            """.strip()
        )
    return f"""
    <section class="section">
      <p class="section-label">Notes</p>
      <h2>Submission notes</h2>
      <div class="note-list">
        {''.join(items)}
      </div>
    </section>
    """


def render_paper_page(paper: dict[str, Any]) -> str:
    source_url = html.escape(paper.get("canonical_url") or paper.get("source_url") or "#")
    breadcrumb = '<p class="breadcrumb"><a href="../../">Home</a> / <a href="../">Papers</a></p>'
    abstract = ""
    if paper.get("abstract"):
        abstract = f"""
        <section class="section">
          <p class="section-label">Abstract</p>
          <h2>What this paper covers</h2>
          <p class="paper-page__dek">{html.escape(paper["abstract"])}</p>
        </section>
        """
    notes = render_notes(paper.get("notes_history") or [])
    meta_items = "".join(
        [
            render_meta_item("Authors", display_authors(paper.get("authors") or [])),
            render_meta_item("Venue", paper.get("venue")),
            render_meta_item("Published", format_date(paper.get("published_date"))),
            render_meta_item("DOI", paper.get("doi")),
            render_meta_item("arXiv", paper.get("arxiv_id")),
            render_meta_item("Added", format_date((paper.get("added_at") or "")[:10])),
            render_meta_item("Updated", format_date((paper.get("updated_at") or "")[:10])),
        ]
    )
    tags = render_tags(paper.get("tags") or [])
    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{html.escape(paper["title"])} · {SITE_TITLE}</title>
    <link rel="stylesheet" href="../../assets/style.css">
  </head>
  <body>
    <main class="shell paper-page">
      <section class="paper-page__content">
        {breadcrumb}
        <p class="section-label">Paper page</p>
        <h1>{html.escape(paper["title"])}</h1>
        <p class="paper-page__dek">Stable page for one paper in the Paper Trail library.</p>
        <div class="button-row">
          <a class="button button--primary" href="{source_url}" target="_blank" rel="noreferrer">Open source paper</a>
          <a class="button" href="../../">Back to library</a>
        </div>
        {tags}
        <div class="meta-grid">
          {meta_items}
        </div>
        {abstract}
        {notes}
      </section>
    </main>
  </body>
</html>
"""


def build_site(data_dir: Path, site_dir: Path) -> None:
    papers = load_papers(data_dir)
    site_dir.mkdir(parents=True, exist_ok=True)
    (site_dir / "assets").mkdir(parents=True, exist_ok=True)
    (site_dir / "papers").mkdir(parents=True, exist_ok=True)

    (site_dir / ".nojekyll").write_text("", encoding="utf-8")
    (site_dir / "assets" / "style.css").write_text(STYLE_CSS + "\n", encoding="utf-8")
    (site_dir / "assets" / "app.js").write_text(APP_JS + "\n", encoding="utf-8")
    (site_dir / "papers.json").write_text(json.dumps(papers, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    (site_dir / "index.html").write_text(
        render_list_page(
            papers,
            page_title=SITE_TITLE,
            heading="A visual library of papers",
            description="Every paper is tracked in git, published on Pages, and searchable from one lightweight static site.",
            root_prefix="",
            home_href=None,
        ),
        encoding="utf-8",
    )
    (site_dir / "papers" / "index.html").write_text(
        render_list_page(
            papers,
            page_title=f"Papers · {SITE_TITLE}",
            heading="All tracked papers",
            description="Browse paper pages by title, tag, venue, DOI, or arXiv identifier.",
            root_prefix="../",
            home_href="../",
        ),
        encoding="utf-8",
    )

    for paper in papers:
        paper_dir = site_dir / "papers" / paper["slug"]
        paper_dir.mkdir(parents=True, exist_ok=True)
        (paper_dir / "index.html").write_text(render_paper_page(paper), encoding="utf-8")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the Paper Trail static site.")
    parser.add_argument("--data-dir", default="data", help="Directory containing paper JSON records.")
    parser.add_argument("--site-dir", default="site", help="Directory to write the generated site into.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    build_site(Path(args.data_dir), Path(args.site_dir))
    print(f"built site -> {args.site_dir}")
    return 0

