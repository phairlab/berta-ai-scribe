import { useRef } from "react";

export function useAbortController() {
  const controller = useRef<AbortController>(new AbortController());
  const signal = useRef<AbortSignal>(controller.current.signal);
  const timeout = useRef<NodeJS.Timeout | null>(null);

  const reset = () => {
    controller.current = new AbortController();
    signal.current = controller.current.signal;
  };

  const abort = () => {
    controller.current.abort(
      new DOMException("Request aborted.", "AbortError"),
    );

    reset();
  };

  const setAbortTimeout = (seconds: number) => {
    const signaller = controller.current;

    timeout.current = setTimeout(() => {
      signaller.abort(new DOMException("Request timed out.", "TimeoutError"));
      reset();
    }, seconds * 1000);
  };

  return {
    signal,
    abort,
    setAbortTimeout,
    reset,
  } as const;
}
