"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Divider } from "@nextui-org/divider";

import { Transcript, GeneratedNote } from "@/models";
import { useWebService } from "@/hooks/use-web-service";

import { AIScribeAudioSource } from "./ai-scribe-audio-source";
import { AIScribeControls } from "./ai-scribe-controls";
import { SimpleLoadingMessage } from "./simple-loading-message";
import { AIScribeOutput } from "./ai-scribe-output";
import { ErrorReport } from "./error-report";

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
const TRANSCRIPTION_TIMEOUT = 600;
const NOTE_GENERATION_TIMEOUT = 600;

export const AIScribe = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [noteType, setNoteType] = useState<string>(DEFAULT_NOTE_TYPE);

  const { action: transcribeAudioAction, result: transcript } =
    useWebService<Transcript>("POST", "/api/ai-operations/transcribe-audio");

  const { action: generateNoteAction, result: generatedNote } =
    useWebService<GeneratedNote>("POST", "/api/ai-operations/generate-note");

  // Immediately transcribe new audio.
  useEffect(() => {
    transcribeAudio();
  }, [audioFile]);

  // Immediately generate note on transcription.
  useEffect(() => {
    generateNote();
  }, [transcript]);

  const transcribeAudio = () => {
    transcribeAudioAction.reset();
    generateNoteAction.reset();

    if (audioFile) {
      const formData = new FormData();

      formData.append("audio", audioFile);
      transcribeAudioAction.execute(formData, TRANSCRIPTION_TIMEOUT);
    }
  };

  const generateNote = () => {
    if (transcript !== undefined && !generateNoteAction.executing) {
      generateNoteAction.execute(
        { transcript: transcript.text, noteType: noteType },
        NOTE_GENERATION_TIMEOUT,
      );
    }
  };

  const handleAudioDataChanged = (data: File | null) => {
    // Save new audio data.
    setAudioFile(data);
  };

  const handleAudioSourceReset = () => {
    setNoteType(DEFAULT_NOTE_TYPE);
  };

  return (
    <div className="flex flex-col gap-6">
      <AIScribeAudioSource
        onAudioDataChanged={handleAudioDataChanged}
        onReset={handleAudioSourceReset}
      />
      <div className="flex flex-col gap-6">
        <Divider />
        <AIScribeControls
          canSubmit={
            transcript !== undefined &&
            !transcribeAudioAction.executing &&
            !generateNoteAction.executing
          }
          noteTypes={NOTE_TYPES}
          selectedNoteType={noteType}
          onNoteTypeChanged={(noteType) => setNoteType(noteType)}
          onSubmit={generateNote}
        />
        {transcribeAudioAction.executing && (
          <div className="flex flex-row gap-3 items-center justify-center">
            <SimpleLoadingMessage>Transcribing Audio</SimpleLoadingMessage>
            <Link
              className="text-blue-500"
              href=""
              onClick={transcribeAudioAction.abort}
            >
              (Cancel)
            </Link>
          </div>
        )}
        {generateNoteAction.executing && (
          <div className="flex flex-row gap-3 items-center justify-center">
            <SimpleLoadingMessage>Generating: {noteType}</SimpleLoadingMessage>
            <Link
              className="text-blue-500"
              href=""
              onClick={generateNoteAction.abort}
            >
              (Cancel)
            </Link>
          </div>
        )}
        {transcribeAudioAction.error && (
          <ErrorReport
            errorInfo={transcribeAudioAction.error}
            retryAction={transcribeAudio}
          />
        )}
        {generateNoteAction.error && (
          <ErrorReport
            errorInfo={generateNoteAction.error}
            retryAction={generateNote}
          />
        )}
        {generatedNote && (
          <div className="flex flex-col justify-center gap-6">
            <AIScribeOutput note={generatedNote} />
          </div>
        )}
      </div>
    </div>
  );
};
