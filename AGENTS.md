# Repository Guide

## Purpose

This repository tracks Copilot-authored paper summaries and topic explainers from GitHub issue submissions and publishes a static GitHub Pages site.

## Layout

- `src/paper_trail/` contains the reusable Python logic.
- `scripts/` contains thin CLI wrappers for GitHub Actions and local runs.
- `data/papers/` contains source records that should stay human-readable and diff-friendly.
- `data/topics/` contains the topic explainer records that Copilot updates only when the fit bar is high enough.
- `data/topics/*.explainer.html` contains the Copilot-authored explainer fragments that are embedded into topic pages.
- `site/` contains generated output and should always be reproducible from `data/`.

## Working conventions

- Keep new behavior in `src/` and keep `scripts/` thin.
- Preserve stable topic and paper slugs once created so URLs do not break.
- When changing the paper or topic schema, update the site generator and tests in the same change.
- Keep Copilot prompts and explainer fragments grounded in paper evidence; do not silently fall back to invented summaries.
- Paper submission is the entrypoint. Do not require a human to pre-name the topic unless the user explicitly asks for that behavior.
- Topic updates should clear a high relevance bar. Weak overlap should stay at the paper page and should not spawn topic churn.
- Treat `data/topics/*.explainer.html` as a generated artifact with repository value: it should stay readable in diffs, self-contained, and free of scripts or external assets.
- Regenerate `site/` whenever paper data or templates change.

## Validation

- `uv sync`
- `uv run python -m unittest discover -s tests`
- `uv run python scripts/build_site.py --data-dir data --site-dir site`

## Scope Discipline

- Do exactly the requested task, and no more.
- Before making changes, identify the smallest file set that can satisfy the request.
- If the user asks to inspect, compare, or “take a look,” do not implement changes unless explicitly asked.
- If the user names a target directory or file, treat that as the edit boundary. Do not modify source data, generators, package tooling, dependencies, lockfiles, or unrelated artifacts unless the user explicitly asks.
- Do not introduce new build tools, dependencies, generated pipelines, package managers, or runtime architecture changes without first explaining the need and getting approval.
- Prefer local, direct edits over broad refactors or “proper” system-wide rewrites.
- Do not run regeneration/build commands that overwrite many files unless the user asked for regenerated output or approved the blast radius.
- If a fix could be done either narrowly or architecturally, choose the narrow fix first.
- When uncertain about scope, stop and ask. Do not guess expansively.
- Try to do the task with minimal changes where possible. 

## Change Plan Requirement

Before editing files, provide a short plan with:
- the exact problem you believe you are solving,
- the exact files/directories you intend to touch,
- the files/directories you will not touch,
- whether any generated files, dependencies, or build commands are involved.

Wait for approval if the plan touches anything beyond the user’s named target.

## Blast Radius Rule

Any action that creates, deletes, or rewrites many files requires explicit approval first. This includes:
- dependency installs,
- package or lockfile changes,
- build-system changes,
- site-wide regeneration,
- bulk copying files between directories,
- modifying source artifacts when the user asked only about generated output.

## Recovery Rule

If you realize you exceeded scope:
- stop immediately,
- summarize exactly what changed,
- do not continue “fixing forward,”
- ask whether to revert your own changes.

# IMPORTANT
First start with why the user wants the change. who the change is for, what the user will do with it. Eg: some changes are for product for end users, some are to be deployed on a website, some changes would just be performance fixes, and so on 100 different reasons. If you understand, you can take better decisions. if not, ask. 

## Quality Gate For UI Explainers

The reference implementation sets the quality bar. New work must reach that bar in density, pacing, typography, animation, and visual clarity.

Before editing:
- read the reference implementation
- read the target page/files
- summarize the gap page by page
- define the visual idea for each figure
- list exact files to change
- wait for approval if the scope is broader than the named target

For every new or revised depth page:
- identify the paper-specific claims being explained
- turn those claims into a storyboard before writing HTML
- include enough technical detail for a serious reader
- use a topic-specific animated figure, chart, or walkthrough
- avoid generic cards, shallow summaries, and static filler diagrams

For every interactive figure:
- provide visible Auto-play
- make the figure useful if nobody clicks
- keep manual controls: step buttons, arrows, sliders, or scrubbers
- update captions as the animation changes
- verify the first loaded state looks intentional

For walkthroughs:
- use 5-8 meaningful steps
- include Auto-play, previous, next, and keyboard arrows
- show state changes inside the figure, not only text changes
- include a final ledger/comparison only when it helps the topic

Writing style:
- use plain technical prose
- write for high-bandwidth readers
- avoid generic explainer phrases
- avoid forced metaphors and cute analogies
- no “not X but Y” sentence pattern
- no meta commentary like “the caveat is” or “the trap is”
- explain with concrete claims, mechanisms, and evidence

Implementation discipline:
- static GitHub Pages only
- no Babel, framework, package, build, or dependency changes without approval
- keep edits inside the named target directory unless approved
- verify with browser load, console errors, and visual inspection

