"""Package availability checks for optional dependencies."""

from importlib.util import find_spec

# Do not import optional packages at module import time. Only check presence.
try:
    VLLM_AVAILABLE = find_spec("vllm") is not None
except Exception:
    VLLM_AVAILABLE = False