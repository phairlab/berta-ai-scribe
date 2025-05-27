import { useRef, useState } from "react";

export function useStopwatch() {
  const stopwatch = useRef<NodeJS.Timeout | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  function start() {
    if (stopwatch.current) {
      clearInterval(stopwatch.current);
    }

    const durationStart = duration ?? 0;
    const timeStart = new Date().getTime();

    stopwatch.current = setInterval(() => {
      const milliseconds = durationStart + (new Date().getTime() - timeStart);

      if (!duration || milliseconds > duration) {
        setDuration(milliseconds);
      }
    }, 200);
  }

  function pause() {
    if (stopwatch.current) {
      clearInterval(stopwatch.current);
      stopwatch.current = null;
    }
  }

  function reset() {
    if (stopwatch.current) {
      clearInterval(stopwatch.current);
      stopwatch.current = null;
    }

    setDuration(null);
  }

  return { start, pause, reset, duration } as const;
}
