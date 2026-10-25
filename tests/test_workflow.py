import unittest
from engine.workflow import WorkflowDefinition,WorkflowStep,WorkflowRunner
from engine.exceptions import ValidationError
class WorkflowTests(unittest.TestCase):
 def test_dag_order_and_output(self):
  w=WorkflowDefinition("test",[WorkflowStep("b","plus",["a"]),WorkflowStep("a","start")])
  runner=WorkflowRunner({"start":lambda **k:2,"plus":lambda dependencies,**k:dependencies["a"]+1})
  result=runner.run(w);self.assertEqual(result["outputs"],{"b":3,"a":2})
 def test_cycle_rejected(self):
  w=WorkflowDefinition("cycle",[WorkflowStep("a","x",["b"]),WorkflowStep("b","x",["a"])])
  with self.assertRaises(ValidationError):w.validate()
 def test_missing_operation_rejected(self):
  w=WorkflowDefinition("missing",[WorkflowStep("a","not-registered")])
  with self.assertRaises(ValidationError):WorkflowRunner({}).run(w)
