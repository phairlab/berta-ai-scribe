import { useEffect, useState } from "react";

import { Button } from "@nextui-org/button";
import { Input, Textarea } from "@nextui-org/input";

import { ErrorCard } from "@/core/error-card";
import { MixedRecordingSelector } from "@/core/mixed-recording-selector";
import { NoteCard } from "@/core/note-card";
import { NoteTypeSelector } from "@/core/note-type-selector";
import {
  DraftNote,
  IncompleteNoteType,
  NoteType,
  Recording,
  SampleRecording,
} from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { useNoteTypes } from "@/services/application-state/note-types-context";
import { ApplicationError, asApplicationError } from "@/utility/errors";
import { RequiredFields } from "@/utility/typing";
import { useAbortController } from "@/utility/use-abort-controller";

import { useNoteGenerator } from "@/features/ai-scribe/use-note-generator";

type CustomNotesEditorProps = {
  editedNoteType: IncompleteNoteType;
  onChanges: (changes: Partial<IncompleteNoteType>) => void;
  onReset: () => void;
};

export const CustomNotesEditor = ({
  editedNoteType,
  onChanges,
  onReset,
}: CustomNotesEditorProps) => {
  const noteTypes = useNoteTypes();
  const noteGenerator = useNoteGenerator();
  const controller = useAbortController();

  const [template, setTemplate] = useState<NoteType>();
  const [recording, setRecording] = useState<Recording | SampleRecording>();
  const [draftNote, setDraftNote] = useState<DraftNote>();
  const [error, setError] = useState<ApplicationError>();
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);

  const canSave =
    editedNoteType.instructions !== undefined &&
    editedNoteType.title !== undefined;

  const reset = () => {
    controller.abort();
    setIsGeneratingNote(false);
    setDraftNote(undefined);
    setError(undefined);
    setTemplate(undefined);

    onReset();
  };

  const applyTemplate = () => {
    if (template) {
      onChanges({ instructions: template.instructions });
    }
  };

  const save = () => {
    const instructions = editedNoteType.instructions;
    const title = editedNoteType.title;

    if (instructions !== undefined && title !== undefined) {
      noteTypes.save({
        ...editedNoteType,
        instructions,
        title,
      } satisfies NoteType);
      reset();
    }
  };

  useEffect(() => {
    controller.abort();
    setIsGeneratingNote(false);
    setDraftNote(undefined);
    setError(undefined);
    setTemplate(undefined);
  }, [editedNoteType]);

  const canTest = editedNoteType.instructions && recording && !isGeneratingNote;

  const test = async () => {
    setError(undefined);

    const transcript = recording?.transcript;

    if (!transcript || editedNoteType.instructions === undefined) {
      return;
    }

    try {
      setIsGeneratingNote(true);

      const note = await noteGenerator.generateNote(
        { id: "TEST" },
        editedNoteType as RequiredFields<IncompleteNoteType, "instructions">,
        transcript,
        controller.signal.current,
      );

      setDraftNote(note);
    } catch (ex: unknown) {
      const isAborted = ex instanceof DOMException && ex.name === "AbortError";

      if (!isAborted) {
        setError(asApplicationError(ex));
      }
    } finally {
      setIsGeneratingNote(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 w-full items-end">
        <Input
          isRequired
          label="Title"
          labelPlacement="outside"
          value={editedNoteType.title ?? ""}
          onValueChange={(title) => onChanges({ title: title })}
        />
        <NoteTypeSelector
          builtinTypes={noteTypes.builtin}
          customTypes={noteTypes.custom}
          isDisabled={noteTypes.initState !== "Ready"}
          isLoading={noteTypes.initState === "Initializing"}
          label="Template"
          labelPlacement="outside"
          selected={template}
          onChange={setTemplate}
        />
        <Button
          className="mt-2 sm:mt-6 ms-auto"
          color="default"
          variant="ghost"
          onClick={applyTemplate}
        >
          Apply
        </Button>
      </div>
      <Textarea
        isRequired
        label="Instructions"
        labelPlacement="outside"
        maxRows={30}
        minRows={10}
        placeholder="Enter your note instructions here"
        value={editedNoteType.instructions ?? ""}
        onValueChange={(instructions) =>
          onChanges({ instructions: instructions })
        }
      />
      <div className="flex flex-col md:flex-row gap-5 w-full items-center">
        <div className="flex flex-col sm:flex-row flex-row gap-2 w-full">
          <MixedRecordingSelector
            selectedRecording={recording}
            onRecordingSelected={setRecording}
          />
          <Button
            className="mt-2 sm:mt-6 ms-auto"
            color="default"
            isDisabled={!canTest}
            variant="ghost"
            onClick={test}
          >
            Test
          </Button>
        </div>
        <div className="flex flex-row gap-2 justify-end items-center">
          <Button
            className="mt-2 md:mt-6"
            color="primary"
            isDisabled={!canSave}
            onClick={save}
          >
            {editedNoteType.isNew ? "Create" : "Save"}
          </Button>
          <Button
            className="mt-2 md:mt-6"
            color="default"
            isDisabled={isGeneratingNote}
            onClick={reset}
          >
            Reset
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-4 w-full">
        {isGeneratingNote && (
          <WaitMessageSpinner onCancel={controller.abort}>
            Generating Note
          </WaitMessageSpinner>
        )}
        {error && <ErrorCard error={error} />}
        {draftNote && (
          <NoteCard canFlag={false} note={draftNote} showRawOutput={true} />
        )}
      </div>
    </>
  );
};
