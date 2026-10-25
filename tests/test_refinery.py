import unittest
class RefineryTests(unittest.TestCase):
 def test_url_normalization(self):
  from engine.data.refinery import normalize_url
  self.assertEqual(normalize_url("HTTPS://Example.COM:443/a#fragment"),"https://example.com/a")
 def test_secret_mask(self):
  from engine.monitoring.logging_config import SecretMaskFilter
  import logging
  rec=logging.LogRecord("x",20,"",1,"api_key=abc123",(),None); SecretMaskFilter().filter(rec); self.assertNotIn("abc123",rec.getMessage())
 def test_polars_clean_and_dedupe(self):
  try: import polars as pl
  except ImportError: self.skipTest("Polars not installed")
  from engine.data.refinery import clean_frame,deduplicate
  f=pl.DataFrame({"name":[" A ","A"],"n":[1,1]}); clean=clean_frame(f); self.assertEqual(clean.get_column("name").to_list(),["A","A"]); self.assertEqual(deduplicate(clean).height,1)
