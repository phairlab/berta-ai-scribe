"use client";

import { useEffect, useRef, useState } from "react";

import shortUUID from "short-uuid";

import { Divider } from "@nextui-org/divider";

import { ConsentScript } from "@/core/consent-script";
import { DraftNote, Encounter } from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { useNoteGenerator } from "@/services/note-generation/use-note-generator";
import { useTranscriber } from "@/services/transcription/use-transcriber";
import { ApplicationError } from "@/utility/errors";

import { useEncounters } from "@/features/encounters/use-encounters";
import { useNoteTypes } from "@/features/note-types/use-note-types";

import { AIScribeAudio } from "./ai-scribe-audio";
import { AIScribeControls } from "./ai-scribe-controls";
import {
  AIScribeError,
  AIScribeOutput,
  AIScribeOutputType,
} from "./ai-scribe-output";
import { createEncounter } from "./create-encounter";

export const AIScribe = () => {
  const ref = useRef<Encounter | null>(null);
  const encounters = useEncounters();
  const activeEncounter = encounters.activeEncounter;

  const noteTypes = useNoteTypes();
  const [selectedNoteType, setSelectedNoteType] = useState(noteTypes.default);
  const [audio, setAudio] = useState<string | File>();
  const [activeOutput, setActiveOutput] = useState<AIScribeOutputType>();

  const [aiScribeError, setAIScribeError] = useState<AIScribeError>();
  const suppressNextError = useRef(false);

  const transcriber = useTranscriber({
    onTranscribing: () => setAIScribeError(undefined),
    onTranscript: (transcript) => handleTranscript(transcript),
    onError: (error, retry) =>
      handleError("Error: Transcription", error, false, retry),
  });

  const noteGenerator = useNoteGenerator({
    onGenerating: () => setAIScribeError(undefined),
    onGenerated: (draftNote) => handleNoteGenerated(draftNote),
    onError: (error, retry) =>
      handleError("Error: Note Generation", error, true, retry),
  });

  const canTranscribe =
    audio !== undefined &&
    activeEncounter !== null &&
    activeEncounter.tracking.isPersisted &&
    !transcriber.isTranscribing;

  const canGenerateNote =
    selectedNoteType !== null &&
    activeEncounter !== null &&
    activeEncounter.recording.transcript &&
    !noteGenerator.generatingNoteType;

  const handleAudioFileGenerated = (audio: File, setActive: boolean) => {
    const tempId = shortUUID.generate();

    // Create a new encounter record.
    const encounter: Encounter = createEncounter({
      tempId: tempId,
      audio: audio,
    });

    encounters.save(encounter);

    if (setActive) {
      encounters.setActive(encounter);
    }
  };

  const handleTranscript = (transcript: string) => {
    if (!activeEncounter) {
      throw Error(
        "Invalid Operation: Transcript generated but no active encounter",
      );
    }

    encounters.save({
      ...activeEncounter,
      recording: { ...activeEncounter.recording, transcript: transcript },
    });

    setActiveOutput(activeEncounter.recording);
  };

  const handleNoteGenerated = (note: DraftNote) => {
    if (!activeEncounter) {
      throw Error("Invalid Operation: Note generated but no active encounter.");
    }

    encounters.saveNote(activeEncounter, note);
    setActiveOutput(note);
  };

  const handleError = (
    name: string,
    error: ApplicationError,
    canDismiss: boolean,
    retry: () => void,
  ) => {
    if (!suppressNextError.current) {
      const aiScribeError = {
        name: name,
        content: error,
        canDismiss: canDismiss,
        retry: retry,
      };

      setAIScribeError(aiScribeError);
      setActiveOutput(aiScribeError);
    } else {
      suppressNextError.current = false;
    }
  };

  const handleActiveEncounterChanged = () => {
    setAIScribeError(undefined);

    if (transcriber.isTranscribing || noteGenerator.generatingNoteType) {
      suppressNextError.current = true;
      transcriber.abort();
      noteGenerator.abort();
    }

    if (!activeEncounter) {
      ref.current = null;
      setAudio(undefined);
      setActiveOutput(undefined);
      setSelectedNoteType(noteTypes.default);
    } else {
      ref.current = activeEncounter;

      if (!activeEncounter.recording.cachedAudio) {
        setAudio(
          `/api/encounters/recording-files/${activeEncounter.recording.filename}`,
        );
      } else {
        setAudio(activeEncounter.recording.cachedAudio);
      }

      if (activeEncounter.draftNotes.length > 0) {
        setActiveOutput(activeEncounter.draftNotes[0]);
      } else if (activeEncounter.recording.transcript) {
        setActiveOutput(activeEncounter.recording);
      } else {
        setActiveOutput(undefined);
      }
    }
  };

  // React to changes in the active encounter's state.
  useEffect(() => {
    // Reset the UI when the active encounter changes.
    if (!activeEncounter || ref.current?.uuid !== activeEncounter.uuid) {
      handleActiveEncounterChanged();
    }
  }, [activeEncounter]);

  // Auto-transcribe encounters on audio available.
  useEffect(() => {
    if (canTranscribe && !activeEncounter.recording.transcript) {
      transcriber.transcribe(activeEncounter);
    }
  }, [audio, activeEncounter]);

  // Auto-generate first note on transcript available.
  useEffect(() => {
    if (canGenerateNote && activeEncounter.draftNotes.length === 0) {
      noteGenerator.generateNote(
        selectedNoteType,
        activeEncounter.recording.transcript!,
      );
    }
  }, [selectedNoteType, activeEncounter]);

  return (
    <div className="flex flex-col gap-6">
      <AIScribeAudio
        audio={audio ?? null}
        onAudioFile={(audio) => handleAudioFileGenerated(audio, true)}
        onRecoverRecording={(audio) => handleAudioFileGenerated(audio, false)}
        onReset={() => encounters.setActive(null)}
      />
      <div className="flex flex-col gap-6 items-center">
        <Divider className="bg-zinc-100 dark:bg-zinc-900" />
        <AIScribeControls
          isDisabled={!canGenerateNote}
          selectedNoteType={selectedNoteType ?? undefined}
          onNoteTypeChanged={(noteType) =>
            setSelectedNoteType(noteType ?? null)
          }
          onSubmit={() =>
            canGenerateNote &&
            noteGenerator.generateNote(
              selectedNoteType,
              activeEncounter.recording.transcript!,
            )
          }
        />
        {audio === undefined && (
          <ConsentScript className="text-sm text-justify sm:text-start text-zinc-400 dark:text-zinc-600 w-96 max-w-[80%] mt-8" />
        )}
        {activeEncounter?.tracking.isSaving &&
          !activeEncounter.tracking.isPersisted && (
            <WaitMessageSpinner>Saving</WaitMessageSpinner>
          )}
        {transcriber.isTranscribing && (
          <WaitMessageSpinner onCancel={transcriber.abort}>
            Transcribing Audio
          </WaitMessageSpinner>
        )}
        {noteGenerator.generatingNoteType && (
          <WaitMessageSpinner onCancel={noteGenerator.abort}>
            Generating Note: {noteGenerator.generatingNoteType.title}
          </WaitMessageSpinner>
        )}
        {activeEncounter &&
          (aiScribeError ||
            activeEncounter.draftNotes.length > 0 ||
            activeEncounter.recording.transcript) && (
            <AIScribeOutput
              activeOutput={activeOutput}
              error={aiScribeError}
              notes={activeEncounter.draftNotes}
              recording={activeEncounter.recording}
              onActiveChanged={setActiveOutput}
              onErrorDismissed={() => setAIScribeError(undefined)}
            />
          )}
      </div>
    </div>
  );
};
