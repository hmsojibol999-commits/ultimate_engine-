from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any

def utc_now() -> str: return datetime.now(timezone.utc).isoformat()
class CapabilityState(str, Enum):
    AVAILABLE="AVAILABLE"; AVAILABLE_WITH_LIMITATIONS="AVAILABLE_WITH_LIMITATIONS"; DISABLED="DISABLED"; DEPENDENCY_MISSING="DEPENDENCY_MISSING"; RESOURCE_INSUFFICIENT="RESOURCE_INSUFFICIENT"; NOT_CONFIGURED="NOT_CONFIGURED"; FAILED="FAILED"; COMPLETED="COMPLETED"; CANCELLED="CANCELLED"
class JobState(str, Enum):
    CREATED="CREATED"; PLANNED="PLANNED"; AWAITING_APPROVAL="AWAITING_APPROVAL"; QUEUED="QUEUED"; RUNNING="RUNNING"; PAUSED="PAUSED"; AWAITING_DECISION="AWAITING_DECISION"; COMPLETED="COMPLETED"; FAILED="FAILED"; CANCELLED="CANCELLED"
@dataclass
class Capability:
    name: str
    state: CapabilityState
    detail: str
    version: str | None = None
    fallback: str | None = None
@dataclass
class Plan:
    request: str
    stages: list[dict[str, Any]]
    parameters: dict[str, Any] = field(default_factory=dict)
    approved: bool = False
    created_at: str = field(default_factory=utc_now)
    def to_dict(self) -> dict[str, Any]: return asdict(self)
@dataclass
class Job:
    job_id: str
    request: str
    state: JobState
    plan: dict[str, Any]
    created_at: str = field(default_factory=utc_now)
    updated_at: str = field(default_factory=utc_now)
    error: str | None = None
    result_artifacts: list[str] = field(default_factory=list)
    def to_dict(self) -> dict[str, Any]:
        v=asdict(self); v["state"]=self.state.value; return v
