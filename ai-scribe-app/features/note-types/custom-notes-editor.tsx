"use client";

import { useState } from "react";

import clsx from "clsx";
import shortUUID from "short-uuid";

import { Button } from "@nextui-org/button";
import { Divider } from "@nextui-org/divider";
import { Input, Textarea } from "@nextui-org/input";
import { Link } from "@nextui-org/link";
import { Select, SelectItem, SelectSection } from "@nextui-org/select";

import { ErrorCard } from "@/core-ui/error-card";
import { WaitMessageSpinner } from "@/core-ui/wait-message-spinner";
import { DraftNote } from "@/services/note-generation/draft-note";
import { useNoteGenerator } from "@/services/note-generation/use-note-generator";
import { useAccessToken } from "@/services/session-management/use-access-token";
import { httpAction } from "@/services/web-api/base-queries";
import { ApplicationError } from "@/utility/errors";
import { formatDatestring } from "@/utility/formatters";
import {
  sortDefinitionsByTitle,
  sortEncountersByDate,
} from "@/utility/sorters";

import { AIScribeOutput } from "@/features/ai-scribe/ai-scribe-output";
import { useEncounters } from "@/features/encounters/use-encounters";
import { useSampleRecordings } from "@/features/sample-recordings/use-sample-recordings";

import { NoteDefinition } from "./note-definition";
import { useNoteTypes } from "./use-note-types";

export const CustomNotesEditor = () => {
  const { accessToken } = useAccessToken();

  const encounters = useEncounters();
  const sampleRecordings = useSampleRecordings();
  const noteTypes = useNoteTypes();
  const [template, setTemplate] = useState<NoteDefinition>();

  const [activeNoteDefinition, setActiveNoteDefinition] = useState<
    Partial<NoteDefinition>
  >(() => createNoteDefinition());

  const [selectedRecording, setSelectedRecording] = useState<string>();
  const [draftNote, setDraftNote] = useState<DraftNote>();
  const [error, setError] = useState<ApplicationError>();

  const noteGenerator = useNoteGenerator({
    onGenerating: () => setError(undefined),
    onGenerated: (draftNote) => setDraftNote(draftNote),
    onError: (error) => setError(error),
  });

  function createNoteDefinition(): Partial<NoteDefinition> {
    return {
      uuid: shortUUID.generate(),
      createdAt: new Date(),
      isBuiltin: false,
      isDefault: false,
      isDiscarded: false,
      isNew: true,
    };
  }

  const reset = () => {
    noteGenerator.abort();
    setActiveNoteDefinition(createNoteDefinition());
    setDraftNote(undefined);
    setError(undefined);
    setTemplate(undefined);
  };

  const updateNoteDefinition = (fields: Partial<NoteDefinition>) => {
    setActiveNoteDefinition({
      ...activeNoteDefinition,
      ...fields,
    });
  };

  const applyTemplate = () => {
    if (template) {
      updateNoteDefinition({ instructions: template.instructions });
    }
  };

  const deleteNoteDefinition = (definition: NoteDefinition) => {
    if (!definition.isBuiltin) {
      noteTypes.set(
        [...noteTypes.state.filter((d) => d.uuid !== definition.uuid)].sort(
          sortDefinitionsByTitle,
        ),
      );

      reset();

      deleteFromDb(definition);
    }
  };

  const test = async () => {
    const transcript = (
      encounters.state.find((x) => x.uuid == selectedRecording)?.recording ??
      sampleRecordings.state.find((s) => s.filename == selectedRecording)
    )?.transcript;

    if (transcript && activeNoteDefinition.instructions) {
      noteGenerator.generateNote(
        activeNoteDefinition as NoteDefinition,
        transcript,
      );
    }
  };

  const save = async () => {
    if (activeNoteDefinition.title && activeNoteDefinition.instructions) {
      const definition = activeNoteDefinition as NoteDefinition;

      noteTypes.set(
        [
          ...noteTypes.state.filter((d) => d.uuid !== definition?.uuid),
          { ...definition, isUnsaved: true },
        ].sort(sortDefinitionsByTitle),
      );

      reset();

      saveToDb(definition);
    }
  };

  const saveToDb = async (definition: NoteDefinition) => {
    let savedDefinition: NoteDefinition;

    if (definition.isNew) {
      try {
        savedDefinition = await httpAction<NoteDefinition>(
          "POST",
          "/api/note-definitions",
          {
            accessToken: accessToken,
            data: {
              title: definition.title,
              instructions: definition.instructions,
            },
          },
        );
      } catch {
        setTimeout(() => saveToDb(definition), 3000);

        return;
      }
    } else {
      try {
        savedDefinition = await httpAction<NoteDefinition>(
          "PATCH",
          `/api/note-definitions/${definition.uuid}`,
          {
            accessToken: accessToken,
            data: {
              title: definition.title,
              instructions: definition.instructions,
            },
          },
        );
      } catch {
        setTimeout(() => saveToDb(definition), 3000);

        return;
      }
    }

    noteTypes.set(
      [
        ...noteTypes.state.filter((d) => d.uuid !== definition?.uuid),
        savedDefinition,
      ].sort(sortDefinitionsByTitle),
    );
  };

  const deleteFromDb = async (defintion: NoteDefinition, retry: number = 0) => {
    try {
      void (await httpAction<void>(
        "DELETE",
        `/api/note-definitions/${defintion.uuid}`,
        {
          accessToken: accessToken,
        },
      ));
    } catch {
      setTimeout(() => deleteFromDb(defintion, retry + 1), (retry + 1) * 3000);
    }
  };

  const isActive = (definition: NoteDefinition): boolean =>
    definition.uuid === activeNoteDefinition.uuid;

  return (
    <div className="flex flex-col gap-6 justify-center items-center max-w-2xl w-full">
      <div className="flex flex-col gap-3 max-w-[90%] sm:max-w-[600px]">
        {!noteTypes.isFetched ? (
          <WaitMessageSpinner size="sm">Loading</WaitMessageSpinner>
        ) : (
          noteTypes.state
            .filter((definition) => !definition.isBuiltin)
            .toSorted((a, b) =>
              a.title < b.title ? -1 : a.title === b.title ? 0 : 1,
            )
            .map((definition) => (
              <div key={definition.uuid} className="flex flex-row gap-2 h-5">
                <div
                  className={clsx(
                    "basis-full text-start self-stretch w-[300px] ps-2 h-7",
                    { "border-s-4 border-blue-500": isActive(definition) },
                  )}
                >
                  {definition.title}
                </div>
                {definition.isUnsaved ? (
                  <WaitMessageSpinner size="sm">Saving</WaitMessageSpinner>
                ) : (
                  <div className="flex flex-row gap-2 h-5">
                    <Link
                      className="text-sm"
                      href="#"
                      onClick={() => setActiveNoteDefinition(definition)}
                    >
                      Edit
                    </Link>
                    <Divider orientation="vertical" />
                    <Link
                      className="text-sm"
                      href="#"
                      onClick={() => deleteNoteDefinition(definition)}
                    >
                      Delete
                    </Link>
                  </div>
                )}
              </div>
            ))
        )}
      </div>
      <div className="md:flex md:flex-row md:gap-2 w-full">
        <div className="w-full">
          <Input
            isRequired
            label="Title"
            labelPlacement="outside"
            value={activeNoteDefinition.title ?? ""}
            onValueChange={(title) => updateNoteDefinition({ title: title })}
          />
        </div>
        <div className="flex flex-row gap-2 w-full items-center">
          <Select
            label="Template"
            labelPlacement="outside"
            selectedKeys={template ? [template.uuid] : []}
            selectionMode="single"
            onChange={(e) =>
              setTemplate(
                noteTypes.state.find((d) => d.uuid === e.target.value),
              )
            }
          >
            {noteTypes.state.map((template) => (
              <SelectItem key={template.uuid}>{template.title}</SelectItem>
            ))}
          </Select>
          <Button
            className="mt-6"
            color="default"
            variant="ghost"
            onClick={applyTemplate}
          >
            Apply
          </Button>
        </div>
      </div>
      <Textarea
        isRequired
        label="Instructions"
        labelPlacement="outside"
        maxRows={30}
        minRows={10}
        placeholder="Enter your note instructions here"
        value={activeNoteDefinition.instructions ?? ""}
        onValueChange={(instructions) =>
          updateNoteDefinition({ instructions: instructions })
        }
      />
      <div className="flex flex-col md:flex-row gap-2 w-full justify-end items-center">
        <Select
          isDisabled={!encounters.isFetched || !sampleRecordings.isFetched}
          isLoading={!encounters.isFetched || !sampleRecordings.isFetched}
          label="Audio Sample"
          labelPlacement="outside"
          selectedKeys={selectedRecording ? [selectedRecording] : []}
          selectionMode="single"
          onChange={(e) => setSelectedRecording(e.target.value)}
        >
          <SelectSection
            className={clsx({
              hidden: encounters.state.some(
                (e) => e.uuid && e.recording.transcript,
              ),
            })}
            title="Recent Recordings"
          >
            {encounters.state
              .toSorted(sortEncountersByDate)
              .filter((e) => e.uuid && e.recording.transcript)
              .slice(0, 10)
              .map((encounter) => (
                <SelectItem key={encounter.uuid!}>
                  {`${formatDatestring(new Date(encounter.createdAt))}${encounter.title ? ` (${encounter.title.toUpperCase()})` : ""}`}
                </SelectItem>
              ))}
          </SelectSection>
          <SelectSection
            title={
              encounters.state.some((e) => e.uuid && e.recording.transcript)
                ? "Sample Recordings"
                : undefined
            }
          >
            {sampleRecordings.state
              .map((s) => s.filename)
              .toSorted()
              .map((filename) => (
                <SelectItem key={filename}>{filename.split(".")[0]}</SelectItem>
              ))}
          </SelectSection>
        </Select>
        <div className="flex flex-row gap-2 w-full justify-end items-center">
          <Button
            className="mt-2 md:mt-6"
            color="default"
            isDisabled={
              !activeNoteDefinition.title ||
              !activeNoteDefinition.instructions ||
              !selectedRecording ||
              !!noteGenerator.generatingNoteType
            }
            variant="ghost"
            onClick={test}
          >
            Test
          </Button>
          <Button
            className="mt-2 md:mt-6"
            color="primary"
            isDisabled={
              !activeNoteDefinition.title || !activeNoteDefinition.instructions
            }
            onClick={save}
          >
            {noteTypes.state.find((d) => d.uuid == activeNoteDefinition.uuid)
              ? "Save"
              : "Create"}
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
        {error && <ErrorCard errorInfo={error} />}
        {draftNote && (
          <div className="flex flex-col justify-center gap-6">
            <AIScribeOutput text={draftNote.text} title={draftNote.title} />
          </div>
        )}
      </div>
    </div>
  );
};
