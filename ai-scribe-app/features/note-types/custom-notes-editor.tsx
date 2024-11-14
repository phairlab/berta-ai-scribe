import { useState } from "react";

import { Button } from "@nextui-org/button";
import { Input, Textarea } from "@nextui-org/input";

import { ErrorCard } from "@/core/error-card";
import { NoteCard } from "@/core/note-card";
import {
  DraftNote,
  EditedNoteType,
  NoteType,
  Recording,
  SampleRecording,
} from "@/core/types";
import { WaitMessageSpinner } from "@/core/wait-message-spinner";
import { useNoteGenerator } from "@/services/note-generation/use-note-generator";
import { ApplicationError } from "@/utility/errors";
import { RequiredFields } from "@/utility/typing";

import { MixedRecordingsSelector } from "./mixed-recordings-selector";
import { NoteTypeSelector } from "./note-type-selector";
import { useNoteTypes } from "./use-note-types";

type CustomNotesEditorProps = {
  editedNoteType: EditedNoteType;
  onChanges: (changes: Partial<EditedNoteType>) => void;
  onReset: () => void;
};

export const CustomNotesEditor = ({
  editedNoteType,
  onChanges,
  onReset,
}: CustomNotesEditorProps) => {
  const noteTypes = useNoteTypes();
  const [template, setTemplate] = useState<NoteType>();

  const [recording, setRecording] = useState<Recording | SampleRecording>();
  const [draftNote, setDraftNote] = useState<DraftNote>();
  const [error, setError] = useState<ApplicationError>();

  const noteGenerator = useNoteGenerator({
    onGenerating: () => setError(undefined),
    onGenerated: (draftNote) => setDraftNote(draftNote),
    onError: (error) => setError(error),
  });

  const reset = () => {
    noteGenerator.abort();
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
    noteTypes.save(editedNoteType);
    reset();
  };

  const canTest =
    editedNoteType.instructions &&
    recording &&
    !noteGenerator.generatingNoteType;

  const test = async () => {
    const transcript = recording?.transcript;

    if (transcript && editedNoteType.instructions !== undefined) {
      noteGenerator.generateNote(
        editedNoteType as RequiredFields<EditedNoteType, "instructions">,
        "(TEST)",
        transcript,
      );
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
          isLoading={!noteTypes.isReady}
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
          <MixedRecordingsSelector
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
            isDisabled={!noteTypes.check.canSave(editedNoteType)}
            onClick={save}
          >
            {editedNoteType.tracking.isPersisted ? "Save" : "Create"}
          </Button>
          <Button
            className="mt-2 md:mt-6"
            color="default"
            isDisabled={!!noteGenerator.generatingNoteType}
            onClick={reset}
          >
            Reset
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {noteGenerator.generatingNoteType && (
          <WaitMessageSpinner onCancel={noteGenerator.abort}>
            Generating Note: {noteGenerator.generatingNoteType.title}
          </WaitMessageSpinner>
        )}
        {error && <ErrorCard error={error} />}
        {draftNote && (
          <NoteCard note={draftNote} showRawOutput={true} showTitle={false} />
        )}
      </div>
    </>
  );
};
