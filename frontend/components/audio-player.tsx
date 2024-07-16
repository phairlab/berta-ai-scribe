"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@nextui-org/button";
import WavesurferPlayer from "@wavesurfer/react";
import Wavesurfer from "wavesurfer.js";
import HoverPlugin from "wavesurfer.js/dist/plugins/hover";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline";

export const AudioPlayer = (props: { audioUrl: string }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme, setTheme } = useTheme();
  const [wavesurfer, setWavesurfer] = useState<Wavesurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const timelineOptions = {
    style: {
      color: "#a1a1aa",
      accentColor: theme === "light" ? "#d4d4d8" : "#71717a",
    },
  };

  const onReady = (ws: Wavesurfer) => {
    ws.registerPlugin(HoverPlugin.create());
    ws.registerPlugin(TimelinePlugin.create(timelineOptions));
    setWavesurfer(ws);
    setIsPlaying(false);
  };

  const onPlayPause = () => {
    if (wavesurfer) {
      wavesurfer.playPause();
    }
  };

  return (
    <div className="flex flex-row gap-4 items-center">
      <Button
        className={`w-auto ${!wavesurfer ? "hidden" : ""}`}
        onClick={onPlayPause}
      >
        {isPlaying ? "Pause" : "Play"}
      </Button>
      <div className="w-full">
        <WavesurferPlayer
          barWidth={0.5}
          cursorColor="#71717a"
          cursorWidth={1}
          fillParent={true}
          height={70}
          progressColor={theme === "light" ? "#a1a1aa" : "#52525b"}
          url={props.audioUrl}
          waveColor="#60a5fa"
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onReady={onReady}
        />
      </div>
    </div>
  );
};
