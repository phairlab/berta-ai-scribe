"use client";

import { useEffect, useState } from "react";
import { Divider } from "@nextui-org/divider";

import * as Models from "@/data-models";
import { useDataAction } from "@/hooks/use-data-action";
import { logger } from "@/utility/logging";

import { AIScribeAudioSource } from "./ai-scribe-audio-source";
import { AIScribeControls } from "./ai-scribe-controls";
import { SimpleLoadingMessage } from "./simple-loading-message";
import { AIScribeOutput } from "./ai-scribe-output";
import { ErrorReport } from "./error-report";

const log = logger.child({ module: "components/ai-scribe" });

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
const TRANSCRIPTION_TIMEOUT = 60;
const NOTE_GENERATION_TIMEOUT = 60;

export const AIScribe = () => {
  const [audioData, setAudioData] = useState<File | null>(null);
  const [noteType, setNoteType] = useState<string>(DEFAULT_NOTE_TYPE);

  const { action: transcribeAudio, result: transcript } =
    useDataAction<Models.Transcript>("POST", "/transcripts");

  const { action: generateNote, result: generatedNote } =
    useDataAction<Models.GeneratedNote>("POST", "/generated-notes");

  // Immediately transcribe new audio.
  useEffect(() => {
    transcribeAudio.reset();
    generateNote.reset();

    if (audioData) {
      log.debug("Transcribing Audio");
      transcribeAudio.execute({ recording: audioData }, TRANSCRIPTION_TIMEOUT);
    }
  }, [audioData]);

  // Immediately generate note on transcription.
  useEffect(() => {
    if (transcript && !generateNote.executing) {
      log.debug(`Generating Note: ${noteType}`);
      generateNote.execute(
        { transcript: transcript.text, summaryType: noteType },
        NOTE_GENERATION_TIMEOUT,
      );
    }
  }, [transcript]);

  const handleAudioDataChanged = (data: File | null) => {
    // Save new audio data.
    setAudioData(data);
  };

  const handleAudioSourceReset = () => {
    setNoteType(DEFAULT_NOTE_TYPE);
  };

  return (
    <div className="flex flex-col gap-4">
      <AIScribeAudioSource
        onAudioDataChanged={handleAudioDataChanged}
        onReset={handleAudioSourceReset}
      />
      <div className="flex flex-col gap-6">
        <Divider />
        <AIScribeControls
          canSubmit={
            transcript !== null &&
            !transcribeAudio.executing &&
            !generateNote.executing
          }
          noteTypes={NOTE_TYPES}
          selectedNoteType={noteType}
          onNoteTypeChanged={(noteType) => setNoteType(noteType)}
          onSubmit={() =>
            transcript &&
            generateNote.execute(
              { transcript: transcript.text, summaryType: noteType },
              NOTE_GENERATION_TIMEOUT,
            )
          }
        />
        {transcribeAudio.executing && (
          <SimpleLoadingMessage>Transcribing Audio</SimpleLoadingMessage>
        )}
        {generateNote.executing && (
          <SimpleLoadingMessage>Generating: {noteType}</SimpleLoadingMessage>
        )}
        {transcribeAudio.error && (
          <ErrorReport
            errorInfo={transcribeAudio.error}
            retryAction={transcribeAudio.execute}
          />
        )}
        {generateNote.error && (
          <ErrorReport
            errorInfo={generateNote.error}
            retryAction={generateNote.execute}
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
