import tempfile,unittest
from engine.monitoring.diagnostics import preflight
class DiagnosticTests(unittest.TestCase):
 def test_preflight_reports_runtime(self):
  with tempfile.TemporaryDirectory() as d:
   result=preflight(d); self.assertIn("python",result); self.assertIn("cpu_count",result["resources"]); self.assertTrue(result["workspace_writable"])
