"use client";

import { useEffect, useState } from "react";
import { Divider } from "@nextui-org/divider";

import { AudioSource } from "./audio-source";
import { NoteGenerationControls } from "./note-generation-controls";
import { SimpleLoadingMessage } from "./simple-loading-message";
import { GeneratedNote } from "./generated-note";

import * as actions from "@/app/actions";

type GeneratedNoteData = {
  text: string;
  type: string;
};

export const AIScribe = () => {
  const [audioData, setAudioData] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [generatedNote, setGeneratedNote] = useState<GeneratedNoteData | null>(
    null,
  );
  const [isNoteGenerating, setIsNoteGenerating] = useState(false);

  useEffect(() => {
    // Reset values.
    setTranscript(null);
    setGeneratedNote(null);
    setIsNoteGenerating(false);

    // Transcribe new audio.
    transcribeAudio();
  }, [audioData]);

  const transcribeAudio = async () => {
    if (audioData) {
      const extension = audioData.type.split(";")[0].split("/")[1] || "webm";
      const filename = `recording.${extension}`;
      const formData = new FormData();

      formData.append("recording", audioData, filename);
      const transcript = await actions.transcribeAudio(formData);

      setTranscript(transcript.text);
    }
  };

  const generateNote = async (summaryType: string) => {
    setGeneratedNote(null);
    if (transcript) {
      setIsNoteGenerating(true);
      const note = await actions.generateNote(transcript, summaryType);

      setGeneratedNote({ text: note.text, type: summaryType });
      setIsNoteGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <AudioSource onAudioDataChanged={setAudioData} />
      {audioData && (
        <div className="flex flex-col gap-6">
          <Divider />
          <NoteGenerationControls
            canSubmit={!!transcript}
            onSubmit={generateNote}
          />
          {!transcript && (
            <SimpleLoadingMessage>Transcribing Audio</SimpleLoadingMessage>
          )}
          {isNoteGenerating && (
            <SimpleLoadingMessage>Generating Note</SimpleLoadingMessage>
          )}
          {generatedNote && (
            <div className="flex flex-col justify-center gap-6">
              <Divider />
              <GeneratedNote
                text={generatedNote.text}
                type={generatedNote.type}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
