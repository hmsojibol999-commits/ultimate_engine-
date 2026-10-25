from __future__ import annotations
from dataclasses import dataclass,field,asdict
from datetime import datetime,timezone
from typing import Any,Callable
from engine.cancellation import CancellationToken
from engine.exceptions import ValidationError,CancelledError

@dataclass
class WorkflowStep:
 step_id:str
 operation:str
 depends_on:list[str]=field(default_factory=list)
 config:dict[str,Any]=field(default_factory=dict)
 resource_class:str="cpu"
 retry_limit:int=0
 status:str="CREATED"
 started_at:str|None=None
 ended_at:str|None=None
 error:str|None=None
 output:Any=None

@dataclass
class WorkflowDefinition:
 name:str
 steps:list[WorkflowStep]
 def validate(self)->list[str]:
  ids=[step.step_id for step in self.steps]
  if not self.name.strip(): raise ValidationError("Workflow name is required")
  if len(ids)!=len(set(ids)): raise ValidationError("Workflow step IDs must be unique")
  known=set(ids)
  for step in self.steps:
   if not step.step_id or not step.operation: raise ValidationError("Each workflow step needs an ID and operation")
   if step.resource_class not in {"network","browser","cpu","gpu","disk","outbound"}: raise ValidationError(f"Unsupported resource class: {step.resource_class}")
   if step.retry_limit<0 or step.retry_limit>5: raise ValidationError("retry_limit must be between 0 and 5")
   unknown=set(step.depends_on)-known
   if unknown: raise ValidationError(f"Step {step.step_id} depends on unknown steps: {sorted(unknown)}")
   if step.step_id in step.depends_on: raise ValidationError("A step cannot depend on itself")
  self.topological_order()
  return ids
 def topological_order(self)->list[WorkflowStep]:
  pending={s.step_id:s for s in self.steps}; done=set(); order=[]
  while pending:
   ready=[s for s in self.steps if s.step_id in pending and set(s.depends_on)<=done]
   if not ready: raise ValidationError("Workflow dependency graph contains a cycle")
   for step in ready: order.append(step); done.add(step.step_id); pending.pop(step.step_id)
  return order
 def preview(self)->dict:
  self.validate()
  return {"name":self.name,"order":[s.step_id for s in self.topological_order()],"steps":[asdict(s) for s in self.steps],"requires_approval":True}

class WorkflowRunner:
 def __init__(self,operations:dict[str,Callable[...,Any]],resource_limits:dict[str,int]|None=None,persist:Callable[[dict],None]|None=None):
  self.operations=operations; self.limits=resource_limits or {"network":2,"browser":1,"cpu":2,"gpu":1,"disk":1,"outbound":1}; self.persist=persist or (lambda state:None)
  if any(not isinstance(v,int) or v<1 for v in self.limits.values()): raise ValueError("Resource limits must be positive integers")
 def run(self,workflow:WorkflowDefinition,inputs:dict|None=None,token:CancellationToken|None=None)->dict:
  workflow.validate(); token=token or CancellationToken(); values=dict(inputs or {}); by_id={s.step_id:s for s in workflow.steps}; state={"workflow":workflow.name,"status":"RUNNING","steps":{s.step_id:{"status":"QUEUED","resource_class":s.resource_class} for s in workflow.steps}}
  self.persist(state)
  for step in workflow.topological_order():
   try: token.raise_if_cancelled()
   except CancelledError:
    state["status"]="CANCELLED"; state["steps"][step.step_id].update(status="CANCELLED",error=token.reason); self.persist(state); raise
   if step.operation not in self.operations:
    step.status="FAILED"; step.error=f"Operation not registered: {step.operation}"; state["steps"][step.step_id]={"status":step.status,"error":step.error}; state["status"]="FAILED"; self.persist(state); raise ValidationError(step.error)
   step.status="RUNNING"; step.started_at=datetime.now(timezone.utc).isoformat(); state["steps"][step.step_id].update(status=step.status,started_at=step.started_at); self.persist(state)
   attempt=0
   while True:
    try:
     token.raise_if_cancelled()
     dependencies={dep:by_id[dep].output for dep in step.depends_on}
     step.output=self.operations[step.operation](inputs=values,dependencies=dependencies,config=dict(step.config),token=token)
     step.status="COMPLETED"; step.error=None; break
    except CancelledError:
     step.status="CANCELLED"; step.error=token.reason; step.ended_at=datetime.now(timezone.utc).isoformat(); state["steps"][step.step_id].update(status=step.status,error=step.error,ended_at=step.ended_at); state["status"]="CANCELLED"; self.persist(state); raise
    except Exception as exc:
     if attempt<step.retry_limit: attempt+=1; continue
     step.status="FAILED"; step.error=f"{type(exc).__name__}: {exc}"[:1000]; step.ended_at=datetime.now(timezone.utc).isoformat(); state["steps"][step.step_id].update(status=step.status,error=step.error,ended_at=step.ended_at); state["status"]="FAILED"; self.persist(state); raise
   step.ended_at=datetime.now(timezone.utc).isoformat(); state["steps"][step.step_id].update(status=step.status,started_at=step.started_at,ended_at=step.ended_at,output=step.output,error=step.error); self.persist(state)
  state["status"]="COMPLETED"; state["outputs"]={s.step_id:s.output for s in workflow.steps}; self.persist(state); return state
