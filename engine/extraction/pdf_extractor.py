from __future__ import annotations
from io import BytesIO

def extract_pdf_bytes(data:bytes,source_url:str="",max_pages:int=100,max_bytes:int=25_000_000)->dict:
 if len(data)>max_bytes: raise ValueError(f"PDF exceeds {max_bytes} byte limit")
 try: import fitz
 except ImportError as exc: raise RuntimeError("PDF extraction requires optional PyMuPDF package") from exc
 doc=fitz.open(stream=data,filetype="pdf")
 try:
  if doc.page_count>max_pages: raise ValueError(f"PDF has {doc.page_count} pages; limit is {max_pages}")
  pages=[{"page":i+1,"text":page.get_text("text")} for i,page in enumerate(doc)]
  return {"source_url":source_url,"page_count":len(pages),"pages":pages,"text":"\n\n".join(p["text"] for p in pages),"extraction_method":"pymupdf"}
 finally: doc.close()
