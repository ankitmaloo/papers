# Repository Guide

## Purpose

This repository tracks papers from GitHub issue submissions and publishes a static GitHub Pages site.

## Layout

- `src/paper_trail/` contains the reusable Python logic.
- `scripts/` contains thin CLI wrappers for GitHub Actions and local runs.
- `data/papers/` contains source records that should stay human-readable and diff-friendly.
- `site/` contains generated output and should always be reproducible from `data/`.

## Working conventions

- Keep new behavior in `src/` and keep `scripts/` thin.
- Preserve stable paper slugs once created so URLs do not break.
- When changing the paper schema, update the site generator and tests in the same change.
- Regenerate `site/` whenever paper data or templates change.

## Validation

- `uv sync`
- `uv run python -m unittest discover -s tests`
- `uv run python scripts/build_site.py --data-dir data --site-dir site`
