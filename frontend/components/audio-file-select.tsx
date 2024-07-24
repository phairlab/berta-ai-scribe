"use client";

import { useRef } from "react";
import { Button } from "@nextui-org/button";
import { Select, SelectItem } from "@nextui-org/select";

import { useData } from "@/hooks/useData";

type AudioSample = {
  name: string;
  path: string;
};

type AudioFileSelectProps = {
  onFileSelected: (audioData: Blob, audioTitle: string) => void;
};

export const AudioFileSelect = (props: AudioFileSelectProps) => {
  const inputFile = useRef<HTMLInputElement>(null);

  const { data: audioSamples, loading: isLoadingAudioSamples } = useData<
    AudioSample[]
  >("audio-samples", []);

  const handleFileSelected = (e: React.FormEvent<HTMLInputElement>) => {
    if (e.currentTarget.files) {
      const file = e.currentTarget.files[0];

      var reader = new FileReader();

      reader.onload = (ev) => {
        const filename = file.name;
        var data = new Blob([new Uint8Array(ev.target?.result as ArrayBuffer)]);

        props.onFileSelected?.(data, filename);
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

    props.onFileSelected?.(data, sampleUrl);
  };

  return (
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
        aria-label="Use an Audio Sample"
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
  );
};
