"use client";

import { useEffect, useRef, useState } from "react";

import WavesurferPlayer from "@wavesurfer/react";
import clsx from "clsx";
import HoverPlugin from "wavesurfer.js/dist/plugins/hover";
import RecordPlugin from "wavesurfer.js/dist/plugins/record";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline";
import Wavesurfer, { WaveSurferOptions } from "wavesurfer.js/dist/wavesurfer";

import { useTheme } from "next-themes";

import { Progress } from "@nextui-org/progress";

import { headerNames } from "@/config/keys";
import { AnimatedPulse } from "@/core/animated-pulse";
import { useAccessToken } from "@/services/session-management/use-access-token";
import { tailwindColors } from "@/utility/constants";

export type WavesurferModuleControls = {
  playPause: () => void;
  startRecording: () => Promise<void>;
  togglePauseRecording: () => void;
  endRecording: () => void;
};

type WavesurferModuleProps = {
  audioData: string | null;
  waveformPeaks: number[] | null;
  isHidden: boolean;
  onInit?: (controls: WavesurferModuleControls) => void;
  onDurationChanged?: (seconds: number | null) => void;
  onLoading?: () => void;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onRecordingStarted?: () => void;
  onRecordingPaused?: () => void;
  onRecordingResumed?: () => void;
  onRecordingEnded?: (recording: File) => void;
};

export const WavesurferModule = ({
  audioData,
  waveformPeaks,
  isHidden,
  onInit,
  onDurationChanged,
  onLoading,
  onReady,
  onPlay,
  onPause,
  onRecordingStarted,
  onRecordingPaused,
  onRecordingResumed,
  onRecordingEnded,
}: WavesurferModuleProps) => {
  const NO_AUDIO_URL = "no-audio.mp3";
  const PLAYER_HEIGHT = 70;

  const { theme } = useTheme();
  const accessToken = useAccessToken();
  const wavesurfer = useRef<Wavesurfer | null>(null);
  const recorder = useRef<RecordPlugin | null>(null);

  const [loadedAudio, setLoadedAudio] = useState<string | Blob | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [percentLoaded, setPercentLoaded] = useState<number>(0);
  const [error, setError] = useState<string>();
  const [durationMs, setDurationMs] = useState<number | null>(null);

  const [options, setOptions] = useState<Partial<WaveSurferOptions>>({
    barRadius: 100,
    barWidth: 2,
    progressColor:
      theme === "light"
        ? tailwindColors["zinc-400"]
        : tailwindColors["zinc-600"],
    waveColor: tailwindColors["blue-400"],
    cursorWidth: 1,
    cursorColor: tailwindColors["zinc-500"],
    fillParent: true,
    interact: false,
    fetchParams: {
      credentials: "include",
      headers: {
        [headerNames.JenkinsAuthorization]: `Bearer ${accessToken}`,
      },
    },
  });

  const handleInit = async (ws: Wavesurfer) => {
    wavesurfer.current = ws;
    recorder.current = configureRecorder();

    ws.setOptions(options);

    ws.registerPlugin(HoverPlugin.create());
    ws.registerPlugin(
      TimelinePlugin.create({
        style: { color: tailwindColors["zinc-400"] },
      }),
    );

    ws.registerPlugin(recorder.current);
  };

  const handleReady = (_: Wavesurfer, seconds: number) => {
    if (!isInitialized) {
      setIsInitialized(true);
      onInit?.({
        playPause,
        startRecording,
        togglePauseRecording,
        endRecording,
      });
    }

    if (!isRecording) {
      setDurationMs(seconds * 1000);
    }

    setIsReady(true);
    onReady?.();
  };

  const handleLoading = (_: Wavesurfer, percent: number) => {
    if (loadedAudio) {
      setPercentLoaded(percent);
    }
  };

  const handleError = (_: Wavesurfer, error: Error) => {
    if (error && error.message) {
      setError(error.message);
    }
  };

  const handleDestroy = (_: Wavesurfer) => {
    recorder.current?.unAll();
    recorder.current?.destroy();
  };

  // Handle changes to audio source.
  useEffect(() => {
    if (isInitialized && audioData !== loadedAudio) {
      wavesurfer.current?.stop();
      recorder.current?.stopRecording();

      setIsReady(false);
      setDurationMs(null);
      setError(undefined);
      setPercentLoaded(0);
      onLoading?.();

      if (audioData) {
        wavesurfer.current?.load(audioData, [waveformPeaks ?? [0]]);
      }

      setLoadedAudio(audioData);
    }
  }, [audioData, isInitialized]);

  // Handle changes to Wavesurfer options.
  useEffect(() => {
    wavesurfer.current?.setOptions(options);
  }, [options]);

  // Handle changes to player interactive state.
  useEffect(() => {
    setOptions({
      ...options,
      interact: isReady && loadedAudio != null,
    });
  }, [isReady]);

  // Handle changes to the access token.
  useEffect(() => {
    setOptions({
      ...options,
      fetchParams: {
        headers: {
          [headerNames.JenkinsAuthorization]: `Bearer ${accessToken}`,
        },
      },
    });
  }, [accessToken]);

  // Handle changes to player display colors.
  useEffect(() => {
    setOptions({
      ...options,
      progressColor:
        theme === "light"
          ? tailwindColors["zinc-400"]
          : tailwindColors["zinc-600"],
      waveColor: isRecording
        ? tailwindColors["red-400"]
        : tailwindColors["blue-400"],
    });
  }, [theme, isRecording]);

  useEffect(() => {
    onDurationChanged?.(durationMs ? Math.trunc(durationMs / 1000) : null);
  }, [durationMs]);

  const playPause = () => {
    wavesurfer.current?.playPause();
  };

  const startRecording = async () => {
    if (recorder.current && !recorder.current.isRecording()) {
      try {
        await recorder.current.startMic();
        await recorder.current.startRecording();
      } catch (e: unknown) {
        // Handle microphone not available.
        if (e instanceof DOMException) {
          switch (e.name) {
            case "NotFoundError":
              throw Error(
                "No recording device detected. Please configure a microphone and try again.",
              );
            case "NotAllowedError":
              throw Error(
                "Access to the microphone was blocked. Please adjust your device permissions and try again.",
              );
            default:
              throw e;
          }
        }
      }
    }
  };

  const togglePauseRecording = () => {
    if (recorder.current) {
      if (recorder.current.isRecording()) {
        recorder.current.pauseRecording();
      } else if (recorder.current.isPaused()) {
        recorder.current.resumeRecording();
      }
    }
  };

  const endRecording = () => {
    if (recorder.current) {
      if (recorder.current.isRecording() || recorder.current.isPaused()) {
        recorder.current.stopRecording();
        recorder.current.stopMic();
      }
    }
  };

  /** Activate and configure recording functionality for the player. */
  const configureRecorder = (): RecordPlugin => {
    const recordPlugin = RecordPlugin.create({
      scrollingWaveform: false,
      renderRecordedAudio: false,
    });

    recordPlugin.on("record-start", () => {
      setIsRecording(true);
      onRecordingStarted?.();
    });

    recordPlugin.on("record-pause", (_blob: Blob) => {
      setIsRecordingPaused(true);
      onRecordingPaused?.();
    });

    recordPlugin.on("record-resume", () => {
      setIsRecordingPaused(false);
      onRecordingResumed?.();
    });

    recordPlugin.on("record-end", (blob: Blob) => {
      setIsRecording(false);
      setIsRecordingPaused(false);

      const mimeType = blob.type;
      const file = new File([blob], "recording", {
        type: mimeType,
      });

      onRecordingEnded?.(file);
    });

    recordPlugin.on("record-progress", (milliseconds: number) => {
      setDurationMs(milliseconds);
    });

    recordPlugin.on("destroy", () => {
      recordPlugin.unAll();
    });

    return recordPlugin;
  };

  return (
    <div
      className={clsx({
        "relative w-full h-full": true,
        hidden: isHidden,
      })}
    >
      {!!error && !isRecording && (
        <div className="text-red-500 text-sm flex w-full text-center mt-[10px]">
          {error}
        </div>
      )}
      <div
        className={clsx([
          "-z-10 absolute flex w-full justify-center mt-[22px] transition-opacity ease-in-out",
          !!error || isReady || !loadedAudio ? "opacity-0" : "opacity-100",
        ])}
      >
        <div className="flex flex-row gap-2 items-center justify-start w-[80%]">
          <Progress
            aria-label="Loading"
            className="mt-1"
            classNames={{
              indicator:
                percentLoaded === 0
                  ? "bg-zinc-400 dark:bg-zinc-600"
                  : "bg-blue-500",
            }}
            isIndeterminate={percentLoaded === 0}
            size="sm"
            value={percentLoaded}
          />
        </div>
      </div>
      <AnimatedPulse isPulsing={isRecording && isRecordingPaused}>
        <div
          // className={clsx([
          //   {
          //     "pointer-events-none": !error && (!loadedAudio || !isReady),
          //     hidden: !!error,
          //   },
          //   "transition-opacity ease-in-out",
          //   isReady ? "opacity-100" : "opacity-0 invisible",
          // ])}
          className={clsx({
            invisible:
              !isRecording && (audioData == null || waveformPeaks === null),
          })}
        >
          <WavesurferPlayer
            autoplay={false}
            backend="MediaElement"
            height={PLAYER_HEIGHT}
            url={NO_AUDIO_URL}
            onDestroy={handleDestroy}
            onError={handleError}
            onInit={handleInit}
            onLoading={handleLoading}
            onPause={() => onPause?.()}
            onPlay={() => onPlay?.()}
            onReady={handleReady}
          />
        </div>
      </AnimatedPulse>
    </div>
  );
};
