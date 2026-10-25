import tempfile,unittest
from config import Config
class UITests(unittest.TestCase):
 def test_callback_import_and_dashboard_wiring(self):
  try: import gradio
  except ImportError:self.skipTest("Gradio not installed");return
  from ui.callbacks import DashboardService
  from ui.dashboard import build_dashboard
  with tempfile.TemporaryDirectory() as d:
   cfg=Config(workspace=d,model_cache=d+"/models")
   service=DashboardService(cfg); demo=build_dashboard(service,cfg)
   self.assertIsNotNone(demo); self.assertTrue(hasattr(demo,"launch"))
