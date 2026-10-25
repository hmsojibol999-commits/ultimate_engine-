import tempfile,unittest
from engine.ai.model_manager import ModelManager
from engine.exceptions import CapabilityUnavailable
from engine.ai.structured_output import parse_json_object
from engine.ai.fallbacks import deterministic_intent
from engine.storage.artifacts import ArtifactManager
class OptionalTests(unittest.TestCase):
 def test_model_not_loaded_fallback(self):
  with tempfile.TemporaryDirectory() as d:
   manager=ModelManager("not-loaded",d)
   with self.assertRaises(CapabilityUnavailable):manager.generate("hello")
   self.assertFalse(manager.inspect()["loaded"])
 def test_structured_output_validation(self):
  self.assertEqual(parse_json_object('result: {"x":1}',{"x"})["x"],1)
  with self.assertRaises(Exception):parse_json_object("not json",{"x"})
 def test_deterministic_intent_is_not_ai(self):
  self.assertFalse(deterministic_intent("analyze this file")["ai_used"])
 def test_artifact_path_traversal_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   manager=ArtifactManager(d)
   with self.assertRaises(ValueError):manager.write_bytes("../bad.txt",b"no")
