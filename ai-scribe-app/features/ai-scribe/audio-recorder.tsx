import { useEffect, useRef, useState } from "react";

import clsx from "clsx";

import { AnimatedPulse } from "@/core/animated-pulse";
import { formatDuration } from "@/utility/formatters";
import { useStopwatch } from "@/utility/use-stopwatch";

export type AudioRecorderControls = {
  startRecording: () => Promise<void>;
  togglePauseRecording: () => void;
  endRecording: () => void;
};

type AudioRecorderProps = {
  onInit?: (controls: AudioRecorderControls) => void;
  onDestroy?: () => void;
  onStarted?: () => void;
  onPaused?: () => void;
  onResumed?: () => void;
  onEnded?: (recording: File | null) => void;
};

export const AudioRecorder = ({
  onInit,
  onDestroy,
  onStarted,
  onPaused,
  onResumed,
  onEnded,
}: AudioRecorderProps) => {
  const stopwatch = useStopwatch();
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  useEffect(() => {
    onInit?.({ startRecording, togglePauseRecording, endRecording });

    return () => {
      if (isRecording) {
        stop();
      }

      onDestroy?.();
    };
  }, []);

  async function getMicrophonePermission() {
    if ("MediaRecorder" in window) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      return stream;
    } else {
      throw new Error("Recording is not supported in this browser");
    }
  }

  async function startRecording() {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      return;
    }

    setIsRecording(true);
    onStarted?.();
    const stream = await getMicrophonePermission();

    if (stream === null) {
      return;
    }

    const recorder = new MediaRecorder(stream, { audioBitsPerSecond: 96000 });
    const localAudioChunks: Blob[] = [];

    recorder.ondataavailable = (ev) => {
      if (typeof ev.data !== "undefined" && ev.data.size !== 0) {
        localAudioChunks.push(ev.data);
      }
    };

    setAudioChunks(localAudioChunks);
    mediaRecorder.current = recorder;

    stopwatch.start();
    mediaRecorder.current.start(15000);
  }

  function togglePauseRecording() {
    if (mediaRecorder.current) {
      if (mediaRecorder.current.state === "recording") {
        stopwatch.pause();
        mediaRecorder.current?.pause();
        setIsPaused(true);
        onPaused?.();
      } else if (mediaRecorder.current.state === "paused") {
        stopwatch.start();
        mediaRecorder.current?.resume();
        setIsPaused(false);
        onResumed?.();
      }
    }
  }

  function endRecording() {
    if (mediaRecorder.current) {
      if (mediaRecorder.current.state !== "inactive") {
        stopwatch.reset();
        mediaRecorder.current.stop();

        const mimeType = mediaRecorder.current.mimeType;
        const audio = new Blob(audioChunks, { type: mimeType });
        const file = new File([audio], "recording", { type: mimeType });

        setAudioChunks([]);

        mediaRecorder.current = null;
        onEnded?.(file);
        setIsRecording(false);
      }
    }
  }

  return (
    <div
      className={clsx(
        "w-full min-h-[70px] flex justify-center items-center border rounded-lg border-zinc-100 dark:border-zinc-900",
        !isRecording && "hidden",
      )}
    >
      <AnimatedPulse isPulsing={isPaused}>
        <div className="text-6xl text-red-500 -mt-2">
          {formatDuration(
            stopwatch.duration === null ? null : stopwatch.duration / 1000,
          )}
        </div>
      </AnimatedPulse>
    </div>
  );
};
