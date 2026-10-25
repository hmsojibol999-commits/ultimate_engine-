from __future__ import annotations

def profile_frame(frame)->dict:
 try:
  columns=frame.columns
  rows=frame.height
  report={"row_count":rows,"column_count":len(columns),"columns":{}}
  for name,dtype in zip(columns,frame.dtypes):
   col=frame.get_column(name); nulls=col.null_count(); distinct=col.n_unique()
   report["columns"][name]={"dtype":str(dtype),"null_count":int(nulls),"null_fraction":round(nulls/rows,6) if rows else None,"unique_count":int(distinct)}
  report["duplicate_rows"] = int(rows-frame.unique(maintain_order=True).height)
  return report
 except AttributeError as exc: raise TypeError("profile_frame expects a Polars DataFrame") from exc

def validate_required_columns(frame,required:list[str])->dict:
 missing=[col for col in required if col not in frame.columns]
 return {"valid":not missing,"required_columns":required,"missing_columns":missing}
