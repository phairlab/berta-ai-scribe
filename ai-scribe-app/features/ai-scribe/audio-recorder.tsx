"use client";

import { useEffect, useRef, useState } from "react";

import clsx from "clsx";

import { AnimatedPulse } from "@/core/animated-pulse";
import { formatDuration } from "@/utility/formatting";
import { useStopwatch } from "@/utility/use-stopwatch";

import { AudioLevel } from "./audio-level";

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
  const [stream, setStream] = useState<MediaStream | null>(null);
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
          
          // Determine file extension based on MIME type
          let extension = '.webm'; // default
          let finalMimeType = mimeType;
          
          if (mimeType.includes('mp4')) {
            extension = '.mp4';
          } else if (mimeType.includes('wav')) {
            extension = '.wav';
          } else if (mimeType.includes('mp3')) {
            extension = '.mp3';
          } else if (mimeType.includes('ogg')) {
            extension = '.ogg';
          } else if (mimeType.includes('webm')) {
            extension = '.webm';
          } else if (mimeType === '' || mimeType === 'application/octet-stream') {
            // Fallback for mobile browsers that don't set proper MIME types
            extension = '.webm';
            finalMimeType = 'audio/webm';
          }
          
          const file = new File([audio], `recording${extension}`, { type: finalMimeType });

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

    setStream(stream);

    if (stream === null) {
      return;
    }

    // Try to use optimal audio format, with fallbacks for mobile browsers
    let options: MediaRecorderOptions = {
      audioBitsPerSecond: 96000,
    };

    // Prefer WebM with Opus for better compression and compatibility
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options.mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      options.mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      options.mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/wav')) {
      options.mimeType = 'audio/wav';
    }
    // If no explicit MIME type is supported, let the browser choose (may result in application/octet-stream)

    mediaRecorder.current = new MediaRecorder(stream, options);

    mediaRecorder.current.ondataavailable = (ev) => {
      if (typeof ev.data !== "undefined" && ev.data.size !== 0) {
        setAudioChunks((audioChunks) => [...audioChunks, ev.data]);
      }
    };

    stopwatch.start();
    mediaRecorder.current.start(5000);
  }

  function endRecording() {
    mediaRecorder.current?.stop();
    stopwatch.reset();
    setStream(null);
    setIsRecordingReady(true);
  }

  return (
    <div
      className={clsx(
        "flex flex-row gap-5 justify-center items-center",
        "relative w-full min-h-[70px]",
        "border rounded-lg border-zinc-100 dark:border-zinc-900",
        !isRecording && "hidden",
      )}
    >
      <AnimatedPulse isPulsing={isPaused}>
        <div className="text-6xl text-red-500">
          {formatDuration(
            stopwatch.duration === null ? null : stopwatch.duration / 1000,
          )}
        </div>
      </AnimatedPulse>
      <div className="absolute right-1">
        <AudioLevel leds={12} stream={stream} />
      </div>
    </div>
  );
};
