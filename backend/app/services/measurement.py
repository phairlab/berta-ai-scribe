import math
import time
from typing import BinaryIO

class ExecutionTimer():
    """
    Used to measure the execution time of a block of code.
    
    For example:
    ```python
        with ExecutionTimer() as timer:
            # Do something.
        duration = timer.ellapsed_ms
    ```
    """
    elapsed_ms: int | None = None

    def __enter__(self):
        self._start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_value, traceback):
        self._end_time = time.time()
        self.elapsed_ms = int((self._end_time - self._start_time) * 1000)

def get_file_size(file: BinaryIO) -> int:
    "Returns the size of the file in bytes."
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)

    return size

def bytes_to_MB(bytes: int) -> float:
    "Converts the given number of bytes into MB."
    return bytes / 1024 / 1024

def MB_to_bytes(MB: int) -> int:
    "Converts the given number of MB into bytes."
    return MB * 1024 * 1024

def minutes_to_ms(minutes: int) -> int:
    "Converts the given number of minutes into milliseconds."
    return math.floor(minutes * 60 * 1000)
