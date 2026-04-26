import json
import tempfile
import unittest
from pathlib import Path

from paper_trail.ingest import PaperIngestError, ingest_issue_event, parse_issue_form


class IngestTests(unittest.TestCase):
    def test_parse_issue_form_reads_simple_paper_submission(self) -> None:
        submission = parse_issue_form(
            """### Paper URL
https://example.com/looped-a

### Title override
_No response_

### Notes
Use the paper to decide whether any topic is strong enough to update.
"""
        )

        self.assertEqual(submission.paper_urls, ["https://example.com/looped-a"])
        self.assertIsNone(submission.topic_title)
        self.assertEqual(
            submission.notes,
            "Use the paper to decide whether any topic is strong enough to update.",
        )

    def test_ingest_creates_paper_record_without_requiring_topic(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_dir = Path(tmp_dir) / "data"
            event = {
                "issue": {
                    "number": 7,
                    "html_url": "https://github.com/octo/papers/issues/7",
                    "body": """### Paper URL
https://example.com/looped-a

### Title override
_No response_

### Notes
Good foundation paper.
""",
                }
            }

            def fake_fetch_text(url: str, accept: str, timeout: int) -> tuple[str, str]:
                if url.endswith("looped-a"):
                    return (
                        """<html><head>
<meta name="citation_title" content="Parcae: Stable Looped Language Models">
<meta name="citation_author" content="Ada Example">
<meta name="citation_publication_date" content="2026-04-10">
<meta name="description" content="A paper about stable looped transformers.">
<link rel="canonical" href="https://example.com/looped-a">
</head></html>""",
                        url,
                    )
                raise AssertionError(f"Unexpected URL: {url}")

            def fake_fetch_json(url: str, accept: str, timeout: int) -> tuple[dict, str]:
                raise AssertionError("DOI lookup should not run in this test")

            result = ingest_issue_event(
                event,
                data_dir=data_dir,
                fetch_text_func=fake_fetch_text,
                fetch_json_func=fake_fetch_json,
                fetch_bytes_func=lambda url, accept, timeout: None,
            )

            self.assertEqual(result.status, "added")
            self.assertEqual(result.paper_slug, "parcae-stable-looped-language-models-2026")
            self.assertIsNone(result.topic_slug)
            self.assertTrue((data_dir / "papers" / "parcae-stable-looped-language-models-2026.json").exists())
            self.assertFalse((data_dir / "topics").exists())

            with (data_dir / "papers" / "parcae-stable-looped-language-models-2026.json").open(
                encoding="utf-8"
            ) as handle:
                paper_record = json.load(handle)

            self.assertEqual(
                paper_record["paper_summary"],
                "A paper about stable looped transformers.",
            )
            self.assertEqual(paper_record["key_points"][0], "A paper about stable looped transformers.")
            self.assertEqual(paper_record["topic_memberships"], [])
            self.assertEqual(paper_record["source_excerpt_source"], "abstract-only")
            self.assertEqual(paper_record["source_excerpt"], "A paper about stable looped transformers.")
            self.assertEqual(result.commit_subject, "chore(papers): add Parcae: Stable Looped Language Models (#7)")

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
                fetch_bytes_func=lambda url, accept, timeout: None,
            )

            self.assertEqual(result.status, "added")
            with (data_dir / "papers" / "my-pdf-only-paper.json").open(encoding="utf-8") as handle:
                paper_record = json.load(handle)
            self.assertEqual(paper_record["title"], "My PDF-only Paper")
            self.assertEqual(
                paper_record["paper_summary"],
                "My PDF-only Paper has been ingested. Copilot should replace this placeholder with a grounded paper summary.",
            )


if __name__ == "__main__":
    unittest.main()
