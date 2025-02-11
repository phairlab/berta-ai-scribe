import { useEffect, useState } from "react";

import { Button } from "@nextui-org/button";
import { Input, Textarea } from "@nextui-org/input";

import { ErrorCard } from "@/core/error-card";
import { LanguageModelSelector } from "@/core/language-model-selector";
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
import { useNoteTypes } from "@/services/state/note-types-context";
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
      onReset();
      onChanges({ instructions: template.instructions, model: template.model });
    }
  };

  const save = () => {
    const instructions = editedNoteType.instructions;
    const title = editedNoteType.title;
    const model = editedNoteType.model;

    if (instructions !== undefined && title !== undefined) {
      noteTypes.save({
        ...editedNoteType,
        instructions,
        title,
        model,
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

  const canTest =
    editedNoteType.instructions &&
    editedNoteType.model &&
    recording &&
    !isGeneratingNote;

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
        undefined,
        transcript,
        controller.signal.current,
      );

      setDraftNote(note);
    } catch (ex: unknown) {
      const isAborted = ex instanceof DOMException && ex.name === "AbortError";

      setDraftNote(undefined);

      if (!isAborted) {
        setError(asApplicationError(ex));
      }
    } finally {
      setIsGeneratingNote(false);
    }
  };

  return (
    <>
      <div className="flex flex-row gap-2 mt-4 w-full items-end">
        <NoteTypeSelector
          builtinTypes={noteTypes.builtin}
          customTypes={noteTypes.custom}
          isDisabled={noteTypes.initState !== "Ready"}
          isLoading={noteTypes.initState === "Initializing"}
          label="Template"
          labelPlacement="outside"
          placeholder="Choose a starting point"
          selected={template}
          onChange={setTemplate}
        />
        <Button
          className="mt-2 sm:mt-6 ms-auto"
          color="default"
          variant="ghost"
          onPress={applyTemplate}
        >
          Apply
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full items-end">
        <Input
          isRequired
          label="Title"
          labelPlacement="outside"
          placeholder="Label your custom note type"
          value={editedNoteType.title ?? ""}
          onValueChange={(title) => onChanges({ title })}
        />
        <LanguageModelSelector
          isRequired
          selected={editedNoteType.model}
          onChange={(model) => onChanges({ model })}
        />
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
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <div className="w-full md:max-w-sm truncate shrink ">
            <MixedRecordingSelector
              selectedRecording={recording}
              onRecordingSelected={setRecording}
            />
          </div>
          <Button
            className="mt-2 sm:mt-6 ms-auto"
            color="default"
            isDisabled={!canTest}
            variant="ghost"
            onPress={test}
          >
            Test
          </Button>
        </div>
        <div className="flex flex-row gap-2 justify-end items-center">
          <Button
            className="mt-2 md:mt-6"
            color="primary"
            isDisabled={!canSave}
            onPress={save}
          >
            {editedNoteType.isNew ? "Create" : "Update Note Type"}
          </Button>
          <Button
            className="mt-2 md:mt-6"
            color="default"
            isDisabled={isGeneratingNote}
            onPress={reset}
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
