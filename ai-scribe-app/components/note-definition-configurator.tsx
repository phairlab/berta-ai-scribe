"use client";

import { useContext, useState } from "react";
import { Link } from "@nextui-org/link";
import { Divider } from "@nextui-org/divider";
import { Input, Textarea } from "@nextui-org/input";
import { Select, SelectItem, SelectSection } from "@nextui-org/select";
import { Button } from "@nextui-org/button";
import shortUUID from "short-uuid";

import { DraftNote, NoteDefinition } from "@/models";
import { ApplicationError } from "@/utility/errors";
import { NoteDefinitionsContext } from "@/contexts/note-definitions-context";
import { SampleRecordingsContext } from "@/contexts/sample-recordings-context";
import { useNoteGenerator } from "@/hooks/use-note-generator";
import {
  formatDatestring,
  sortDefinitionsByTitle,
  sortEncountersByDate,
} from "@/utility/display";
import { webApiAction } from "@/utility/web-api";
import { useAccessToken } from "@/hooks/use-access-token";
import { EncountersContext } from "@/contexts/encounters-context";

import { subtitle } from "./primitives";
import { AIScribeOutput } from "./ai-scribe-output";
import { ActionWaitSpinner } from "./action-wait-spinner";
import { ErrorReport } from "./error-report";

export const NoteDefinitionConfigurator = () => {
  const accessToken = useAccessToken();
  const { encounters } = useContext(EncountersContext);
  const { sampleRecordings } = useContext(SampleRecordingsContext);
  const { noteDefinitions, setNoteDefinitions } = useContext(
    NoteDefinitionsContext,
  );
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
      setNoteDefinitions(
        [...noteDefinitions.filter((d) => d.uuid !== definition.uuid)].sort(
          sortDefinitionsByTitle,
        ),
      );

      reset();

      deleteFromDb(definition);
    }
  };

  const test = async () => {
    const transcript = (
      encounters.find((x) => x.uuid == selectedRecording)?.recording ??
      sampleRecordings.find((s) => s.filename == selectedRecording)
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

      setNoteDefinitions(
        [
          ...noteDefinitions.filter((d) => d.uuid !== definition?.uuid),
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
        savedDefinition = await webApiAction<NoteDefinition>(
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
        savedDefinition = await webApiAction<NoteDefinition>(
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

    setNoteDefinitions(
      [
        ...noteDefinitions.filter((d) => d.uuid !== definition?.uuid),
        savedDefinition,
      ].sort(sortDefinitionsByTitle),
    );
  };

  const deleteFromDb = async (defintion: NoteDefinition, retry: number = 0) => {
    try {
      void (await webApiAction<void>(
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

  return (
    <div className="flex flex-col gap-6 justify-center items-center max-w-2xl w-full">
      <h2 className={`${subtitle()} text-center`}>Custom Note Types</h2>
      <div className="flex flex-col gap-3 text-small text-zinc-500 max-w-[90%] sm:max-w-[600px]">
        <p>
          Use the following options to configure a custom note type. For
          assistance, please reach out to a member of the project team.
        </p>
      </div>
      <div className="flex flex-col gap-3 max-w-[90%] sm:max-w-[600px]">
        {noteDefinitions &&
          noteDefinitions
            .filter((definition) => !definition.isBuiltin)
            .toSorted((a, b) =>
              a.title < b.title ? -1 : a.title === b.title ? 0 : 1,
            )
            .map((definition) => (
              <div key={definition.uuid} className="flex flex-row gap-2 h-5">
                <div
                  className={`basis-full text-start self-stretch w-[300px] ps-2 h-7 ${definition.uuid === activeNoteDefinition.uuid ? "border-s-4 border-blue-500" : ""}`}
                >
                  {definition.title}
                </div>
                {definition.isUnsaved ? (
                  <ActionWaitSpinner size="sm">
                    <span className="text-sm">Saving</span>
                  </ActionWaitSpinner>
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
            ))}
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
                noteDefinitions.find((d) => d.uuid === e.target.value),
              )
            }
          >
            {noteDefinitions.map((template) => (
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
          label="Audio Sample"
          labelPlacement="outside"
          selectedKeys={selectedRecording ? [selectedRecording] : []}
          selectionMode="single"
          onChange={(e) => setSelectedRecording(e.target.value)}
        >
          <SelectSection
            className={
              encounters.some((e) => e.uuid && e.recording.transcript)
                ? ""
                : "hidden"
            }
            title="Recent Recordings"
          >
            {encounters
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
              encounters.some((e) => e.uuid && e.recording.transcript)
                ? "Sample Recordings"
                : undefined
            }
          >
            {sampleRecordings
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
            {noteDefinitions.find((d) => d.uuid == activeNoteDefinition.uuid)
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
          <ActionWaitSpinner onCancel={noteGenerator.abort}>
            Generating Note: {noteGenerator.generatingNoteType.title}
          </ActionWaitSpinner>
        )}
        {error && <ErrorReport errorInfo={error} />}
        {draftNote && (
          <div className="flex flex-col justify-center gap-6">
            <AIScribeOutput text={draftNote.text} title={draftNote.title} />
          </div>
        )}
      </div>
    </div>
  );
};
