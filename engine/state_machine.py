from .models import JobState
from .exceptions import ValidationError
TRANSITIONS = {
 JobState.CREATED:{JobState.PLANNED,JobState.CANCELLED,JobState.FAILED},
 JobState.PLANNED:{JobState.AWAITING_APPROVAL,JobState.CANCELLED,JobState.FAILED},
 JobState.AWAITING_APPROVAL:{JobState.QUEUED,JobState.PLANNED,JobState.CANCELLED},
 JobState.QUEUED:{JobState.RUNNING,JobState.CANCELLED,JobState.FAILED},
 JobState.RUNNING:{JobState.PAUSED,JobState.AWAITING_DECISION,JobState.COMPLETED,JobState.FAILED,JobState.CANCELLED},
 JobState.PAUSED:{JobState.QUEUED,JobState.CANCELLED,JobState.FAILED},
 JobState.AWAITING_DECISION:{JobState.PLANNED,JobState.QUEUED,JobState.COMPLETED,JobState.CANCELLED,JobState.FAILED},
 JobState.COMPLETED:set(),JobState.FAILED:{JobState.QUEUED,JobState.PLANNED},JobState.CANCELLED:set(),
}
def transition(current: JobState, target: JobState) -> JobState:
    if target not in TRANSITIONS[current]: raise ValidationError(f"Illegal job transition: {current.value} -> {target.value}")
    return target
