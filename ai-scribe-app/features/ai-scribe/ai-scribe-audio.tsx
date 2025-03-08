import { useEffect, useMemo, useRef, useState } from "react";

import clsx from "clsx";

import { Button } from "@heroui/button";

import { SampleRecordingSelector } from "@/core/sample-recording-selector";
import { AudioSource, Encounter } from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";

import { AppendRecordingButton } from "./append-recording-button";
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
  encounter: Encounter | null;
  isSaving: boolean;
  isSaveFailed: boolean;
  onAudioFile: (audioData: File, encounterId?: string) => void;
  onRecordingStarted?: () => void;
  onRecordingFinished?: () => void;
  onReset?: () => void;
  onSampleFileSelected?: () => void;
};

export const AIScribeAudio = ({
  encounter,
  isSaving,
  isSaveFailed,
  onAudioFile,
  onRecordingStarted,
  onRecordingFinished,
  onReset,
  onSampleFileSelected,
}: AIScribeAudioProps) => {
  const playerControls = useRef<WavesurferWidgetControls | null>(null);
  const targetEncounter = useRef<Encounter | null>(null);

  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isConfirmAbandon, setConfirmAbandon] = useState(false);
  const [isAbandonRecording, setIsAbandonRecording] = useState(false);

  const currentId = useRef<string>(undefined);

  const audioSource = useMemo(() => {
    const recording = encounter?.recording;

    if (encounter && recording && recording.duration) {
      return {
        id: encounter.id,
        title: encounter.label ?? encounter.autolabel,
        url: `/api/recordings/${recording.id}/download`,
        waveformPeaks: recording.waveformPeaks,
        duration: recording.duration,
      } satisfies AudioSource as AudioSource;
    } else {
      return null;
    }
  }, [encounter]);

  const title =
    audioSource && audioSource.title !== audioSource.id
      ? audioSource.title
      : null;

  useEffect(() => {
    if (audioSource?.id !== currentId.current) {
      currentId.current = audioSource?.id;
      setIsRecording(false);
      setIsRecordingPaused(false);
      setRecordingError(null);
      setIsPlaying(false);
    }
  }, [audioSource]);

  const handleAudioPlayerInit = (controls: WavesurferWidgetControls) => {
    playerControls.current = controls;
  };

  const handleRecordingFinished = (recording: File | null) => {
    onRecordingFinished?.();

    setIsRecording(false);
    setIsRecordingPaused(false);

    if (recording && !isAbandonRecording) {
      onAudioFile(recording, targetEncounter.current?.id);
      targetEncounter.current = null;
    }

    if (isAbandonRecording) {
      setIsAbandonRecording(false);
    }
  };

  const toggleRecording = () => {
    setRecordingError(null);

    if (isRecording) {
      setIsRecordingPaused(!isRecordingPaused);
    } else {
      onRecordingStarted?.();
      targetEncounter.current = encounter;
      setIsRecording(true);
    }
  };

  const endRecording = () => {
    setRecordingError(null);
    setIsRecording(false);
    setIsRecordingPaused(false);
  };

  const abandonRecording = () => {
    setConfirmAbandon(false);
    setIsAbandonRecording(true);
    endRecording();
  };

  const reset = () => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingError(null);
    setIsPlaying(false);

    onReset?.();
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-2 lg:gap-4">
      {title && (
        <div
          className={clsx(
            "sm:hidden grow line-clamp-2 mt-4",
            "text-zinc-400 dark:text-zinc-500",
            "text-xs text-balance text-ellipse text-center",
          )}
          title={title}
        >
          {title}
        </div>
      )}
      <div className="flex flex-row gap-2 lg:gap-4 justify-center w-full">
        {!isRecording && (audioSource || isSaving || isSaveFailed) ? (
          <PlayPauseButton
            action={isPlaying ? "pause" : "play"}
            isDisabled={isPlayerLoading || isSaving || isSaveFailed}
            onPress={playerControls.current?.playPause}
          />
        ) : (
          <RecordButton
            isDisabled={false}
            isRecording={isRecording}
            isRecordingPaused={isRecordingPaused}
            onPress={toggleRecording}
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
          {audioSource === null &&
            !isRecording &&
            !isSaving &&
            !isSaveFailed && (
              <div className="w-full h-[70px] flex justify-center items-center border rounded-lg border-zinc-100 dark:border-zinc-900">
                <div className="text-center text-zinc-500 lg:mb-2">
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
            audioSource={audioSource ?? null}
            isHidden={!audioSource || isRecording || isSaving}
            onInit={handleAudioPlayerInit}
            onLoading={() => setIsPlayerLoading(true)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onReady={() => setIsPlayerLoading(false)}
          />
          <div
            className={clsx(
              "mx-2 transition-opacity duration-250 ease-in-out",
              isPlayerLoading ? "invisible opacity-0" : "opacity-100",
              (!audioSource || isRecording || isSaving) && "hidden",
            )}
          >
            <AudioTrackInfo
              audioId={audioSource ? audioSource.id : "Audio Recording"}
              audioTitle={
                audioSource && audioSource.title !== audioSource.id
                  ? audioSource.title
                  : null
              }
              duration={audioSource ? audioSource.duration / 1000 : null}
              isRecording={isRecording}
              isRecordingPaused={isRecordingPaused}
            />
          </div>
        </div>
      </div>
      {audioSource === null && !isRecording && !isSaving && !isSaveFailed ? (
        <div className="flex flex-row lg:flex-col gap-2 lg:gap-1 lg:h-[70px] justify-end items-center lg:items-start">
          <AudioFileBrowseButton onFileSelected={onAudioFile} />
          <SampleRecordingSelector
            onFileDownloaded={onAudioFile}
            onFileSelected={onSampleFileSelected}
          />
        </div>
      ) : (
        <div className="flex justify-end">
          {isRecording ? (
            isConfirmAbandon ? (
              <div className="flex flex-row lg:flex-col gap-2 lg:gap-1 lg:h-[70px] justify-end items-center lg:items-stretch">
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => setConfirmAbandon(false)}
                >
                  No, Keep Recording
                </Button>
                <Button
                  className="text-red-600 dark:text-rose-500"
                  size="sm"
                  variant="ghost"
                  onPress={abandonRecording}
                >
                  Discard Recording
                </Button>
              </div>
            ) : (
              <div className="flex flex-row lg:flex-col gap-2 lg:gap-1 lg:h-[70px] justify-end items-center lg:items-stretch">
                <Button size="sm" variant="ghost" onPress={endRecording}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setConfirmAbandon(true)}
                >
                  Cancel
                </Button>
              </div>
            )
          ) : (
            <div className="flex flex-row gap-2 justify-center items-center">
              <Button className="sm:hidden" size="sm" onPress={reset}>
                New Recording
              </Button>
              <AppendRecordingButton
                isDisabled={isPlayerLoading || isSaving || isSaveFailed}
                onPress={toggleRecording}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
