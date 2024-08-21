import { useRef, useState } from "react";
import { Button } from "@nextui-org/button";

import { AudioTrackPlayer, AudioPlayerControls } from "./audio-track-player";
import { AudioTrackInfo } from "./audio-track-info";
import { PlayPauseButton } from "./play-pause-button";
import { RecordButton } from "./record-button";
import { AudioFileBrowseButton } from "./audio-file-browse-button";
import { AudioSampleSelect } from "./audio-sample-select";

type AIScribeAudioSourceProps = {
  onAudioDataChanged?: (audioUrl: File | null) => void;
  onReset?: () => void;
};

export const AIScribeAudioSource = (props: AIScribeAudioSourceProps) => {
  const audioControls = useRef<AudioPlayerControls | null>(null);

  const [audioData, setAudioData] = useState<File | null>(null);
  const [audioTitle, setAudioTitle] = useState<string | null>(null);
  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const setAudioTrack = (data: File | null, title: string | null) => {
    setAudioTitle(title);
    setAudioData(data);
    props.onAudioDataChanged?.(data);
  };

  const handleAudioPlayerInit = (controls: AudioPlayerControls) => {
    audioControls.current = controls;
    setIsPlayerInitialized(true);
  };

  const handleFileSelected = (titlePrefix: string) => (audioFile: File) => {
    setAudioTrack(audioFile, `${titlePrefix}/${audioFile.name}`);
  };

  const handleRecordingFinished = (recording: File) => {
    setIsRecording(false);
    setIsRecordingPaused(false);

    setAudioTrack(recording, `Recorded Audio (${recording.type})`);
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

    setAudioTrack(null, null);

    props.onReset?.();
  };

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 max-w-full">
      <div className="flex flex-row gap-2 sm:gap-4 justify-center w-full">
        {audioData ? (
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
          {!audioData && !isRecording && (
            <div className="w-full h-[70px] flex justify-center items-center border rounded-lg border-zinc-100 dark:border-zinc-900">
              <div className="text-center text-zinc-500 sm:mb-2">
                {recordingError ? (
                  <span className="text-red-500">{recordingError}</span>
                ) : (
                  <span>
                    Start Recording or <br className="sm:hidden" />
                    Select a File
                  </span>
                )}
              </div>
            </div>
          )}
          <div className={`w-full ${isPlayerLoading ? "invisible" : ""}`}>
            <AudioTrackPlayer
              audioData={audioData}
              isHidden={!audioData && !isRecording}
              onDurationChanged={(seconds) => setDuration(seconds)}
              onInit={handleAudioPlayerInit}
              onLoading={() => setIsPlayerLoading(true)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onReady={() => setIsPlayerLoading(false)}
              onRecordingEnded={handleRecordingFinished}
              onRecordingPaused={() => setIsRecordingPaused(true)}
              onRecordingResumed={() => setIsRecordingPaused(false)}
              onRecordingStarted={() => setIsRecording(true)}
            />
          </div>
          <div
            className={`mx-2 ${isPlayerLoading ? "invisible" : ""} ${!audioData && !isRecording ? "hidden" : ""}`}
          >
            <AudioTrackInfo
              audioTitle={audioTitle}
              duration={duration}
              isRecording={isRecording}
              isRecordingPaused={isRecordingPaused}
            />
          </div>
        </div>
      </div>
      {!audioData && !isRecording ? (
        <div className="flex flex-row sm:flex-col gap-2 sm:gap-1 sm:h-[70px] justify-end items-center sm:items-start">
          <AudioFileBrowseButton
            onFileSelected={handleFileSelected("local-device")}
          />
          <AudioSampleSelect
            onFileSelected={handleFileSelected("sample-recordings")}
          />
        </div>
      ) : (
        <div className="flex justify-end sm:mt-[9px] sm:mb-auto">
          {isRecording ? (
            <Button size="sm" onClick={audioControls.current?.endRecording}>
              Finish Recording
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
