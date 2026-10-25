import tempfile,unittest
from engine.cancellation import CancellationToken
from engine.data.sql_engine import validate_readonly_query
from engine.exceptions import CancelledError
class SafetyControlTests(unittest.TestCase):
 def test_cancellation_token_signals(self):
  token=CancellationToken(); self.assertFalse(token.cancelled); token.cancel("operator stop"); self.assertTrue(token.cancelled)
  with self.assertRaisesRegex(CancelledError,"operator stop"):token.raise_if_cancelled()
 def test_readonly_sql_accepts_select(self): self.assertEqual(validate_readonly_query(" SELECT * FROM input_data; "),"SELECT * FROM input_data")
 def test_readonly_sql_rejects_delete(self):
  with self.assertRaises(ValueError):validate_readonly_query("DELETE FROM input_data")
 def test_readonly_sql_rejects_multiple_statements(self):
  with self.assertRaises(ValueError):validate_readonly_query("SELECT 1; SELECT 2")
 def test_readonly_sql_rejects_file_reads(self):
  with self.assertRaises(ValueError):validate_readonly_query("SELECT * FROM read_csv('secret.csv')")
