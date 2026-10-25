from __future__ import annotations
from dataclasses import dataclass
from typing import Callable
@dataclass
class Connector:
 name:str
 description:str
 collect:Callable
 enabled:bool=True
class ConnectorRegistry:
 def __init__(self): self._connectors={}
 def register(self,connector:Connector)->None:
  if not connector.name.strip(): raise ValueError("Connector name is required")
  self._connectors[connector.name]=connector
 def list(self)->list[dict]: return [{"name":c.name,"description":c.description,"enabled":c.enabled} for c in self._connectors.values()]
 def run(self,name:str,**kwargs):
  connector=self._connectors.get(name)
  if connector is None: raise KeyError(f"Unknown connector: {name}")
  if not connector.enabled: raise RuntimeError(f"Connector {name} is disabled")
  return connector.collect(**kwargs)
