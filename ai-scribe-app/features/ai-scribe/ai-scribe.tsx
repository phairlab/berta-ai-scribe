"use client";

import { useEffect, useState } from "react";

import shortUUID from "short-uuid";

import { Button } from "@nextui-org/button";
import { Divider } from "@nextui-org/divider";

import { ConsentScript } from "@/core/consent-script";
import { DraftNote, Encounter, NoteType, ScribeError } from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { useActiveEncounter } from "@/services/application-state/active-encounter-context";
import { useEncounters } from "@/services/application-state/encounters-context";
import { useNoteTypes } from "@/services/application-state/note-types-context";
import { useScribe } from "@/services/application-state/scribe-context";
import { asApplicationError, isAbortError } from "@/utility/errors";

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

  const [isRecording, setIsRecording] = useState(false);
  const [isDownloadingFile, setIsDownloadingFile] = useState(false);
  const [noteType, setNoteType] = useState<NoteType | undefined>(
    noteTypes.default,
  );

  useEffect(() => {
    if (encounter && noteType !== (scribeState.noteType ?? noteTypes.default)) {
      setNoteType(scribeState.noteType ?? noteTypes.default);
    } else if (encounter === null) {
      setNoteType(noteTypes.default);
    }
  }, [encounter]);

  const [autoTranscribe, setAutoTranscribe] = useState<string[]>([]);
  const [autoGenerate, setAutoGenerate] = useState<string[]>([]);
  const [autoRegenerate, setAutoRegenerate] = useState<string[]>([]);

  useEffect(() => {
    autoTranscribe.map((id) => transcribeRecording(id));
    setAutoTranscribe((queue) => (queue.length > 0 ? [] : queue));

    autoGenerate.map((id) => generateNote(id));
    setAutoGenerate((queue) => (queue.length > 0 ? [] : queue));

    autoRegenerate.map((id) => regenerateNotes(id));
    setAutoRegenerate((queue) => (queue.length > 0 ? [] : queue));
  }, [autoTranscribe, autoGenerate, autoRegenerate]);

  const recording = encounter?.recording ?? null;
  const transcript = recording?.transcript ?? null;
  const notes = encounter?.draftNotes ?? [];

  const isSaving = isDownloadingFile || scribeState.action?.type === "Saving";
  const failedToSave = scribeState.error?.type === "Saving";

  const canTranscribe =
    recording !== null &&
    transcript === null &&
    !isRecording &&
    !failedToSave &&
    !scribeState.action;

  const canGenerateNote =
    transcript !== null &&
    transcript.trim() !== "" &&
    !isRecording &&
    !scribeState.action;

  function handleNoteTypeChanged(noteType: NoteType | undefined) {
    setNoteType(noteType);

    if (encounter) {
      if (noteType) {
        scribe.setNoteType(encounter.id, noteType);
      } else {
        scribe.clearNoteType(encounter.id);
      }
    }
  }

  function handleSampleFileSelected() {
    setIsDownloadingFile(true);
  }

  function handleRecordingStarted() {
    scribeState.action?.abort?.();
    setIsRecording(true);
  }

  function handleRecordingFinished() {
    setIsRecording(false);
  }

  function handleAudioFile(audio: File, encounterId?: string) {
    setIsDownloadingFile(false);
    saveEncounter(audio, encounterId);
  }

  async function saveEncounter(audio: File, encounterId?: string) {
    let isNew = !encounterId;
    const id = encounterId ?? shortUUID.generate();

    if (isNew) {
      scribe.track(id);

      if (noteType) {
        scribe.setNoteType(id, noteType);
      }

      setActiveEncounter((active) => active ?? id);
    }

    scribe.setAction(id, { type: "Saving" });

    try {
      const savedEncounter = isNew
        ? await encounters.create(id, audio)
        : await encounters.appendRecording(id, audio);

      if (isNew) {
        scribe.modifyId(id, savedEncounter.id);
        setActiveEncounter((active) =>
          active === id ? savedEncounter.id : active,
        );
      }

      scribe.clearAction(savedEncounter.id);
      setAutoTranscribe((queue) => [...queue, savedEncounter.id]);
    } catch (ex: unknown) {
      const error = {
        type: "Saving",
        cause: asApplicationError(ex),
        canDismiss: false,
        retry: () => {
          scribe.clearError(id);
          saveEncounter(audio, encounterId);
        },
      } satisfies ScribeError;

      scribe.clearAction(id);
      scribe.setError(id, error);
      scribe.setOutput(id, { type: "Error" });
    }
  }

  async function transcribeRecording(encounterId: string) {
    const encounter = encounters.list.find((e) => e.id === encounterId);
    const recording = encounter?.recording;

    if (!recording) {
      return;
    }

    scribe.clearError(encounter.id);

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

      if (encounter.draftNotes.length > 0) {
        setAutoRegenerate((queue) => [...queue, encounterId]);
      } else {
        setAutoGenerate((queue) => [...queue, encounterId]);
      }
    } catch (ex: unknown) {
      if (!isAbortError(ex)) {
        const scribeError = {
          type: "Transcribing",
          cause: asApplicationError(ex),
          canDismiss: false,
          retry: () => transcribeRecording(encounterId),
        } satisfies ScribeError;

        scribe.setError(encounter.id, scribeError);
        scribe.setOutput(encounter.id, { type: "Error" });
      }

      scribe.clearAction(encounter.id);
    }
  }

  async function generateNote(encounterId: string, noteType?: NoteType) {
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
      if (!isAbortError(ex)) {
        const scribeError = {
          type: "Generating Note",
          cause: asApplicationError(ex),
          canDismiss: true,
          retry: () => generateNote(encounterId, noteType),
        } satisfies ScribeError;

        scribe.setError(encounter.id, scribeError);
        scribe.setOutput(encounter.id, { type: "Error" });
      }

      scribe.clearAction(encounter.id);
    }
  }

  async function regenerateNotes(encounterId: string) {
    const encounter = encounters.list.find((e) => e.id === encounterId);

    if (!encounter) {
      return;
    }

    scribe.clearError(encounter.id);

    const transcript = encounter?.recording?.transcript;

    if (!transcript || transcript.trim() === "") {
      return;
    }

    const types = encounter.draftNotes
      .map((n) =>
        [...noteTypes.builtin, ...noteTypes.custom].find(
          (nt) => nt.id === n.definitionId,
        ),
      )
      .filter((nt) => nt !== undefined);

    const controller = new AbortController();

    scribe.setAction(encounter.id, {
      type: "Regenerating Notes",
      abort: () => controller.abort(),
    });

    try {
      await Promise.all(
        types.map((nt) =>
          noteGenerator.generateNote(
            encounter,
            nt,
            transcript,
            controller.signal,
            {
              includeFooter: true,
            },
          ),
        ),
      ).then((notes) =>
        notes.forEach((n) => encounters.saveNote(encounter.id, n)),
      );
      scribe.setOutput(encounter.id, undefined);
      scribe.clearAction(encounter.id);
    } catch (ex: unknown) {
      if (!isAbortError(ex)) {
        const scribeError = {
          type: "Regenerating Notes",
          cause: asApplicationError(ex),
          canDismiss: true,
          retry: () => regenerateNotes(encounterId),
        } satisfies ScribeError;

        scribe.setError(encounter.id, scribeError);
        scribe.setOutput(encounter.id, { type: "Error" });
      }

      scribe.clearAction(encounter.id);
    }
  }

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
        encounter={encounter}
        isSaveFailed={failedToSave}
        isSaving={isSaving}
        onAudioFile={handleAudioFile}
        onRecordingFinished={handleRecordingFinished}
        onRecordingStarted={handleRecordingStarted}
        onReset={() => setActiveEncounter(null)}
        onSampleFileSelected={handleSampleFileSelected}
      />
      <div className="flex flex-col gap-6 items-center">
        <Divider className="bg-zinc-100 dark:bg-zinc-900" />
        {!failedToSave && (
          <AIScribeControls
            isDisabled={!canGenerateNote}
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
          <div className="flex flex-col items-center justify-center gap-4 my-6 sm:my-8 max-w-[80%]">
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
