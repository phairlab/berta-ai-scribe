import { useEffect, useRef, useState } from "react";

import clsx from "clsx";

import { Button } from "@nextui-org/button";

import { WaitMessageSpinner } from "@/core/wait-message-spinner";

import { SampleRecordingSelector } from "@/features/sample-recordings/sample-recording-selector";

import { AudioFileBrowseButton } from "./audio-file-browse-button";
import { AudioRecorder } from "./audio-recorder";
import { AudioTrackInfo } from "./audio-track-info";
import { PlayPauseButton } from "./play-pause-button";
import { RecordButton } from "./record-button";
import {
  WavesurferWidget,
  WavesurferWidgetControls,
} from "./wavesurfer-widget";

type AIScribeAudioProps = {
  audio: string | null;
  waveformPeaks: number[] | null;
  audioTitle?: string;
  isSaving: boolean;
  isSaveFailed: boolean;
  onAudioFile: (audioData: File) => void;
  onRecoverRecording: (audioData: File) => void;
  onReset?: () => void;
};

export const AIScribeAudio = ({
  audio,
  waveformPeaks,
  audioTitle,
  isSaving,
  isSaveFailed,
  onAudioFile,
  onReset,
}: AIScribeAudioProps) => {
  const playerControls = useRef<WavesurferWidgetControls | null>(null);

  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingError(null);
    setIsPlaying(false);
    setDuration(null);
  }, [audio]);

  const handleAudioPlayerInit = (controls: WavesurferWidgetControls) => {
    playerControls.current = controls;
  };

  const handleRecordingFinished = (recording: File | null) => {
    setIsRecording(false);
    setIsRecordingPaused(false);

    if (recording) {
      onAudioFile(recording);
    }
  };

  const toggleRecording = async () => {
    setRecordingError(null);

    if (isRecording) {
      setIsRecordingPaused(!isRecordingPaused);
    } else {
      setIsRecording(true);
    }
  };

  const endRecording = () => {
    setRecordingError(null);
    setIsRecording(false);
    setIsRecordingPaused(false);
  };

  const reset = () => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingError(null);
    setIsPlaying(false);
    setDuration(null);

    onReset?.();
  };

  return (
    <div className="flex flex-col-reverse md:flex-row gap-2 md:gap-4">
      <div className="flex flex-row gap-2 md:gap-4 justify-center w-full">
        {audio || isSaving || isSaveFailed ? (
          <PlayPauseButton
            action={isPlaying ? "pause" : "play"}
            isDisabled={isPlayerLoading || isSaving || isSaveFailed}
            onClick={playerControls.current?.playPause}
          />
        ) : (
          <RecordButton
            isDisabled={false}
            isRecording={isRecording}
            isRecordingPaused={isRecordingPaused}
            onClick={toggleRecording}
          />
        )}
        <div className="w-full flex flex-col gap-2">
          {isSaveFailed && (
            <div className="w-full h-[70px] flex justify-center items-center border rounded-lg border-zinc-100 dark:border-zinc-900">
              <span className="text-red-500 text-center font-semibold">
                An Error Occurred While <br />
                Saving the Recording
              </span>
            </div>
          )}
          {isSaving && (
            <div className="mt-3">
              <WaitMessageSpinner>Saving</WaitMessageSpinner>
            </div>
          )}
          {audio === null && !isRecording && !isSaving && !isSaveFailed && (
            <div className="w-full h-[70px] flex justify-center items-center border rounded-lg border-zinc-100 dark:border-zinc-900">
              <div className="text-center text-zinc-500 md:mb-2">
                {recordingError ? (
                  recordingError ===
                  "Recording is not supported in this browser" ? (
                    <span className="text-red-500">
                      Recording is not Supported <br />
                      in this Browser
                    </span>
                  ) : (
                    <span className="text-red-500">
                      An Error Occurred While <br />
                      Attempting to Record
                    </span>
                  )
                ) : (
                  <span>
                    Start Recording or <br />
                    Select a File
                  </span>
                )}
              </div>
            </div>
          )}
          <AudioRecorder
            isPaused={isRecordingPaused}
            isRecording={isRecording}
            onAudioFinalized={(audio) => handleRecordingFinished(audio)}
            onError={(error) => {
              setRecordingError(error.message);
              setIsRecording(false);
              setIsRecordingPaused(false);
            }}
          />
          <WavesurferWidget
            audioSource={audio ?? null}
            isHidden={!audio || isRecording || isSaving}
            waveformPeaks={waveformPeaks}
            onDurationChanged={(seconds) => {
              if (duration != seconds) {
                setDuration(seconds);
              }
            }}
            onInit={handleAudioPlayerInit}
            onLoading={() => setIsPlayerLoading(true)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onReady={() => setIsPlayerLoading(false)}
          />
          <div
            className={clsx(
              "mx-2 transition-opacity duration-500 ease-in-out",
              isPlayerLoading ? "invisible opacity-0" : "opacity-100",
              (!audio || isRecording) && "hidden",
            )}
          >
            <AudioTrackInfo
              audioTitle={audioTitle ?? "Audio Recording"}
              duration={duration}
              isRecording={isRecording}
              isRecordingPaused={isRecordingPaused}
            />
          </div>
        </div>
      </div>
      {audio === null && !isRecording && !isSaving && !isSaveFailed ? (
        <div className="flex flex-row md:flex-col gap-2 md:gap-1 md:h-[70px] justify-end items-center md:items-start">
          <AudioFileBrowseButton onFileSelected={onAudioFile} />
          <SampleRecordingSelector onFileSelected={onAudioFile} />
        </div>
      ) : (
        <div className="flex justify-end md:mt-[9px] md:mb-auto">
          {isRecording ? (
            <Button size="sm" onClick={endRecording}>
              Save Recording
            </Button>
          ) : (
            <Button className="sm:hidden" size="sm" onClick={reset}>
              New Recording
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
