"use client";

import { useRef } from "react";
import { Button } from "@nextui-org/button";
import { Select, SelectItem } from "@nextui-org/select";

import { useAutoQuery } from "@/hooks/use-auto-query";
import * as Models from "@/data-models";
import { downloadFile } from "@/utility/network";

const ACCEPT_FILE_TYPES = ["mp3", "mp4", "mpeg", "m4a", "webm", "wav", "mpga"];

type AudioFileSelectProps = {
  onFileSelected: (audioData: File, audioTitle: string) => void;
};

export const AudioFileSelect = (props: AudioFileSelectProps) => {
  const inputFile = useRef<HTMLInputElement>(null);
  const { data: samples, loading: samplesLoading } =
    useAutoQuery<Models.AudioSample[]>("audio-samples");

  const handleFileSelected = (e: React.FormEvent<HTMLInputElement>) => {
    if (e.currentTarget.files) {
      const file = e.currentTarget.files[0];

      props.onFileSelected?.(file, `local-device/${file.name}`);
    }
  };

  const handleSampleAudioSelected = async (samples: any) => {
    const sampleUrl: string = (samples as Set<string>).values().next().value;
    const filename: string = sampleUrl.split("/").slice(-1)[0];

    const file = await downloadFile(sampleUrl, filename);

    props.onFileSelected?.(file, sampleUrl);
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
        accept={ACCEPT_FILE_TYPES.map((type) => `audio/${type}`).join(", ")}
        aria-hidden="true"
        aria-label="audio-input-file"
        className="hidden"
        type="file"
        onChange={handleFileSelected}
      />
      <Select
        aria-label="Select an Audio Sample"
        className="w-36"
        isLoading={samplesLoading}
        items={samples ?? []}
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
