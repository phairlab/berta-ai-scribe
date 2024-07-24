"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@nextui-org/button";

import { AudioTrackPlayer, AudioPlayerControls } from "./audio-track-player";
import { AudioTrackInfo } from "./audio-track-info";
import { PlayPauseButton } from "./play-pause-button";
import { RecordButton } from "./record-button";
import { AudioFileSelect } from "./audio-file-select";

type AudioSourceProps = {
  onAudioDataChanged?: (audioUrl: Blob | null) => void;
};

export const AudioSource = ({ onAudioDataChanged }: AudioSourceProps) => {
  const audioControls = useRef<AudioPlayerControls | null>(null);

  const [audioData, setAudioData] = useState<Blob | null>(null);
  const [audioTitle, setAudioTitle] = useState<string | null>(null);
  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    onAudioDataChanged?.(audioData);
  }, [audioData]);

  const handleAudioPlayerInit = (controls: AudioPlayerControls) => {
    audioControls.current = controls;
    setIsPlayerInitialized(true);
  };

  const handleFileSelected = (audioData: Blob, audioTitle: string) => {
    setAudioData(audioData);
    setAudioTitle(audioTitle);
  };

  const handleRecordingFinished = (recordingData: Blob) => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setAudioData(recordingData);
    setAudioTitle("RECORDED AUDIO");
  };

  const toggleRecording = async () => {
    if (isRecording) {
      audioControls.current?.togglePauseRecording();
    } else {
      audioControls.current?.startRecording();
    }
  };

  const reset = () => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setIsPlaying(false);
    setDuration(null);
    setAudioTitle(null);
    setAudioData(null);
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
            onClick={toggleRecording}
          />
        )}
        <div className="w-full relative flex flex-col gap-2">
          {!audioData && !isRecording && (
            <div className="absolute inset-0 z-20 bg-white dark:bg-black">
              <div className="w-full h-[70px] flex justify-center items-center border rounded-lg border-zinc-100 dark:border-zinc-900">
                <div className="text-center text-zinc-500 sm:mb-2">
                  Start Recording or <br className="sm:hidden" /> Select a File
                </div>
              </div>
            </div>
          )}
          <div className={`w-full ${isPlayerLoading ? "invisible" : ""}`}>
            <AudioTrackPlayer
              audioData={audioData}
              height={50}
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
          <div className={`mx-2 ${isPlayerLoading ? "invisible" : ""}`}>
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
        <AudioFileSelect onFileSelected={handleFileSelected} />
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
