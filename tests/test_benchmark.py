import tempfile,unittest
from engine.monitoring.benchmark import run_benchmarks
class BenchmarkTests(unittest.TestCase):
 def test_local_benchmarks_report_results_and_missing_dependencies(self):
  with tempfile.TemporaryDirectory() as d:
   report=run_benchmarks(d,include_browser=False,rows=100)
   names={item["name"] for item in report["benchmarks"]}
   self.assertIn("html_parsing",names);self.assertIn("zip_generation_and_integrity",names);self.assertTrue(report["report_path"])
