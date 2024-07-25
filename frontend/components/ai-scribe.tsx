"use client";

import { useEffect, useState } from "react";
import { Divider } from "@nextui-org/divider";

import { AIScribeAudioSource } from "./ai-scribe-audio-source";
import { AIScribeControls } from "./ai-scribe-controls";
import { SimpleLoadingMessage } from "./simple-loading-message";
import { AIScribeOutput } from "./ai-scribe-output";

import * as Actions from "@/data-actions";
import * as Models from "@/data-models";

export const AIScribe = () => {
  const [audioData, setAudioData] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<Models.Transcript | null>(null);
  const [generatedNote, setGeneratedNote] =
    useState<Models.GeneratedNote | null>(null);
  const [isNoteGenerating, setIsNoteGenerating] = useState(false);

  // Immediately transcribe new audio.
  useEffect(() => {
    if (audioData) {
      transcribeAudio(audioData);
    }
  }, [audioData]);

  const handleAudioDataChanged = async (data: Blob | null) => {
    // Reset state.
    setTranscript(null);
    setGeneratedNote(null);
    setIsNoteGenerating(false);

    // Save new audio data.
    setAudioData(data);
  };

  const transcribeAudio = async (data: Blob) => {
    const mimeType = data.type;
    const extension = mimeType.split(";")[0].split("/")[1] || "webm";
    const filename = `recording.${extension}`;
    const formData = new FormData();

    formData.append("recording", data, filename);
    const transcript = await Actions.transcribeAudio(formData);

    setTranscript(transcript);
  };

  const generateNote = async (summaryType: string) => {
    setGeneratedNote(null);
    if (transcript) {
      setIsNoteGenerating(true);
      const note = await Actions.generateNote(transcript.text, summaryType);

      setGeneratedNote(note);
      setIsNoteGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <AIScribeAudioSource onAudioDataChanged={handleAudioDataChanged} />
      {audioData && (
        <div className="flex flex-col gap-6">
          <Divider />
          <AIScribeControls canSubmit={!!transcript} onSubmit={generateNote} />
          {!transcript && (
            <SimpleLoadingMessage>Transcribing Audio</SimpleLoadingMessage>
          )}
          {isNoteGenerating && (
            <SimpleLoadingMessage>Generating Note</SimpleLoadingMessage>
          )}
          {generatedNote && (
            <div className="flex flex-col justify-center gap-6">
              <Divider />
              <AIScribeOutput note={generatedNote} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
