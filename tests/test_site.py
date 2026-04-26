import json
import tempfile
import unittest
from pathlib import Path

from paper_trail.site import build_site


class SiteTests(unittest.TestCase):
    def test_build_site_renders_multi_topic_paper_context(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            data_dir = root / "data"
            papers_dir = data_dir / "papers"
            topics_dir = data_dir / "topics"
            papers_dir.mkdir(parents=True)
            topics_dir.mkdir(parents=True)

            primary_topic = {
                "slug": "looped-transformers",
                "title": "Looped Transformers",
                "summary": "Looped transformers reuse the same network across multiple passes and this topic tracks how new papers change that story.",
                "update_headline": "Depth Schedules adds the missing explanation for where loop depth stops paying off.",
                "paper_slugs": ["depth-schedules-for-looped-transformers-2026"],
                "update_log": [
                    {
                        "added_at": "2026-04-23T00:00:00Z",
                        "issue_number": 8,
                        "issue_url": "https://github.com/octo/papers/issues/8",
                        "paper_slug": "depth-schedules-for-looped-transformers-2026",
                        "paper_title": "Depth Schedules for Looped Transformers",
                        "summary": "Explains where loop depth changes the payoff curve.",
                        "why_it_matters": "It gives the topic a practical depth story.",
                    }
                ],
                "updated_at": "2026-04-23T00:00:00Z",
            }
            related_topic = {
                "slug": "iterative-reasoning",
                "title": "Iterative Reasoning",
                "summary": "Track architectures that trade repeated passes for stronger reasoning traces.",
                "update_headline": "Depth Schedules shows where repeated compute starts saturating.",
                "paper_slugs": ["depth-schedules-for-looped-transformers-2026"],
                "update_log": [
                    {
                        "added_at": "2026-04-23T00:00:00Z",
                        "issue_number": 8,
                        "issue_url": "https://github.com/octo/papers/issues/8",
                        "paper_slug": "depth-schedules-for-looped-transformers-2026",
                        "paper_title": "Depth Schedules for Looped Transformers",
                        "summary": "Shows how repeated passes stop paying off linearly.",
                        "why_it_matters": "It links loop depth to iterative-compute limits.",
                    }
                ],
                "updated_at": "2026-04-23T00:00:00Z",
            }
            paper = {
                "slug": "depth-schedules-for-looped-transformers-2026",
                "title": "Depth Schedules for Looped Transformers",
                "source_url": "https://example.com/looped-b",
                "canonical_url": "https://example.com/looped-b",
                "source_urls": ["https://example.com/looped-b"],
                "authors": ["Bea Example"],
                "venue": "arXiv",
                "published_date": "2026-04-12",
                "abstract": "A paper about loop depth schedules.",
                "paper_summary": "The paper explains where loop depth stops paying off and how that changes the topic story.",
                "key_points": [
                    "Loop depth stops paying off linearly.",
                    "The paper gives the topic a practical depth-selection story.",
                ],
                "primary_topic_slug": "looped-transformers",
                "primary_topic_title": "Looped Transformers",
                "topic_memberships": [
                    {
                        "topic_slug": "looped-transformers",
                        "topic_title": "Looped Transformers",
                        "relationship": "primary",
                        "why_it_matters": "Central because the paper directly changes the loop-depth story.",
                    },
                    {
                        "topic_slug": "iterative-reasoning",
                        "topic_title": "Iterative Reasoning",
                        "relationship": "related",
                        "why_it_matters": "Relevant because it clarifies the cost/benefit of repeated compute.",
                    },
                ],
                "topic_updates": [
                    {
                        "added_at": "2026-04-23T00:00:00Z",
                        "issue_number": 8,
                        "issue_url": "https://github.com/octo/papers/issues/8",
                        "topic_slug": "looped-transformers",
                        "topic_title": "Looped Transformers",
                        "summary": "Explains where loop depth changes the payoff curve.",
                        "why_it_matters": "It gives the topic a practical depth story.",
                    },
                    {
                        "added_at": "2026-04-23T00:00:00Z",
                        "issue_number": 8,
                        "issue_url": "https://github.com/octo/papers/issues/8",
                        "topic_slug": "iterative-reasoning",
                        "topic_title": "Iterative Reasoning",
                        "summary": "Shows how repeated passes stop paying off linearly.",
                        "why_it_matters": "It links loop depth to iterative-compute limits.",
                    },
                ],
                "notes_history": [],
                "issue_numbers": [8],
                "issue_urls": ["https://github.com/octo/papers/issues/8"],
                "added_at": "2026-04-23T00:00:00Z",
                "updated_at": "2026-04-23T00:00:00Z",
            }

            (topics_dir / "looped-transformers.json").write_text(
                json.dumps(primary_topic, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            (topics_dir / "iterative-reasoning.json").write_text(
                json.dumps(related_topic, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            (topics_dir / "looped-transformers.explainer.html").write_text(
                """
                <style>
                .topic-explainer--looped-transformers .topic-explainer__accent { color: #38bdf8; }
                </style>
                <section class="topic-explainer topic-explainer--looped-transformers" data-topic-explainer="looped-transformers">
                  <section class="topic-explainer__panel">
                    <h3>Loop depth acts like iterative compute</h3>
                    <svg viewBox="0 0 240 120" role="img" aria-label="Loop depth diagram">
                      <rect x="16" y="24" width="52" height="72" rx="14" fill="none" stroke="currentColor" />
                      <path class="diagram-draw" d="M68 60 C110 18, 156 18, 198 60" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="120" />
                      <rect x="172" y="24" width="52" height="72" rx="14" fill="none" stroke="currentColor" />
                    </svg>
                    <p class="topic-explainer__accent">The new paper explains where extra passes stop paying off.</p>
                  </section>
                </section>
                """.strip()
                + "\n",
                encoding="utf-8",
            )
            topic_files_dir = topics_dir / "looped-transformers_files"
            topic_files_dir.mkdir()
            (topic_files_dir / "index.html").write_text(
                "<!doctype html><title>Bundled draft page</title>\n",
                encoding="utf-8",
            )
            (topic_files_dir / "figure.js").write_text(
                "window.figureLoaded = true;\n",
                encoding="utf-8",
            )
            (papers_dir / "depth-schedules-for-looped-transformers-2026.json").write_text(
                json.dumps(paper, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )

            site_dir = root / "site"
            build_site(data_dir, site_dir)

            looped_topic_html = (site_dir / "topics" / "looped-transformers" / "index.html").read_text(
                encoding="utf-8"
            )
            related_topic_html = (site_dir / "topics" / "iterative-reasoning" / "index.html").read_text(
                encoding="utf-8"
            )
            paper_html = (
                site_dir / "papers" / "depth-schedules-for-looped-transformers-2026" / "index.html"
            ).read_text(encoding="utf-8")

            self.assertIn("Understand the topic visually", looped_topic_html)
            self.assertIn("Loop depth acts like iterative compute", looped_topic_html)
            self.assertNotIn("Bundled draft page", looped_topic_html)
            self.assertTrue((site_dir / "topics" / "looped-transformers" / "figure.js").exists())
            self.assertIn("Depth Schedules for Looped Transformers", related_topic_html)
            self.assertIn("What this paper contributes", paper_html)
            self.assertIn("Related topics", paper_html)
            self.assertIn("Looped Transformers", paper_html)
            self.assertIn("Iterative Reasoning", paper_html)


if __name__ == "__main__":
    unittest.main()
