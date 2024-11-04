import { useState } from "react";

export function useStopwatch() {
  const [stopwatch, setStopwatch] = useState<NodeJS.Timeout | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const start = () => {
    if (stopwatch) {
      clearInterval(stopwatch);
    }

    setIsRunning(true);
    setIsPaused(false);

    const durationStart = duration ?? 0;
    const timeStart = new Date().getTime();

    setStopwatch(
      setInterval(() => {
        const milliseconds = durationStart + (new Date().getTime() - timeStart);

        if (!duration || milliseconds > duration) {
          setDuration(milliseconds);
        }
      }, 200),
    );
  };

  const pause = () => {
    if (stopwatch) {
      clearInterval(stopwatch);
      setStopwatch(null);
    }

    setIsRunning(false);
    setIsPaused(true);
  };

  const reset = () => {
    if (stopwatch) {
      clearInterval(stopwatch);
      setStopwatch(null);
    }

    setDuration(null);
    setIsRunning(false);
    setIsPaused(false);
  };

  return { start, pause, reset, duration, isRunning, isPaused } as const;
}
