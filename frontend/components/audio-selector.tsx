"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@nextui-org/button";
import { Select, SelectItem } from "@nextui-org/select";

import { AudioPlayer, AudioPlayerControls } from "./audio-player";
import { AudioTrackInfo } from "./audio-track-info";
import { MicrophoneIcon, PauseIcon, PlayIcon } from "./icons";

import { useData } from "@/hooks/useData";

type AudioSample = {
  name: string;
  path: string;
};

type AudioSelectorProps = {
  onAudioDataChanged?: (audioUrl: Blob | null) => void;
};

export const AudioSelector = ({ onAudioDataChanged }: AudioSelectorProps) => {
  const audioControls = useRef<AudioPlayerControls | null>(null);
  const inputFile = useRef<HTMLInputElement>(null);

  const [audioData, setAudioData] = useState<Blob | null>(null);
  const [audioTitle, setAudioTitle] = useState<string | null>(null);
  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const { data: audioSamples, loading: isLoadingAudioSamples } = useData<
    AudioSample[]
  >("audio-samples", []);

  useEffect(() => {
    onAudioDataChanged?.(audioData);
  }, [audioData]);

  const handleAudioPlayerInit = (controls: AudioPlayerControls) => {
    audioControls.current = controls;
    setIsPlayerInitialized(true);
  };

  const handleRecordingFinished = (recordingData: Blob) => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setAudioData(recordingData);
    setAudioTitle("RECORDED AUDIO");
  };

  const handleFileSelected = (e: React.FormEvent<HTMLInputElement>) => {
    if (e.currentTarget.files) {
      const file = e.currentTarget.files[0];

      var reader = new FileReader();

      reader.onload = (ev) => {
        const filename = file.name;
        var data = new Blob([new Uint8Array(ev.target?.result as ArrayBuffer)]);

        setAudioData(data);
        setAudioTitle(`/device/${filename}`);
      };

      reader.onerror = (_ev) => {
        // TODO: Handle file read error.
      };

      reader.readAsArrayBuffer(file);
    }
  };

  const handleSampleAudioSelected = async (samples: any) => {
    const sampleUrl = (samples as Set<string>).values().next().value;
    const data = await fetch(sampleUrl).then((r) => r.blob());

    setAudioData(data);
    setAudioTitle(sampleUrl);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      audioControls.current?.togglePauseRecording();
    } else {
      audioControls.current?.startRecording();
    }
  };

  const finishRecording = () => {
    if (isRecording) {
      audioControls.current?.endRecording();
    }
  };

  const reset = () => {
    setIsRecording(false);
    setIsRecordingPaused(false);
    setIsPlaying(false);
    setAudioData(null);
  };

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 max-w-full">
      <div className="flex flex-row gap-2 sm:gap-4 justify-center w-full">
        {audioData ? (
          <Button
            isIconOnly
            className={`h-[40px] w-[64px] mt-[6px] mb-auto ${!isPlayerInitialized ? "invisible" : ""}`}
            isDisabled={isPlayerLoading}
            onClick={() => audioControls.current?.playPause()}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </Button>
        ) : (
          <Button
            isIconOnly
            className="h-[64px] w-[64px] my-[3px] flex-none "
            isDisabled={!isPlayerInitialized}
            radius="full"
            size="lg"
            variant="shadow"
            onClick={toggleRecording}
          >
            <MicrophoneIcon size={40} />
          </Button>
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
            <AudioPlayer
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
      {isRecording ? (
        <div className="flex justify-end">
          <Button
            className="sm:mt-[9px] sm:mb-auto"
            size="sm"
            onClick={finishRecording}
          >
            Finish Recording
          </Button>
        </div>
      ) : audioData ? (
        <div className="flex justify-end">
          <Button className="sm:mt-[9px] sm:mb-auto" size="sm" onClick={reset}>
            Reset
          </Button>
        </div>
      ) : (
        <div className="flex flex-row sm:flex-col gap-2 sm:gap-1 sm:h-[70px] justify-end items-center sm:items-start">
          <Button
            className="w-fit text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800"
            size="sm"
            onClick={() => inputFile.current?.click()}
          >
            Browse ...
          </Button>
          <input
            ref={inputFile}
            aria-hidden="true"
            aria-label="audio-input-file"
            className="hidden"
            type="file"
            onChange={handleFileSelected}
          />
          <Select
            className="w-36"
            isLoading={isLoadingAudioSamples}
            items={audioSamples}
            placeholder="Use a Sample"
            selectedKeys={[]}
            selectionMode="single"
            size="sm"
            onSelectionChange={handleSampleAudioSelected}
          >
            {(audioSample) => (
              <SelectItem key={audioSample.path}>{audioSample.name}</SelectItem>
            )}
          </Select>
        </div>
      )}
    </div>
  );
};
