import time
from datetime import datetime


class ExecutionTimer:
    """
    Used to measure the execution time of a block of code.

    For example:
    ```python
        with ExecutionTimer() as timer:
            # Do something.
        duration = timer.ellapsed_ms
    ```
    """

    started_at: datetime | None = None
    elapsed_ms: int | None = None

    def __enter__(self):
        self.started_at = datetime.now()
        self._start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self._end_time = time.time()
        self.elapsed_ms = int((self._end_time - self._start_time) * 1000)
