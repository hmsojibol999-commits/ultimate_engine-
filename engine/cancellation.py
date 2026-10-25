from __future__ import annotations
import threading
from .exceptions import CancelledError
class CancellationToken:
    def __init__(self) -> None: self._event=threading.Event(); self._reason=""
    def cancel(self, reason: str="Cancelled by administrator") -> None: self._reason=reason; self._event.set()
    @property
    def cancelled(self) -> bool: return self._event.is_set()
    @property
    def reason(self) -> str: return self._reason or "Cancelled"
    def raise_if_cancelled(self) -> None:
        if self.cancelled: raise CancelledError(self.reason)
    def wait(self, seconds: float) -> bool: return self._event.wait(max(0.0,seconds))
