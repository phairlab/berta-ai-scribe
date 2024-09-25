"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import WavesurferPlayer from "@wavesurfer/react";
import Wavesurfer, { WaveSurferOptions } from "wavesurfer.js/dist/wavesurfer";
import HoverPlugin from "wavesurfer.js/dist/plugins/hover";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline";
import RecordPlugin from "wavesurfer.js/dist/plugins/record";
import clsx from "clsx";
import { Progress } from "@nextui-org/progress";

import { tailwindColors } from "@/utility/display";
import { useAccessToken } from "@/hooks/use-access-token";

import { AnimatePulse } from "./animate-pulse";

/** Controls for audio playback and recording. */
export type AudioPlayerControls = {
  /** Toggle audio playback. */
  playPause: () => void;

  /** Activate the browser microphone and start recording audio. */
  startRecording: () => Promise<void>;

  /** Toggles pausing of a recording in progress. */
  togglePauseRecording: () => void;

  /** Stops and finalizes audio recording. */
  endRecording: () => void;
};

type AudioTrackPlayerProps = {
  audioData: string | Blob | null;
  isHidden: boolean;
  onInit?: (controls: AudioPlayerControls) => void;
  onDurationChanged?: (seconds: number | null) => void;
  onLoading?: () => void;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onRecordingStarted?: () => void;
  onRecordingPaused?: () => void;
  onRecordingResumed?: () => void;
  onRecordingEnded?: (recording: File) => void;
  onRecordingDurationChanged?: (seconds: number) => void;
};

export const AudioTrackPlayer = (props: AudioTrackPlayerProps) => {
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
      headers: { "Jenkins-Authorization": `Bearer ${accessToken}` },
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
      props.onInit?.({
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
    props.onReady?.();
  };

  const handleLoading = (_: Wavesurfer, percent: number) => {
    if (loadedAudio) {
      setPercentLoaded(percent);
    }
  };

  const handleDestroy = (_: Wavesurfer) => {
    recorder.current?.unAll();
    recorder.current?.destroy();
  };

  // Handle changes to audio source.
  useEffect(() => {
    if (isInitialized && props.audioData !== loadedAudio) {
      wavesurfer.current?.stop();
      recorder.current?.stopRecording();

      setIsReady(false);
      setDurationMs(null);
      setError(undefined);
      setPercentLoaded(0);
      props.onLoading?.();

      if (props.audioData) {
        if (typeof props.audioData === "string") {
          wavesurfer.current?.load(props.audioData);
        } else {
          wavesurfer.current?.loadBlob(props.audioData);
        }
      }

      setLoadedAudio(props.audioData);
    }
  }, [props.audioData, isInitialized]);

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
    props.onDurationChanged?.(
      durationMs ? Math.trunc(durationMs / 1000) : null,
    );
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
      scrollingWaveform: true,
      renderRecordedAudio: false,
    });

    recordPlugin.on("record-start", () => {
      setIsRecording(true);
      props.onRecordingStarted?.();
    });

    recordPlugin.on("record-pause", (_blob: Blob) => {
      setIsRecordingPaused(true);
      props.onRecordingPaused?.();
    });

    recordPlugin.on("record-resume", () => {
      setIsRecordingPaused(false);
      props.onRecordingResumed?.();
    });

    recordPlugin.on("record-end", (blob: Blob) => {
      setIsRecording(false);
      setIsRecordingPaused(false);

      const mimeType = blob.type;
      const fileExtension = mimeType.split(";")[0].split("/")[1];

      const file = new File([blob], `recording.${fileExtension}`, {
        type: mimeType,
      });

      props.onRecordingEnded?.(file);
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
        hidden: props.isHidden,
      })}
    >
      {error && !isRecording && (
        <div className="text-red-500 flex w-full justify-center mt-[15px]">
          {error}
        </div>
      )}
      <div
        className={clsx([
          "z-10 absolute flex w-full justify-center mt-[22px] transition-opacity ease-in-out",
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
      <AnimatePulse isActive={isRecording && isRecordingPaused}>
        <div
          className={clsx([
            {
              "pointer-events-none": !error && (!loadedAudio || !isReady),
              hidden: !!error,
            },
            "transition-opacity ease-in-out",
            isReady ? "opacity-100" : "opacity-0 invisible",
          ])}
        >
          <WavesurferPlayer
            autoplay={false}
            height={PLAYER_HEIGHT}
            url={NO_AUDIO_URL}
            onDestroy={handleDestroy}
            onInit={handleInit}
            onLoading={handleLoading}
            onPause={() => props.onPause?.()}
            onPlay={() => props.onPlay?.()}
            onReady={handleReady}
          />
        </div>
      </AnimatePulse>
    </div>
  );
};
