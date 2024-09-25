import { useEffect, useRef, useState } from "react";
import { Button } from "@nextui-org/button";

import { AudioTrackPlayer, AudioPlayerControls } from "./audio-track-player";
import { AudioTrackInfo } from "./audio-track-info";
import { PlayPauseButton } from "./play-pause-button";
import { RecordButton } from "./record-button";
import { AudioFileBrowseButton } from "./audio-file-browse-button";
import { AudioSampleSelect } from "./audio-sample-select";

type AIScribeAudioSourceProps = {
  audio: string | File | null;
  audioTitle?: string;
  onAudioFile: (audioData: File) => void;
  onRecoverRecording: (audioData: File) => void;
  onReset?: () => void;
};

export const AIScribeAudioSource = (props: AIScribeAudioSourceProps) => {
  const audioControls = useRef<AudioPlayerControls | null>(null);
  const recordingInProgress = useRef(false);

  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    // Done as a bug fix.
    // Something was blocking the isRecording value from updating at the normal time.
    recordingInProgress.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingError(null);
    setIsPlaying(false);
    setDuration(null);
  }, [props.audio]);

  const handleAudioPlayerInit = (controls: AudioPlayerControls) => {
    audioControls.current = controls;
    setIsPlayerInitialized(true);
  };

  const handleRecordingFinished = (recording: File) => {
    if (recordingInProgress.current) {
      setIsRecording(false);
      setIsRecordingPaused(false);

      props.onAudioFile(recording);
    } else {
      props.onRecoverRecording(recording);
    }
  };

  const toggleRecording = async () => {
    setRecordingError(null);

    if (isRecording) {
      audioControls.current?.togglePauseRecording();
    } else {
      try {
        await audioControls.current?.startRecording();
      } catch (e: unknown) {
        setRecordingError((e as Error).message);
      }
    }
  };

  const reset = () => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingError(null);
    setIsPlaying(false);
    setDuration(null);

    props.onReset?.();
  };

  return (
    <div className="flex flex-col-reverse md:flex-row gap-2 md:gap-4 max-w-full">
      <div className="flex flex-row gap-2 md:gap-4 justify-center w-full">
        {props.audio ? (
          <PlayPauseButton
            action={isPlaying ? "pause" : "play"}
            isDisabled={isPlayerLoading}
            onClick={audioControls.current?.playPause}
          />
        ) : (
          <RecordButton
            isDisabled={!isPlayerInitialized}
            isRecording={isRecording}
            isRecordingPaused={isRecordingPaused}
            onClick={toggleRecording}
          />
        )}
        <div className="w-full flex flex-col gap-2">
          {!props.audio && !isRecording && (
            <div className="w-full h-[70px] flex justify-center items-center border rounded-lg border-zinc-100 dark:border-zinc-900">
              <div className="text-center text-zinc-500 md:mb-2">
                {recordingError ? (
                  <span className="text-red-500">{recordingError}</span>
                ) : (
                  <span>
                    Start Recording or <br />
                    Select a File
                  </span>
                )}
              </div>
            </div>
          )}
          <AudioTrackPlayer
            audioData={props.audio ?? null}
            isHidden={!props.audio && !isRecording}
            onDurationChanged={(seconds) => setDuration(seconds)}
            onInit={handleAudioPlayerInit}
            onLoading={() => setIsPlayerLoading(true)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onReady={() => setIsPlayerLoading(false)}
            onRecordingEnded={(audio) => handleRecordingFinished(audio)}
            onRecordingPaused={() => setIsRecordingPaused(true)}
            onRecordingResumed={() => setIsRecordingPaused(false)}
            onRecordingStarted={() => setIsRecording(true)}
          />
          <div
            className={`mx-2 ${isPlayerLoading ? "invisible" : ""} ${!props.audio && !isRecording ? "hidden" : ""}`}
          >
            <AudioTrackInfo
              audioTitle={props.audioTitle ?? "Audio Recording"}
              duration={duration}
              isRecording={isRecording}
              isRecordingPaused={isRecordingPaused}
            />
          </div>
        </div>
      </div>
      {!props.audio && !isRecording ? (
        <div className="flex flex-row md:flex-col gap-2 md:gap-1 md:h-[70px] justify-end items-center md:items-start">
          <AudioFileBrowseButton onFileSelected={props.onAudioFile} />
          <AudioSampleSelect onFileSelected={props.onAudioFile} />
        </div>
      ) : (
        <div className="flex justify-end md:mt-[9px] md:mb-auto">
          {isRecording ? (
            <Button size="sm" onClick={audioControls.current?.endRecording}>
              Save Recording
            </Button>
          ) : (
            <Button size="sm" onClick={reset}>
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
