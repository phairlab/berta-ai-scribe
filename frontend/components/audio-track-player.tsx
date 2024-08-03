"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import WavesurferPlayer from "@wavesurfer/react";
import Wavesurfer, { WaveSurferOptions } from "wavesurfer.js";
import HoverPlugin from "wavesurfer.js/dist/plugins/hover";
import TimelinePlugin, {
  TimelinePluginOptions,
} from "wavesurfer.js/dist/plugins/timeline";
import RecordPlugin, {
  RecordPluginOptions,
} from "wavesurfer.js/dist/plugins/record";

import { AnimatePulse } from "./animate-pulse";

import { tailwindColors } from "@/utility/display";

/** Set of controls for audio playback and recording. */
export interface AudioPlayerControls {
  /** Toggle audio playback. */
  playPause: () => void;

  /** Activate the browser microphone and start recording audio. */
  startRecording: () => Promise<void>;

  /** Toggles pausing of a recording in progress. */
  togglePauseRecording: () => void;

  /** Stops and finalizes audio recording. */
  endRecording: () => void;
}

class Controls implements AudioPlayerControls {
  public constructor(
    private wavesurfer: Wavesurfer,
    private recorder: RecordPlugin,
  ) {}

  public playPause = () => {
    this.wavesurfer.playPause();
  };

  public startRecording = async () => {
    if (this.recorder && !this.recorder.isRecording()) {
      const devices = await RecordPlugin.getAvailableAudioDevices();

      if (devices.length == 0) {
        // TODO: Handle no mic.
        return;
      }

      await this.recorder.startMic({ deviceId: devices[0].deviceId });
      await this.recorder.startRecording({
        deviceId: devices[0].deviceId,
      });
    }
  };

  public togglePauseRecording = () => {
    if (this.recorder.isRecording()) {
      this.recorder.pauseRecording();
    } else if (this.recorder.isPaused()) {
      this.recorder.resumeRecording();
    }
  };

  public endRecording = () => {
    if (this.recorder.isRecording() || this.recorder.isPaused()) {
      this.recorder.stopRecording();
      this.recorder.stopMic();
    }
  };
}

type AudioTrackPlayerProps = {
  audioData: Blob | null;
  height: number;
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
};

export const AudioTrackPlayer = (props: AudioTrackPlayerProps) => {
  const NO_AUDIO_URL = "no-audio.mp3";

  const { theme } = useTheme();
  const wavesurfer = useRef<Wavesurfer | null>(null);
  const recorder = useRef<RecordPlugin | null>(null);
  const loadedAudioData = useRef<Blob | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const [options, setOptions] = useState<Partial<WaveSurferOptions>>({
    height: props.height - 20,
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
    normalize: true,
    interact: false,
    autoplay: false,
  });

  const timelineOptions: TimelinePluginOptions = {
    style: { color: tailwindColors["zinc-400"] },
  };

  const recorderOptions: RecordPluginOptions = {
    scrollingWaveform: true,
    scrollingWaveformWindow: 15,
    renderRecordedAudio: false,
    mimeType: "audio/webm",
  };

  const handleInit = async (ws: Wavesurfer) => {
    wavesurfer.current = ws;
    recorder.current = configureRecorder();

    ws.setOptions(options);

    if (props.audioData) {
      await ws.loadBlob(props.audioData);
    }

    loadedAudioData.current = props.audioData;

    ws.registerPlugin(HoverPlugin.create());
    ws.registerPlugin(TimelinePlugin.create(timelineOptions));
    ws.registerPlugin(recorder.current);
  };

  const handleReady = (_ws: Wavesurfer, seconds: number) => {
    // Report initialized the first time the player is ready.
    if (!isInitialized) {
      setIsInitialized(true);
      props.onInit?.(new Controls(wavesurfer.current!, recorder.current!));
    }

    setDuration(seconds);
    setIsReady(true);
    props.onReady?.();
  };

  const handleDestroy = () => {
    recorder.current?.unAll();
    recorder.current?.destroy();
  };

  // Handle changes to audio source.
  useEffect(() => {
    if (isInitialized && props.audioData !== loadedAudioData.current) {
      setIsRecording(false);
      setIsRecordingPaused(false);
      setIsReady(false);
      setDuration(null);

      wavesurfer.current?.stop();

      if (props.audioData) {
        wavesurfer.current?.loadBlob(props.audioData);
      }

      loadedAudioData.current = props.audioData;
    }
  }, [props.audioData]);

  // Handle changes to Wavesurfer options.
  useEffect(() => {
    wavesurfer.current?.setOptions(options);
  }, [options]);

  // Handle changes to player interactive state.
  useEffect(() => {
    setOptions({
      ...options,
      interact: isReady && loadedAudioData.current != null,
    });
  }, [isReady, isRecording]);

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

  // Handle changes to player display height.
  useEffect(() => {
    setOptions({
      ...options,
      height: props.height,
    });
  }, [props.height]);

  // Handle changes to duration.
  // Doing this here will ensure the event only fires on actual changes.
  useEffect(() => {
    props.onDurationChanged?.(duration);
  }, [duration]);

  /** Activate and configure recording functionality for the player. */
  const configureRecorder = (): RecordPlugin => {
    const recordPlugin = RecordPlugin.create(recorderOptions);

    recordPlugin.on("record-start", () => {
      setIsRecording(true);
      props.onRecordingStarted?.();
    });

    recordPlugin.on("record-pause", (_blob) => {
      setIsRecordingPaused(true);
      props.onRecordingPaused?.();
    });

    recordPlugin.on("record-resume", () => {
      setIsRecordingPaused(false);
      props.onRecordingResumed?.();
    });

    recordPlugin.on("record-end", (blob) => {
      setIsRecording(false);
      setIsRecordingPaused(false);

      const file = new File([blob], "recording.webm");

      props.onRecordingEnded?.(file);
    });

    recordPlugin.on("record-progress", (milliseconds) => {
      setDuration(milliseconds / 1000);
    });

    return recordPlugin;
  };

  return (
    <AnimatePulse isActive={isRecording && isRecordingPaused}>
      <div
        className={`w-full flex flex-col h-[${props.height}px] ${!loadedAudioData.current || !isReady ? "pointer-events-none" : ""}`}
      >
        <WavesurferPlayer
          height={props.height - 20}
          url={NO_AUDIO_URL}
          onDestroy={handleDestroy}
          onInit={handleInit}
          onLoad={() => props.onLoading?.()}
          onPause={() => props.onPause?.()}
          onPlay={() => props.onPlay?.()}
          onReady={handleReady}
        />
      </div>
    </AnimatePulse>
  );
};
