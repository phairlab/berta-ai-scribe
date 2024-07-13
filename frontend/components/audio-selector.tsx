"use client";

import { useState } from "react";

import { AudioSource } from "@/components/audio-source";
import { AudioSourceType } from "@/types";

interface AudioSelectorProps {
  mobileDevice: boolean;
}

export const AudioSelector = ({ mobileDevice }: AudioSelectorProps) => {
  const [audioSource, setAudioSource] = useState<AudioSourceType>("none");

  return (
    <AudioSource
      mobileDevice={mobileDevice}
      source={audioSource}
      onSourceSelected={setAudioSource}
    />
  );
};
