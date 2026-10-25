from __future__ import annotations
from dataclasses import dataclass
from typing import Callable, Any
from .models import CapabilityState

@dataclass
class Plugin:
 name:str
 description:str
 handler:Callable[...,Any]
 probe:Callable[[],tuple[CapabilityState,str]]
 enabled:bool=True

class PluginManager:
 """In-process plugin registry. Plugin code is never imported from uploaded configuration."""
 def __init__(self): self._plugins={}
 def register(self,plugin:Plugin)->None:
  if not plugin.name or plugin.name in self._plugins: raise ValueError("Plugin names must be non-empty and unique")
  self._plugins[plugin.name]=plugin
 def inspect(self)->list[dict]:
  rows=[]
  for plugin in self._plugins.values():
   try: state,detail=plugin.probe()
   except Exception as exc: state,detail=CapabilityState.FAILED,f"Probe failed: {type(exc).__name__}: {exc}"
   rows.append({"name":plugin.name,"description":plugin.description,"enabled":plugin.enabled,"state":state.value,"detail":detail})
  return rows
 def run(self,name:str,**kwargs):
  plugin=self._plugins.get(name)
  if plugin is None: raise KeyError(f"Unknown plugin: {name}")
  if not plugin.enabled: raise RuntimeError(f"Plugin {name} is disabled")
  return plugin.handler(**kwargs)
