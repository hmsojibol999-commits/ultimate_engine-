import unittest
class PDFTests(unittest.TestCase):
 def test_generated_pdf_fixture(self):
  try: import fitz
  except ImportError:self.skipTest("PyMuPDF optional dependency not installed");return
  from engine.extraction.pdf_extractor import extract_pdf_bytes
  doc=fitz.open();page=doc.new_page();page.insert_text((72,72),"Fixture text");payload=doc.tobytes();doc.close()
  out=extract_pdf_bytes(payload,"fixture://local")
  self.assertEqual(out["page_count"],1);self.assertIn("Fixture text",out["text"])
