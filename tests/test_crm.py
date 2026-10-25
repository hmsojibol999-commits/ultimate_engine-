import tempfile,unittest
from engine.crm.pitch_generator import draft_pitch
from engine.crm.lead_scoring import score_lead
from engine.crm.campaign import CampaignManager
from engine.crm.smtp_adapter import SMTPAdapter
from engine.crm.campaign import CampaignManager
class CRMTests(unittest.TestCase):
 def test_pitch_and_score(self):
  pitch=draft_pitch({"company":"Acme","title":"Python Engineer","source_url":"https://example.org"},"Python automation service")
  self.assertIn("Acme",pitch["body"]); self.assertEqual(pitch["status"],"DRAFT_NEEDS_HUMAN_REVIEW"); self.assertIn("score",score_lead({"company":"Acme"}))
 def test_dry_run_without_credentials(self):
  with tempfile.TemporaryDirectory() as d:
   m=CampaignManager(d); out=m.dry_run([{"recipient":"a@example.com","body":"hello"}]); self.assertEqual(out["mode"],"DRY_RUN"); self.assertTrue(out["items"][0]["would_send"])
 def test_suppression_and_explicit_approval(self):
  with tempfile.TemporaryDirectory() as d:
   m=CampaignManager(d); m.suppression.add("a@example.com")
   self.assertEqual(m.dry_run([{"recipient":"a@example.com","body":"x"}])["items"][0]["status"],"DRY_RUN")
   with self.assertRaises(PermissionError):m.send([],lambda *a:{},False,set())
