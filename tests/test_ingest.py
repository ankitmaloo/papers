import json
import tempfile
import unittest
from pathlib import Path

from paper_trail.ingest import PaperIngestError, ingest_issue_event, parse_issue_form


class IngestTests(unittest.TestCase):
    def test_parse_issue_form_reads_fields(self) -> None:
        submission = parse_issue_form(
            """### Paper URL
https://doi.org/10.5555/3295222.3295349

### Title override
_No response_

### Tags
Transformers, LLM
attention

### Notes
Strong baseline for sequence modeling.
"""
        )

        self.assertEqual(submission.paper_url, "https://doi.org/10.5555/3295222.3295349")
        self.assertIsNone(submission.title_override)
        self.assertEqual(submission.tags, ["transformers", "llm", "attention"])
        self.assertEqual(submission.notes, "Strong baseline for sequence modeling.")

    def test_ingest_adds_then_updates_existing_record(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_dir = Path(tmp_dir) / "data"
            initial_event = {
                "issue": {
                    "number": 7,
                    "html_url": "https://github.com/octo/papers/issues/7",
                    "body": """### Paper URL
https://doi.org/10.5555/3295222.3295349

### Title override
_No response_

### Tags
Transformers

### Notes
Found through a survey.
""",
                }
            }
            updated_event = {
                "issue": {
                    "number": 8,
                    "html_url": "https://github.com/octo/papers/issues/8",
                    "body": """### Paper URL
https://papers.nips.cc/paper/7181-attention-is-all-you-need

### Title override
_No response_

### Tags
architectures, transformers

### Notes
Reread this because it links nicely to sparse attention work.
""",
                }
            }

            def fake_fetch_json(url: str, accept: str, timeout: int) -> tuple[dict, str]:
                self.assertIn("10.5555/3295222.3295349", url)
                return (
                    {
                        "title": "Attention Is All You Need",
                        "author": [
                            {"given": "Ashish", "family": "Vaswani"},
                            {"given": "Noam", "family": "Shazeer"},
                        ],
                        "container-title": "NeurIPS",
                        "issued": {"date-parts": [[2017, 6, 12]]},
                        "DOI": "10.5555/3295222.3295349",
                        "URL": "https://papers.nips.cc/paper/7181-attention-is-all-you-need",
                    },
                    url,
                )

            def fake_fetch_text(url: str, accept: str, timeout: int) -> tuple[str, str]:
                return (
                    """<html><head>
<meta name="citation_title" content="Attention Is All You Need">
<meta name="citation_author" content="Ashish Vaswani">
<meta name="citation_author" content="Noam Shazeer">
<meta name="description" content="A transformer architecture with self-attention.">
<link rel="canonical" href="https://papers.nips.cc/paper/7181-attention-is-all-you-need">
</head><body></body></html>""",
                    url,
                )

            added = ingest_issue_event(
                initial_event,
                data_dir=data_dir,
                fetch_text_func=fake_fetch_text,
                fetch_json_func=fake_fetch_json,
            )
            self.assertEqual(added.status, "added")
            self.assertEqual(added.paper_slug, "attention-is-all-you-need-2017")

            record_path = data_dir / "papers" / "attention-is-all-you-need-2017.json"
            with record_path.open(encoding="utf-8") as handle:
                created_record = json.load(handle)
            self.assertEqual(created_record["tags"], ["transformers"])
            self.assertEqual(created_record["issue_numbers"], [7])
            self.assertEqual(len(created_record["notes_history"]), 1)

            updated = ingest_issue_event(
                updated_event,
                data_dir=data_dir,
                fetch_text_func=fake_fetch_text,
                fetch_json_func=fake_fetch_json,
            )
            self.assertEqual(updated.status, "updated")
            self.assertEqual(updated.paper_slug, "attention-is-all-you-need-2017")

            with record_path.open(encoding="utf-8") as handle:
                updated_record = json.load(handle)
            self.assertEqual(updated_record["tags"], ["transformers", "architectures"])
            self.assertEqual(updated_record["issue_numbers"], [7, 8])
            self.assertEqual(len(updated_record["notes_history"]), 2)
            self.assertEqual(updated_record["title"], "Attention Is All You Need")

    def test_title_override_allows_pdf_only_submission(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_dir = Path(tmp_dir) / "data"
            event = {
                "issue": {
                    "number": 3,
                    "html_url": "https://github.com/octo/papers/issues/3",
                    "body": """### Paper URL
https://example.com/paper.pdf

### Title override
My PDF-only Paper

### Tags
pdf

### Notes
_No response_
""",
                }
            }

            def failing_fetch_text(url: str, accept: str, timeout: int) -> tuple[str, str]:
                raise PaperIngestError("The submitted URL resolved directly to a PDF.")

            def failing_fetch_json(url: str, accept: str, timeout: int) -> tuple[dict, str]:
                raise AssertionError("DOI lookup should not run for a PDF-only URL")

            result = ingest_issue_event(
                event,
                data_dir=data_dir,
                fetch_text_func=failing_fetch_text,
                fetch_json_func=failing_fetch_json,
            )

            self.assertEqual(result.status, "added")
            self.assertEqual(result.paper_title, "My PDF-only Paper")
            with (data_dir / "papers" / "my-pdf-only-paper.json").open(encoding="utf-8") as handle:
                record = json.load(handle)
            self.assertEqual(record["title"], "My PDF-only Paper")


if __name__ == "__main__":
    unittest.main()

