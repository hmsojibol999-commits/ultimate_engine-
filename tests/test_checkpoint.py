import tempfile,unittest
from pathlib import Path
from engine.storage.checkpoint import create_checkpoint,restore_checkpoint
class CheckpointTests(unittest.TestCase):
 def test_round_trip(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d)/"work"; (root/"artifacts").mkdir(parents=True); (root/"artifacts"/"data.txt").write_text("safe data")
   (root/"unrelated_upload.txt").write_text("not for checkpoint")
   zip_path=Path(d)/"checkpoint.zip"; create_checkpoint(root,zip_path)
   target=Path(d)/"restored"; result=restore_checkpoint(zip_path,target)
   self.assertTrue(result["validated"]); self.assertEqual((target/"artifacts"/"data.txt").read_text(),"safe data"); self.assertFalse((target/"unrelated_upload.txt").exists())
 def test_path_traversal_rejected(self):
  import json,zipfile,hashlib
  with tempfile.TemporaryDirectory() as d:
   z=Path(d)/"bad.zip"; raw=b"evil"; manifest={"format_version":1,"files":[{"path":"../evil.txt","size_bytes":4,"sha256":hashlib.sha256(raw).hexdigest()}]}
   with zipfile.ZipFile(z,"w") as f:f.writestr("../evil.txt",raw);f.writestr("checkpoint_manifest.json",json.dumps(manifest))
   with self.assertRaises(ValueError):restore_checkpoint(z,Path(d)/"dest")
