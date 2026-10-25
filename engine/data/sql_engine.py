from __future__ import annotations
import re,time
DANGEROUS_SQL=re.compile(r"\b(attach|detach|install|load|copy|export|import|pragma|call|checkpoint|force_checkpoint|vacuum|create_secret|drop_secret|read_csv_auto|read_csv|read_parquet|read_json_auto|glob|httpfs)\b",re.I)
def validate_readonly_query(sql:str)->str:
 normalized=sql.strip().rstrip(";").lstrip()
 if not normalized: raise ValueError("SQL query cannot be empty")
 if ";" in normalized: raise ValueError("Only one SQL statement is allowed")
 if re.match(r"(?is)^(select|with)\b",normalized) is None: raise ValueError("Only read-only SELECT or WITH queries are allowed")
 if DANGEROUS_SQL.search(normalized): raise ValueError("Query includes a restricted SQL capability")
 return normalized
class SQLEngine:
 def __init__(self):
  try: import duckdb
  except ImportError as exc: raise RuntimeError("DuckDB is not installed") from exc
  self.duckdb=duckdb
 def query_frame(self,frame,sql:str,max_rows:int=10000)->dict:
  normalized=validate_readonly_query(sql)
  conn=self.duckdb.connect(database=":memory:")
  started=time.perf_counter()
  try:
   registered=frame.to_arrow() if hasattr(frame,"to_arrow") else frame
   conn.register("input_data",registered)
   conn.execute("SET enable_external_access = false")
   table=conn.execute(normalized).fetch_arrow_table()
   if table.num_rows>max_rows: table=table.slice(0,max_rows)
   try:
    import polars as pl
    result=pl.from_arrow(table)
   except ImportError:
    result=table.to_pylist()
   count=table.num_rows
   columns=list(table.column_names)
   return {"dataframe":result,"elapsed_seconds":round(time.perf_counter()-started,6),"row_count":count,"columns":columns,"truncated":count>=max_rows}
  finally: conn.close()
