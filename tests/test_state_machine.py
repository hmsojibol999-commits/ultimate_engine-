import tempfile, unittest
from pathlib import Path
from engine.models import JobState,Plan
from engine.state_machine import transition
from engine.exceptions import ValidationError
from engine.orchestrator import Orchestrator
class StateTests(unittest.TestCase):
 def test_valid_transition(self): self.assertEqual(transition(JobState.CREATED,JobState.PLANNED),JobState.PLANNED)
 def test_invalid_transition(self):
  with self.assertRaises(ValidationError): transition(JobState.CREATED,JobState.RUNNING)
 def test_plan_approval_required(self):
  with tempfile.TemporaryDirectory() as d:
   o=Orchestrator(d); j=o.create_job(o.plan("inspect this request")); self.assertEqual(j.state,JobState.AWAITING_APPROVAL); self.assertFalse(j.plan["approved"])
   approved=o.approve(j.job_id,True); self.assertEqual(approved.state,JobState.QUEUED); self.assertTrue(approved.plan["approved"])
