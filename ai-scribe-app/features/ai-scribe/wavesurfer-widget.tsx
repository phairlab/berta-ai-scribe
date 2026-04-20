"use client";

import { useEffect, useRef, useState } from "react";

import WavesurferPlayer from "@wavesurfer/react";
import clsx from "clsx";
import HoverPlugin from "wavesurfer.js/dist/plugins/hover";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline";
import Wavesurfer, { WaveSurferOptions } from "wavesurfer.js/dist/wavesurfer";

import { useTheme } from "next-themes";

import { Progress } from "@heroui/progress";

import { AudioSource } from "@/core/types";
import { tailwindColors } from "@/utility/constants";

export type WavesurferWidgetControls = {
  playPause: () => void;
};

type WavesurferWidgetProps = {
  audioSource: AudioSource | null;
  isHidden: boolean;
  onInit?: (controls: WavesurferWidgetControls) => void;
  onLoading?: () => void;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
};

export const WavesurferWidget = ({
  audioSource,
  isHidden,
  onInit,
  onLoading,
  onReady,
  onPlay,
  onPause,
}: WavesurferWidgetProps) => {
  const NO_AUDIO_URL = "no-audio.mp3";
  const PLAYER_HEIGHT = 70;

  const { theme } = useTheme();
  const wavesurfer = useRef<Wavesurfer | null>(null);

  const [loadedAudio, setLoadedAudio] = useState<AudioSource | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>();

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

  const handleReady = (_: Wavesurfer, _seconds: number) => {
    if (!isInitialized) {
      setIsInitialized(true);
      onInit?.({ playPause });
    }

    setTimeout(() => {
      setIsReady(true);
      onReady?.();
    }, 0);
  };

  const handleError = (_: Wavesurfer, error: Error) => {
    if (error && error.message) {
      setError(error.message);
    }
  };

  // React to requested change to audio source.
  useEffect(() => {
    if (isInitialized && audioSource?.url !== loadedAudio?.url) {
      wavesurfer.current?.stop();

      setIsReady(false);
      setError(undefined);
      onLoading?.();

      setLoadedAudio(audioSource);
    }
  }, [audioSource, isInitialized]);

  // React to accepted change in audio source.
  useEffect(() => {
    if (loadedAudio) {
      wavesurfer.current?.load(
        loadedAudio.url,
        [loadedAudio.waveformPeaks ?? [0]],
        loadedAudio.duration / 1000,
      );
    } else {
      wavesurfer.current?.load(NO_AUDIO_URL, [[0]], 0);
    }
  }, [loadedAudio]);

  useEffect(() => {
    wavesurfer.current?.setOptions(options);
  }, [options]);

  useEffect(() => {
    setOptions({
      ...options,
      interact: isReady && loadedAudio != null,
    });
  }, [isReady]);

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
          "z-10 absolute flex w-full justify-center mt-[22px] transition-opacity duration-500 ease-in-out",
          !!error || isReady ? "hidden opacity-0" : "opacity-100",
        ])}
      >
        <div className="flex flex-row gap-2 items-center justify-start w-[80%]">
          <Progress
            aria-label="Loading"
            className="mt-1"
            classNames={{ indicator: "bg-zinc-400 dark:bg-zinc-600" }}
            isIndeterminate={true}
            size="sm"
          />
        </div>
      </div>
      <div
        className={clsx([
          {
            "pointer-events-none": !error && (!loadedAudio || !isReady),
            hidden: !!error,
          },
          "transition-opacity duration-250 ease-in-out",
          isReady ? "opacity-100" : "opacity-0",
          (!isReady ||
            audioSource == null ||
            audioSource.waveformPeaks === null) &&
            "invisible",
        ])}
      >
        <WavesurferPlayer
          autoplay={false}
          backend="MediaElement"
          duration={0}
          height={PLAYER_HEIGHT}
          url={NO_AUDIO_URL}
          onError={handleError}
          onInit={handleInit}
          onPause={() => onPause?.()}
          onPlay={() => onPlay?.()}
          onReady={handleReady}
        />
      </div>
    </div>
  );
};
