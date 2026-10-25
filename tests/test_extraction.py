import unittest
from engine.extraction.html_extractor import extract_html
from engine.extraction.http_worker import validate_public_url
from engine.exceptions import ValidationError
class ExtractionTests(unittest.TestCase):
 def test_html_main_text_and_metadata(self):
  r=extract_html('<html><head><title>Example</title><meta name="description" content="A page"><script type="application/ld+json">{"@type":"JobPosting","title":"Python"}</script></head><body><script>secret()</script><main>Hello world</main></body></html>',"https://example.com")
  self.assertEqual(r["title"],"Example"); self.assertIn("Hello world",r["text"]); self.assertNotIn("secret",r["text"]); self.assertEqual(r["json_ld"][0]["title"],"Python")
 def test_reject_non_http(self):
  with self.assertRaises(ValidationError):validate_public_url("file:///etc/passwd")
 def test_reject_localhost(self):
  with self.assertRaises(ValidationError):validate_public_url("http://localhost:8000")
 def test_retry_delay_is_bounded(self):
  from engine.extraction.http_worker import retry_delay
  self.assertEqual(retry_delay(0,"100"),30.0); self.assertEqual(retry_delay(2,"n/a"),4.0)
