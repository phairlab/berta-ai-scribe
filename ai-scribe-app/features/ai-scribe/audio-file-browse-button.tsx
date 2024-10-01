"use client";

import { useRef } from "react";

import { Button } from "@nextui-org/button";

const ACCEPT_FILE_TYPES = ["mp3", "mp4", "mpeg", "m4a", "webm", "wav", "mpga"];

type AudioFileBrowseButtonProps = {
  onFileSelected: (audioData: File) => void;
};

export const AudioFileBrowseButton = ({
  onFileSelected,
}: AudioFileBrowseButtonProps) => {
  const inputFile = useRef<HTMLInputElement>(null);

  const handleFileSelected = (e: React.FormEvent<HTMLInputElement>) => {
    if (e.currentTarget.files) {
      const file = e.currentTarget.files[0];

      onFileSelected?.(file);
    }
  };

  return (
    <>
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
    </>
  );
};
