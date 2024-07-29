"use client";

import { useEffect, useState } from "react";
import { Divider } from "@nextui-org/divider";
import { Button } from "@nextui-org/button";

import { AIScribeAudioSource } from "./ai-scribe-audio-source";
import { AIScribeControls } from "./ai-scribe-controls";
import { SimpleLoadingMessage } from "./simple-loading-message";
import { AIScribeOutput } from "./ai-scribe-output";

import * as Actions from "@/data-actions";
import * as Models from "@/data-models";

const NOTE_TYPES = [
  "Dx and DDx",
  "Feedback",
  "Full Visit",
  "Hallway Consult",
  "Handover Note",
  "Impression Note",
  "Medications",
  "Psych",
];

const DEFAULT_NOTE_TYPE = "Full Visit";

type ErrorResponse = {
  message: string;
  retry: () => void;
};

export const AIScribe = () => {
  const [audioData, setAudioData] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<Models.Transcript | null>(null);
  const [noteType, setNoteType] = useState<string>(DEFAULT_NOTE_TYPE);
  const [generatedNote, setGeneratedNote] =
    useState<Models.GeneratedNote | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isNoteGenerating, setIsNoteGenerating] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);

  // Immediately transcribe new audio.
  useEffect(() => {
    if (audioData) {
      transcribeAudio(audioData);
    }
  }, [audioData]);

  useEffect(() => {
    if (transcript) {
      generateNote(transcript, noteType);
    }
  }, [transcript]);

  const handleAudioDataChanged = async (data: Blob | null) => {
    // Reset state.
    setTranscript(null);
    setNoteType(DEFAULT_NOTE_TYPE);
    setGeneratedNote(null);
    setIsNoteGenerating(false);
    setError(null);

    // Save new audio data.
    setAudioData(data);
  };

  const transcribeAudio = async (data: Blob) => {
    setTranscript(null);
    setIsTranscribing(true);

    const mimeType = data.type;
    const extension = mimeType.split(";")[0].split("/")[1] || "webm";
    const filename = `recording.${extension}`;
    const formData = new FormData();

    formData.append("recording", data, filename);

    try {
      const transcript = await Actions.transcribeAudio(formData);

      setTranscript(transcript);
    } catch (error: unknown) {
      const errorMessage = `An error occurred during audio transcription.`;

      setError({
        message: errorMessage,
        retry: () => {
          setError(null);
          transcribeAudio(data);
        },
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const generateNote = async (
    transcript: Models.Transcript,
    noteType: string,
  ) => {
    setGeneratedNote(null);
    setIsNoteGenerating(true);

    try {
      const note = await Actions.generateNote(transcript.text, noteType);

      setGeneratedNote(note);
    } catch (error: unknown) {
      const errorMessage = `An error occurred during note generation.`;

      setError({
        message: errorMessage,
        retry: () => {
          setError(null);
          generateNote(transcript, noteType);
        },
      });
    } finally {
      setIsNoteGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <AIScribeAudioSource onAudioDataChanged={handleAudioDataChanged} />
      <div className="flex flex-col gap-6">
        <Divider />
        <AIScribeControls
          canSubmit={!!audioData && !isTranscribing && !isNoteGenerating}
          noteTypes={NOTE_TYPES}
          selectedNoteType={noteType}
          onNoteTypeChanged={(noteType) => setNoteType(noteType)}
          onSubmit={() => transcript && generateNote(transcript, noteType)}
        />
        {isTranscribing && (
          <SimpleLoadingMessage>Transcribing Audio</SimpleLoadingMessage>
        )}
        {isNoteGenerating && (
          <SimpleLoadingMessage>Generating: {noteType}</SimpleLoadingMessage>
        )}
        {error && (
          <div className="flex flex-row gap-4 justify-center items-center mx-6 pt-6">
            <span className="text-red-500">{error.message}</span>
            <Button variant="ghost" onClick={error.retry}>
              Retry
            </Button>
          </div>
        )}
        {generatedNote && (
          <div className="flex flex-col justify-center gap-6">
            <Divider />
            <AIScribeOutput note={generatedNote} />
          </div>
        )}
      </div>
    </div>
  );
};
