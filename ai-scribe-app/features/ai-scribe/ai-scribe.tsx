"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import shortUUID from "short-uuid";

import { Button } from "@nextui-org/button";
import { Divider } from "@nextui-org/divider";

import { ConsentScript } from "@/core/consent-script";
import {
  AudioSource,
  DraftNote,
  Encounter,
  NoteType,
  ScribeError,
} from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { useActiveEncounter } from "@/services/application-state/active-encounter-context";
import { useEncounters } from "@/services/application-state/encounters-context";
import { useNoteTypes } from "@/services/application-state/note-types-context";
import { useScribe } from "@/services/application-state/scribe-context";
import { asApplicationError } from "@/utility/errors";

import { AIScribeAudio } from "./ai-scribe-audio";
import { AIScribeControls } from "./ai-scribe-controls";
import { AIScribeOutput } from "./ai-scribe-output";
import { useNoteGenerator } from "./use-note-generator";
import { useTranscriber } from "./use-transcriber";

export const AIScribe = () => {
  const encounters = useEncounters();
  const noteTypes = useNoteTypes();
  const transcriber = useTranscriber();
  const noteGenerator = useNoteGenerator();
  const [encounter, setActiveEncounter] = useActiveEncounter();

  const scribe = useScribe();
  const scribeState = scribe.get(encounter?.id);

  const [noteType, setNoteType] = useState<NoteType | undefined>(
    noteTypes.default,
  );

  useEffect(() => {
    if (encounter && noteType !== scribeState.noteType) {
      setNoteType(scribeState.noteType ?? noteTypes.default);
    } else if (encounter === null) {
      setNoteType(noteTypes.default);
    }
  }, [encounter]);

  const [transcriptionQueue, setTranscriptionQueue] = useState<string[]>([]);
  const [noteGenerationQueue, setNoteGenerationQueue] = useState<
    [string, NoteType | undefined][]
  >([]);

  useEffect(() => {
    if (transcriptionQueue.length > 0) {
      for (const encounterId of transcriptionQueue) {
        transcribeRecording(encounterId);
      }

      setTranscriptionQueue([]);
    }
  }, [transcriptionQueue]);

  useEffect(() => {
    if (noteGenerationQueue.length > 0) {
      for (const [encounterId, noteType] of noteGenerationQueue) {
        generateNote(encounterId, noteType);
      }

      setNoteGenerationQueue([]);
    }
  }, [noteGenerationQueue]);

  const recording = encounter?.recording ?? null;
  const transcript = recording?.transcript ?? null;
  const notes = encounter?.draftNotes ?? [];

  const isSaving = scribeState.action?.type === "Saving";
  const failedToSave = scribeState.error?.type === "Saving";

  const canTranscribe =
    recording !== null &&
    transcript === null &&
    !failedToSave &&
    !scribeState.action;

  const audio = useMemo(() => {
    if (encounter && recording && recording.duration) {
      return {
        id: encounter.id,
        title: encounter.label ?? encounter.autolabel,
        url: `/api/recordings/${recording.id}/download`,
        waveformPeaks: recording.waveformPeaks,
        duration: recording.duration,
      } satisfies AudioSource as AudioSource;
    } else {
      return null;
    }
  }, [encounter, recording]);

  async function handleNoteTypeChanged(noteType: NoteType | undefined) {
    setNoteType(noteType);

    if (encounter) {
      if (noteType) {
        scribe.setNoteType(encounter.id, noteType);
      } else {
        scribe.clearNoteType(encounter.id);
      }
    }
  }

  async function saveEncounter(audio: File, setActive: boolean) {
    const tempId = shortUUID.generate();

    scribe.track(tempId);
    scribe.setAction(tempId, { type: "Saving" });

    if (noteType) {
      scribe.setNoteType(tempId, noteType);
    }

    if (setActive) {
      setActiveEncounter(tempId);
    }

    try {
      const newEncounter = await encounters.create(tempId, audio);

      scribe.modifyId(tempId, newEncounter.id);
      scribe.clearAction(newEncounter.id);

      setActiveEncounter((active) =>
        active === tempId ? newEncounter.id : active,
      );

      setTranscriptionQueue((queue) => [...queue, newEncounter.id]);
    } catch (ex: unknown) {
      const error = {
        type: "Saving",
        cause: asApplicationError(ex),
        canDismiss: false,
        retry: () => {
          scribe.clearError(tempId);
          saveEncounter(audio, false);
        },
      } satisfies ScribeError;

      scribe.clearAction(tempId);
      scribe.setError(tempId, error);
    }
  }

  const transcribeRecording = useCallback(
    async (encounterId: string) => {
      const encounter = encounters.list.find((e) => e.id === encounterId);

      if (!encounter) {
        return;
      }

      scribe.clearError(encounter.id);

      const recording = encounter.recording;

      if (!recording) {
        return;
      }

      const controller = new AbortController();

      scribe.setAction(encounter.id, {
        type: "Transcribing",
        abort: () => controller.abort(),
      });

      try {
        const transcript = await transcriber.transcribe(
          recording,
          controller.signal,
        );

        encounters.setTranscript(encounter.id, transcript);
        scribe.setOutput(encounter.id, { type: "Transcript" });
        scribe.clearAction(encounter.id);

        setNoteGenerationQueue((queue) => [...queue, [encounterId, undefined]]);
      } catch (ex: unknown) {
        const isAborted =
          ex instanceof DOMException && ex.name === "AbortError";

        if (!isAborted) {
          const scribeError = {
            type: "Transcribing",
            cause: asApplicationError(ex),
            canDismiss: false,
            retry: () => transcribeRecording(encounterId),
          } satisfies ScribeError;

          scribe.clearAction(encounter.id);
          scribe.setError(encounter.id, scribeError);
        }
      }
    },
    [encounters.list, scribe],
  );

  const generateNote = useCallback(
    async (encounterId: string, noteType?: NoteType) => {
      const encounter = encounters.list.find((e) => e.id === encounterId);

      if (!encounter) {
        return;
      }

      if (!noteType) {
        noteType = scribe.get(encounterId).noteType;

        if (!noteType) {
          return;
        }
      }

      scribe.clearError(encounter.id);

      const transcript = encounter?.recording?.transcript;

      if (!transcript || transcript.trim() === "") {
        return;
      }

      const controller = new AbortController();

      scribe.setAction(encounter.id, {
        type: "Generating Note",
        detail: noteType.title,
        abort: () => controller.abort(),
      });

      try {
        const note = await noteGenerator.generateNote(
          encounter,
          noteType,
          transcript,
          controller.signal,
          { includeFooter: true },
        );

        encounters.saveNote(encounter.id, note);
        scribe.setOutput(encounter.id, { type: "Note", id: note.id });
        scribe.clearAction(encounter.id);
      } catch (ex: unknown) {
        const isAborted =
          ex instanceof DOMException && ex.name === "AbortError";

        if (!isAborted) {
          const scribeError = {
            type: "Generating Note",
            cause: asApplicationError(ex),
            canDismiss: true,
            retry: () => generateNote(encounterId, noteType),
          } satisfies ScribeError;

          scribe.clearAction(encounter.id);
          scribe.setError(encounter.id, scribeError);
        }
      }
    },
    [encounters.list, scribe],
  );

  const updateNoteFlag = (
    encounter: Encounter,
    note: DraftNote,
    isFlagged: boolean,
    comments: string | null,
  ) => {
    encounters.setNoteFlag(encounter.id, note.id, isFlagged, comments);
  };

  return (
    <div className="flex flex-col gap-6">
      <AIScribeAudio
        audioSource={audio}
        isSaveFailed={failedToSave}
        isSaving={isSaving}
        onAudioFile={(audio) => saveEncounter(audio, true)}
        onRecoverRecording={(audio) => saveEncounter(audio, false)}
        onReset={() => setActiveEncounter(null)}
      />
      <div className="flex flex-col gap-6 items-center">
        <Divider className="bg-zinc-100 dark:bg-zinc-900" />
        {!failedToSave && (
          <AIScribeControls
            isDisabled={transcript === null || scribeState.action !== undefined}
            isRegenerate={notes.some(
              (n) =>
                n.definitionId ===
                (scribeState.noteType?.id ?? noteTypes.default?.id),
            )}
            selectedNoteType={noteType}
            onNoteTypeChanged={handleNoteTypeChanged}
            onSubmit={() =>
              encounter && noteType && generateNote(encounter.id, noteType)
            }
          />
        )}
        {!encounter && (
          <ConsentScript className="text-sm text-justify sm:text-start text-zinc-400 dark:text-zinc-600 w-96 max-w-[80%] mt-8 space-y-3 sm:space-y-2" />
        )}
        {scribeState.action && !isSaving && (
          <WaitMessageSpinner onCancel={scribeState.action.abort}>
            {scribeState.action.type}
            {scribeState.action.detail && `: ${scribeState.action.detail}`}
          </WaitMessageSpinner>
        )}
        {failedToSave && (
          <div className="flex flex-col gap-2 text-sm max-w-prose text-justify sm:text-start">
            <p className="font-bold text-red-500">WARNING:</p>
            <p>
              This recording has not yet been saved and may be lost if the
              browser is closed or refreshed.
            </p>
            <p>
              If this has occurred due to a loss of network connectivity, please
              use the Retry button below once connectivity has been restored.
            </p>
          </div>
        )}
        {encounter && canTranscribe && !scribeState.error && (
          <div className="flex flex-col items-center justify-center gap-4 mt-16 max-w-[80%]">
            <p className="text-center text-zinc-500">
              This recording has not yet been transcribed.
            </p>
            <Button
              color="primary"
              onClick={() => transcribeRecording(encounter.id)}
            >
              Transcribe Now
            </Button>
          </div>
        )}
        {encounter && (scribeState.error || notes.length > 0 || transcript) && (
          <AIScribeOutput
            activeOutput={scribeState.output}
            error={scribeState.error}
            notes={notes}
            recording={recording ?? undefined}
            onActiveChanged={(output) => scribe.setOutput(encounter.id, output)}
            onErrorDismissed={() => scribe.clearError(encounter.id)}
            onNoteFlagUpdated={(note, isFlagged, comments) =>
              updateNoteFlag(encounter, note, isFlagged, comments)
            }
          />
        )}
      </div>
    </div>
  );
};
