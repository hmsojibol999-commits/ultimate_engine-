from __future__ import annotations
import json, os, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine.monitoring.diagnostics import preflight
import tempfile
workspace=Path(os.environ.get("ENGINE_WORKSPACE",str(ROOT/"workspace")))
result=preflight(workspace)
snapshot_dir=workspace/"diagnostics"; snapshot_dir.mkdir(parents=True,exist_ok=True)
snapshot=snapshot_dir/"environment_snapshot.json"
fd,tmp=tempfile.mkstemp(prefix=".preflight-",dir=str(snapshot_dir))
try:
 with os.fdopen(fd,"w",encoding="utf-8") as stream: json.dump(result,stream,indent=2,default=str);stream.flush();os.fsync(stream.fileno())
 os.replace(tmp,snapshot)
finally:
 if os.path.exists(tmp): os.unlink(tmp)
result["snapshot_path"]=str(snapshot)
print(json.dumps(result,indent=2,default=str))
print("Preflight result:","READY_WITH_OPTIONAL_LIMITATIONS" if not result["required_core_missing"] else "CORE_DEPENDENCIES_MISSING")
