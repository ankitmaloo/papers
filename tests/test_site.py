import json
import tempfile
import unittest
from pathlib import Path

from paper_trail.site import build_site


class SiteTests(unittest.TestCase):
    def test_build_site_writes_index_and_detail_pages(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            data_dir = root / "data"
            papers_dir = data_dir / "papers"
            papers_dir.mkdir(parents=True)
            record = {
                "slug": "attention-is-all-you-need-2017",
                "title": "Attention Is All You Need",
                "source_url": "https://doi.org/10.5555/3295222.3295349",
                "canonical_url": "https://papers.nips.cc/paper/7181-attention-is-all-you-need",
                "source_urls": [
                    "https://doi.org/10.5555/3295222.3295349",
                    "https://papers.nips.cc/paper/7181-attention-is-all-you-need",
                ],
                "authors": ["Ashish Vaswani", "Noam Shazeer"],
                "venue": "NeurIPS",
                "published_date": "2017-06-12",
                "doi": "10.5555/3295222.3295349",
                "arxiv_id": None,
                "abstract": "A transformer architecture with self-attention.",
                "tags": ["transformers", "architectures"],
                "notes_history": [
                    {
                        "added_at": "2026-04-22T00:00:00Z",
                        "issue_number": 7,
                        "issue_url": "https://github.com/octo/papers/issues/7",
                        "text": "Found through a survey.",
                    }
                ],
                "issue_numbers": [7],
                "issue_urls": ["https://github.com/octo/papers/issues/7"],
                "added_at": "2026-04-22T00:00:00Z",
                "updated_at": "2026-04-22T00:00:00Z",
            }
            (papers_dir / "attention-is-all-you-need-2017.json").write_text(
                json.dumps(record, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )

            site_dir = root / "site"
            build_site(data_dir, site_dir)

            index_html = (site_dir / "index.html").read_text(encoding="utf-8")
            detail_html = (site_dir / "papers" / "attention-is-all-you-need-2017" / "index.html").read_text(
                encoding="utf-8"
            )
            papers_json = json.loads((site_dir / "papers.json").read_text(encoding="utf-8"))

            self.assertIn("Attention Is All You Need", index_html)
            self.assertIn("papers/attention-is-all-you-need-2017/", index_html)
            self.assertIn("Open source paper", detail_html)
            self.assertIn("Found through a survey.", detail_html)
            self.assertEqual(papers_json[0]["slug"], "attention-is-all-you-need-2017")


if __name__ == "__main__":
    unittest.main()
