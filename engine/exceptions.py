class EngineError(Exception):
    """Expected operational error with a safe user-facing message."""
class ValidationError(EngineError):
    """Input or configuration failed validation."""
class CapabilityUnavailable(EngineError):
    """An optional capability is not usable in this runtime."""
class CancelledError(EngineError):
    """Operation was cancelled by the administrator."""
