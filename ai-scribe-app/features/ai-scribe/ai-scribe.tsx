"use client";

import { useEffect, useRef, useState } from "react";

import shortUUID from "short-uuid";

import { Divider } from "@nextui-org/divider";

import { ConsentScript } from "@/core/consent-script";
import { AudioSource, DraftNote, Encounter } from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { createEncounter } from "@/services/application-state/create-encounter";
import { useEncounters } from "@/services/application-state/use-encounters";
import { useNoteTypes } from "@/services/application-state/use-note-types";
import { ApplicationError } from "@/utility/errors";

import { AIScribeAudio } from "./ai-scribe-audio";
import { AIScribeControls } from "./ai-scribe-controls";
import {
  AIScribeError,
  AIScribeOutput,
  AIScribeOutputType,
} from "./ai-scribe-output";
import { useNoteGenerator } from "./use-note-generator";
import { useTranscriber } from "./use-transcriber";

export const AIScribe = () => {
  const ref = useRef<Encounter | null>(null);
  const encounters = useEncounters();
  const activeEncounter = encounters.activeEncounter;

  const noteTypes = useNoteTypes();
  const [selectedNoteType, setSelectedNoteType] = useState(noteTypes.default);
  const [audioSource, setAudioSource] = useState<AudioSource | null>(null);
  const [activeOutput, setActiveOutput] = useState<AIScribeOutputType>();

  const [aiScribeError, setAIScribeError] = useState<AIScribeError>();
  const suppressNextError = useRef(false);

  const transcriber = useTranscriber({
    onTranscribing: () => setAIScribeError(undefined),
    onTranscript: (transcript) => handleTranscript(transcript),
    onError: (error, retry) =>
      handleError("Transcription", error, false, retry),
  });

  const noteGenerator = useNoteGenerator({
    onGenerating: () => setAIScribeError(undefined),
    onGenerated: (draftNote) => handleNoteGenerated(draftNote),
    onError: (error, retry) =>
      handleError("Note Generation", error, true, retry),
  });

  const canTranscribe =
    activeEncounter !== null &&
    activeEncounter.tracking.isPersisted &&
    !transcriber.isTranscribing;

  const canGenerateNote =
    selectedNoteType !== null &&
    activeEncounter !== null &&
    activeEncounter.recording !== undefined &&
    activeEncounter.recording.transcript !== null &&
    activeEncounter.recording.transcript !== "" &&
    !noteGenerator.generatingNoteType;

  const handleAudioFileGenerated = (audio: File, setActive: boolean) => {
    const tempId = shortUUID.generate();

    // Create a new encounter record.
    const encounter: Encounter = createEncounter({
      tempId: tempId,
      audio: audio,
    });

    encounters.save(encounter, audio);

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

    if (!activeEncounter.recording) {
      throw Error(
        "Invalid Operation: Active encounter has an incomplete data record",
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
    name: string | null,
    error: ApplicationError,
    canDismiss: boolean,
    retry: (() => void) | null,
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

  const handleActiveEncounterUpdated = () => {
    const encounterChanged =
      !activeEncounter || ref.current?.id !== activeEncounter.id;

    if (encounterChanged) {
      setAIScribeError(undefined);
    }

    if (activeEncounter?.tracking.error) {
      handleError(
        null,
        activeEncounter?.tracking.error,
        false,
        !activeEncounter.tracking.isPersisted && activeEncounter.unsavedAudio
          ? () => {
              setAIScribeError(undefined);
              encounters.save(activeEncounter, activeEncounter.unsavedAudio);
            }
          : null,
      );
    }

    if (
      encounterChanged &&
      (transcriber.isTranscribing || noteGenerator.generatingNoteType)
    ) {
      suppressNextError.current = true;
      transcriber.abort();
      noteGenerator.abort();
    }

    if (!activeEncounter) {
      ref.current = null;
      setAudioSource(null);
      setActiveOutput(undefined);
      setSelectedNoteType(noteTypes.default);
    } else {
      ref.current = activeEncounter;

      if (activeEncounter.recording?.duration) {
        setAudioSource({
          title: activeEncounter.id,
          url: `/api/recordings/${activeEncounter.recording.id}/download`,
          waveformPeaks: activeEncounter.recording.waveformPeaks,
          duration: activeEncounter.recording.duration,
        });
      } else {
        setAudioSource(null);
      }

      if (activeEncounter.draftNotes.length > 0) {
        setActiveOutput(activeEncounter.draftNotes[0]);
      } else if (activeEncounter.recording?.transcript) {
        setActiveOutput(activeEncounter.recording);
      } else {
        setActiveOutput(undefined);
      }
    }
  };

  // React to changes in the active encounter's state.
  useEffect(() => {
    handleActiveEncounterUpdated();
  }, [activeEncounter]);

  // Auto-transcribe encounters on audio available.
  useEffect(() => {
    if (
      canTranscribe &&
      activeEncounter.recording &&
      activeEncounter.recording.transcript === null
    ) {
      transcriber.transcribe(activeEncounter);
    }
  }, [activeEncounter]);

  // Auto-generate first note on transcript available.
  useEffect(() => {
    if (canGenerateNote && activeEncounter.draftNotes.length === 0) {
      noteGenerator.generateNote(
        selectedNoteType,
        activeEncounter.id,
        activeEncounter.recording!.transcript!,
      );
    }
  }, [selectedNoteType, activeEncounter]);

  return (
    <div className="flex flex-col gap-6">
      <AIScribeAudio
        audioSource={audioSource}
        isSaveFailed={
          activeEncounter?.tracking.isPersisted === false &&
          activeEncounter?.tracking.hasError === true
        }
        isSaving={
          (activeEncounter?.tracking.isSaving &&
            !activeEncounter.tracking.isPersisted) ??
          false
        }
        onAudioFile={(audio) => handleAudioFileGenerated(audio, true)}
        onRecoverRecording={(audio) => handleAudioFileGenerated(audio, false)}
        onReset={() => encounters.setActive(null)}
      />
      <div className="flex flex-col gap-6 items-center">
        <Divider className="bg-zinc-100 dark:bg-zinc-900" />
        {!(
          activeEncounter?.tracking.isPersisted === false &&
          activeEncounter?.tracking.hasError
        ) && (
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
                activeEncounter.id,
                activeEncounter.recording!.transcript!,
              )
            }
          />
        )}
        {activeEncounter === null && (
          <ConsentScript className="text-sm text-justify sm:text-start text-zinc-400 dark:text-zinc-600 w-96 max-w-[80%] mt-8" />
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
        {activeEncounter?.tracking.isPersisted === false &&
          activeEncounter?.tracking.hasError && (
            <div className="flex flex-col gap-2 text-sm max-w-prose text-justify sm:text-start">
              <p className="font-bold text-red-500">WARNING:</p>
              <p>
                This recording has not yet been saved and may be lost if the
                browser is closed or refreshed.
              </p>
              <p>
                If this has occurred due to a loss of network connectivity,
                please use the Retry button below once connectivity has been
                restored.
              </p>
            </div>
          )}
        {activeEncounter &&
          (aiScribeError ||
            activeEncounter.draftNotes.length > 0 ||
            (activeEncounter.recording &&
              activeEncounter.recording.transcript !== null)) && (
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
