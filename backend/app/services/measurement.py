import time

class Stopwatch():
    elapsed_ms: int | None = None

    def __enter__(self):
        self._start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_value, traceback):
        self._end_time = time.time()
        self.elapsed_ms = int((self._end_time - self._start_time) * 1000)