import { useEffect, useRef, useState } from "react";

import clsx from "clsx";

import { AnimatedPulse } from "@/core/animated-pulse";
import { formatDuration } from "@/utility/formatters";
import { useStopwatch } from "@/utility/use-stopwatch";

type AudioRecorderProps = {
  isRecording: boolean;
  isPaused: boolean;
  onAudioFinalized?: (recording: File | null) => void;
  onError?: (error: Error) => void;
};

export const AudioRecorder = ({
  isRecording,
  isPaused,
  onAudioFinalized,
  onError,
}: AudioRecorderProps) => {
  const stopwatch = useStopwatch();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const [isRecordingReady, setIsRecordingReady] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  useEffect(() => {
    if (isRecording && mediaRecorder.current === null) {
      startRecording();
    } else if (
      !isRecording &&
      mediaRecorder.current &&
      mediaRecorder.current?.state !== "inactive"
    ) {
      endRecording();
    }
  }, [isRecording]);

  useEffect(() => {
    if (isPaused && mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.pause();
      stopwatch.pause();
    } else if (!isPaused && mediaRecorder.current?.state === "paused") {
      mediaRecorder.current?.resume();
      stopwatch.start();
    }
  }, [isPaused]);

  useEffect(() => {
    if (isRecordingReady) {
      if (mediaRecorder.current) {
        if (audioChunks.length >= 1) {
          const mimeType = audioChunks[0].type;
          const audio = new Blob(audioChunks, { type: mimeType });
          const file = new File([audio], "recording", { type: mimeType });

          setAudioChunks([]);
          onAudioFinalized?.(file);
        }

        setIsRecordingReady(false);
        mediaRecorder.current = null;
      }
    }
  }, [audioChunks]);

  async function getMicrophonePermission() {
    if ("MediaRecorder" in window) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        return stream;
      } catch (ex: unknown) {
        onError?.(ex as Error);

        return null;
      }
    } else {
      onError?.(new Error("Recording is not supported in this browser"));

      return null;
    }
  }

  async function startRecording() {
    const stream = await getMicrophonePermission();

    if (stream === null) {
      return;
    }

    mediaRecorder.current = new MediaRecorder(stream, {
      audioBitsPerSecond: 96000,
    });

    mediaRecorder.current.ondataavailable = (ev) => {
      if (typeof ev.data !== "undefined" && ev.data.size !== 0) {
        setAudioChunks((audioChunks) => [...audioChunks, ev.data]);
      }
    };

    stopwatch.start();
    mediaRecorder.current.start(200);
  }

  function endRecording() {
    mediaRecorder.current?.stop();
    stopwatch.reset();
    setIsRecordingReady(true);
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
