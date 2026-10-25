import csv,json,tempfile,unittest
from pathlib import Path
from engine.data.loader import load_records
class LoaderTests(unittest.TestCase):
 def test_csv_load(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"x.csv";p.write_text("name,n\nAlpha,2\n",encoding="utf-8")
   data=load_records(p)
   self.assertTrue(hasattr(data,"columns") or data[0]["name"]=="Alpha")
 def test_json_load(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"x.json";p.write_text(json.dumps([{"id":1}]),encoding="utf-8")
   data=load_records(p);self.assertTrue(hasattr(data,"columns") or data[0]["id"]==1)
 def test_bad_jsonl_reports_line(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"x.jsonl";p.write_text('{"ok":1}\n{bad}\n',encoding="utf-8")
   with self.assertRaisesRegex(ValueError,"line 2"):load_records(p)
 def test_file_size_limit(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"x.json";p.write_text("[]",encoding="utf-8")
   with self.assertRaises(ValueError):load_records(p,max_bytes=1)
