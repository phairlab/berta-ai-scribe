"use client";

import { useEffect, useState } from "react";
import { Divider } from "@nextui-org/divider";

import { AIScribeAudioSource } from "./ai-scribe-audio-source";
import { AIScribeControls } from "./ai-scribe-controls";
import { SimpleLoadingMessage } from "./simple-loading-message";
import { AIScribeOutput } from "./ai-scribe-output";
import { ErrorReport } from "./error-report";

import * as Actions from "@/data-actions";
import * as Models from "@/data-models";
import { DataError, UnknownError } from "@/errors";

type ErrorDetails = {
  errorInfo: DataError;
  retryAction?: () => void;
};

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

export const AIScribe = () => {
  const [audioData, setAudioData] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<Models.Transcript | null>(null);
  const [noteType, setNoteType] = useState<string>(DEFAULT_NOTE_TYPE);
  const [generatedNote, setGeneratedNote] =
    useState<Models.GeneratedNote | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isNoteGenerating, setIsNoteGenerating] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);

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
    } catch (e: unknown) {
      const retry = async () => {
        setError(null);
        await transcribeAudio(data);
      };

      if ((e as DataError).isDataError) {
        const error = e as DataError;
        const errorDetails: ErrorDetails = {
          errorInfo: error,
          retryAction: retry,
        };

        setError(errorDetails);
      } else {
        // Handle unknown/unexpected errors.
        const errorDetails: ErrorDetails = {
          errorInfo: new UnknownError((e as Error).message),
          retryAction: retry,
        };

        setError(errorDetails);
      }
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
    } catch (e: unknown) {
      const retry = async () => {
        setError(null);
        await generateNote(transcript, noteType);
      };

      if ((e as DataError).isDataError) {
        const error = e as DataError;
        const errorDetails: ErrorDetails = {
          errorInfo: error,
          retryAction: retry,
        };

        setError(errorDetails);
      } else {
        // Handle unknown/unexpected errors.
        const errorDetails: ErrorDetails = {
          errorInfo: new UnknownError((e as Error).message),
          retryAction: retry,
        };

        setError(errorDetails);
      }
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
          <ErrorReport
            errorInfo={error.errorInfo}
            retryAction={error.retryAction}
          />
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
