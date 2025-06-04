"""Package availability checks for optional dependencies."""

VLLM_AVAILABLE = False
try:
    import vllm
    _ = vllm.__version__
    VLLM_AVAILABLE = True
except (ImportError, AttributeError):
    pass 