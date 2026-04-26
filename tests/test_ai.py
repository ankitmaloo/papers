import json
import tempfile
import unittest
from pathlib import Path

from paper_trail.ai import build_paper_curation_prompt


class CopilotPromptTests(unittest.TestCase):
    def test_build_paper_curation_prompt_targets_paper_and_topic_catalog(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            data_dir = root / "data"
            (data_dir / "topics").mkdir(parents=True)
            (data_dir / "papers").mkdir(parents=True)

            topic = {
                "slug": "looped-transformers",
                "title": "Looped Transformers",
                "summary": "Track how looping changes transformer behavior.",
                "update_headline": "Depth schedules now explain where gains saturate.",
                "paper_slugs": ["depth-schedules-for-looped-transformers-2026"],
            }
            paper = {
                "slug": "depth-schedules-for-looped-transformers-2026",
                "title": "Depth Schedules for Looped Transformers",
                "paper_summary": "A paper about loop depth schedules.",
                "key_points": ["Gains flatten as depth grows."],
                "source_excerpt_source": "pdf-excerpt",
                "source_excerpt": "The paper explains how loop depth changes the payoff curve.",
            }

            (data_dir / "topics" / "looped-transformers.json").write_text(
                json.dumps(topic, indent=2) + "\n",
                encoding="utf-8",
            )
            (data_dir / "topics" / "looped-transformers.explainer.html").write_text(
                "<section>Existing topic explainer</section>\n",
                encoding="utf-8",
            )
            (data_dir / "papers" / "depth-schedules-for-looped-transformers-2026.json").write_text(
                json.dumps(paper, indent=2) + "\n",
                encoding="utf-8",
            )

            prompt = build_paper_curation_prompt(
                data_dir,
                "depth-schedules-for-looped-transformers-2026",
                issue_number=8,
            )

            self.assertIn("data/papers/depth-schedules-for-looped-transformers-2026.json", prompt)
            self.assertIn("data/topics/looped-transformers.json", prompt)
            self.assertIn("data/topics/looped-transformers.explainer.html", prompt)
            self.assertIn("The bar for updating a topic is high.", prompt)
            self.assertIn("Existing topic catalog", prompt)
            self.assertIn("Depth Schedules for Looped Transformers", prompt)


if __name__ == "__main__":
    unittest.main()
