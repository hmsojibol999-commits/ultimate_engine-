from __future__ import annotations
import importlib.util, shutil, sys
from .models import Capability, CapabilityState
class CapabilityRegistry:
    def __init__(self): self._items: dict[str,Capability]={}
    def register(self,item:Capability)->None: self._items[item.name]=item
    def probe(self)->dict[str,Capability]:
        checks={"httpx":"httpx","polars":"polars","duckdb":"duckdb","pyarrow":"pyarrow","gradio":"gradio","pymupdf":"fitz","playwright":"playwright","transformers":"transformers","bitsandbytes":"bitsandbytes","trafilatura":"trafilatura","rapidfuzz":"rapidfuzz"}
        for name,module in checks.items():
            present=importlib.util.find_spec(module) is not None
            state=CapabilityState.AVAILABLE if present else CapabilityState.DEPENDENCY_MISSING
            self.register(Capability(name,state,"Python module import spec found" if present else f"Python package '{module}' is not installed",fallback="Use deterministic core path where available" if not present else None))
        node=shutil.which("node"); self.register(Capability("nodejs",CapabilityState.AVAILABLE if node else CapabilityState.DEPENDENCY_MISSING,node or "Node.js executable not found"))
        self.register(Capability("python",CapabilityState.AVAILABLE,sys.version.split()[0],sys.version.split()[0]))
        return self._items.copy()
    def list(self)->list[dict]: return [{"name":x.name,"state":x.state.value,"detail":x.detail,"version":x.version,"fallback":x.fallback} for x in self._items.values()]
