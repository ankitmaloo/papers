# Paper Trail

Paper Trail turns GitHub issues into a browsable paper library. Open an **Add paper** issue with a paper URL, and GitHub Actions will fetch metadata, store the paper in the repo, rebuild the site, and publish a GitHub Pages page for it.

## What this repo does

- accepts a paper URL through a GitHub Issue form
- stores each paper as structured JSON under `data/papers/`
- generates a visual static site under `site/`
- publishes the site on GitHub Pages
- keeps paper additions and updates in normal git history with descriptive commits

## Repository layout

- `src/paper_trail/` - ingestion and site-generation logic
- `scripts/` - CLI entrypoints used locally and in GitHub Actions
- `data/papers/` - one JSON file per paper
- `site/` - generated Pages output
- `.github/ISSUE_TEMPLATE/` - the issue form for new papers
- `.github/workflows/` - automation for ingesting papers, validating changes, and publishing Pages

## Setup

1. Create a new GitHub repository from this folder and push it to `main`.
2. In **Settings -> Actions -> General**, allow workflows to create and approve pull requests if your org policy requires it, and make sure the default `GITHUB_TOKEN` can write contents.
3. In **Settings -> Pages**, set the source to **GitHub Actions**.
4. Open the **Add paper** issue form, paste a paper URL, and submit it. No manual labeling is required.

The workflow will:

1. read the issue body
2. resolve paper metadata from the URL
3. write or update `data/papers/<slug>.json`
4. rebuild `site/`
5. commit the change with a message like `chore(papers): add Attention Is All You Need (#12)`
6. deploy the site and comment back with the paper URL

## Local commands

Create the local environment:

```bash
uv sync
```

Run the site generator:

```bash
uv run python scripts/build_site.py --data-dir data --site-dir site
```

Run the test suite:

```bash
uv run python -m unittest discover -s tests
```

Replay an issue event locally:

```bash
uv run python scripts/add_paper.py --event-path /path/to/github-event.json --data-dir data
```

## URL structure

- Home page: `https://<owner>.github.io/<repo>/`
- Paper page: `https://<owner>.github.io/<repo>/papers/<slug>/`

If the repository itself is named `<owner>.github.io`, Pages will publish at the root domain instead of the `/<repo>/` path segment.
