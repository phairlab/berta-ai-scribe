"use client";

import { useEffect, useRef, useState } from "react";

import WavesurferPlayer from "@wavesurfer/react";
import clsx from "clsx";
import HoverPlugin from "wavesurfer.js/dist/plugins/hover";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline";
import Wavesurfer, { WaveSurferOptions } from "wavesurfer.js/dist/wavesurfer";

import { useTheme } from "next-themes";

import { Progress } from "@nextui-org/progress";

import { headerNames } from "@/config/keys";
import { useAccessToken } from "@/services/session-management/use-access-token";
import { tailwindColors } from "@/utility/constants";

export type WavesurferWidgetControls = {
  playPause: () => void;
};

type WavesurferWidgetProps = {
  audioData: string | null;
  waveformPeaks: number[] | null;
  isHidden: boolean;
  onInit?: (controls: WavesurferWidgetControls) => void;
  onDurationChanged?: (seconds: number | null) => void;
  onLoading?: () => void;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
};

export const WavesurferWidget = ({
  audioData,
  waveformPeaks,
  isHidden,
  onInit,
  onDurationChanged,
  onLoading,
  onReady,
  onPlay,
  onPause,
}: WavesurferWidgetProps) => {
  const NO_AUDIO_URL = "no-audio.mp3";
  const PLAYER_HEIGHT = 70;

  const { theme } = useTheme();
  const accessToken = useAccessToken();
  const wavesurfer = useRef<Wavesurfer | null>(null);

  const [loadedAudio, setLoadedAudio] = useState<string | Blob | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isReady, setIsReady] = useState(false);
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

    ws.setOptions(options);
    ws.registerPlugin(HoverPlugin.create());
    ws.registerPlugin(
      TimelinePlugin.create({
        style: { color: tailwindColors["zinc-400"] },
      }),
    );
  };

  const handleReady = (_: Wavesurfer, seconds: number) => {
    if (!isInitialized) {
      setIsInitialized(true);
      onInit?.({ playPause });
    }

    setDurationMs(seconds * 1000);

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

  // Handle changes to audio source.
  useEffect(() => {
    if (isInitialized && audioData !== loadedAudio) {
      wavesurfer.current?.stop();

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
      waveColor: tailwindColors["blue-400"],
    });
  }, [theme]);

  useEffect(() => {
    onDurationChanged?.(durationMs ? Math.trunc(durationMs / 1000) : null);
  }, [durationMs]);

  const playPause = () => {
    wavesurfer.current?.playPause();
  };

  return (
    <div
      className={clsx({
        "relative w-full h-full": true,
        hidden: isHidden,
      })}
    >
      {!!error && (
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
          invisible: audioData == null || waveformPeaks === null,
        })}
      >
        <WavesurferPlayer
          autoplay={false}
          backend="MediaElement"
          height={PLAYER_HEIGHT}
          url={NO_AUDIO_URL}
          onError={handleError}
          onInit={handleInit}
          onLoading={handleLoading}
          onPause={() => onPause?.()}
          onPlay={() => onPlay?.()}
          onReady={handleReady}
        />
      </div>
    </div>
  );
};
