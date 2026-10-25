import tempfile,unittest
from pathlib import Path
from engine.storage.bundle import verify_zip
from engine.data.dataset_factory import export_frame
class ExportTests(unittest.TestCase):
 def test_export_bundle(self):
  with tempfile.TemporaryDirectory() as d:
   r=export_frame([{"name":"A","value":2}],d,formats=["csv","json","jsonl"])
   self.assertTrue(Path(r["bundle"]).is_file()); self.assertTrue(verify_zip(r["bundle"])["valid"])
 def test_empty_export_fails(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaises(ValueError):export_frame([],d)
