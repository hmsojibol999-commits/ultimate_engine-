import os,tempfile,unittest,json
from pathlib import Path
from config import Config
class ConfigTests(unittest.TestCase):
 def test_safe_defaults(self):
  cfg=Config();cfg.validate();self.assertEqual(cfg.bind_host,"127.0.0.1")
 def test_invalid_timeout_rejected(self):
  with self.assertRaises(ValueError):Config(http_timeout=0).validate()
 def test_unknown_json_key_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"cfg.json";p.write_text(json.dumps({"unknown":1}),encoding="utf-8")
   with self.assertRaises(ValueError):Config.load(p)
 def test_export_redacts_credentials(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"cfg.json";Config(remote_api_key="top-secret",smtp_password="hidden").export_json(p);text=p.read_text()
   self.assertNotIn("top-secret",text);self.assertNotIn("hidden",text)
