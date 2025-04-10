"use client";

import { useState } from "react";

import { Link } from "@heroui/react";

import { NoteTypeSelector } from "@/core/note-type-selector";
import { subtitle, title } from "@/core/primitives";
import { IncompleteNoteType, NoteType } from "@/core/types";
import { createNoteType } from "@/services/state/create-note-type";
import { useNoteTypes } from "@/services/state/note-types-context";
import { useCurrentUser } from "@/services/state/user-info-context";

import { CustomNotesEditor } from "@/features/note-type-configuration/custom-notes-editor";
import { CustomNotesList } from "@/features/note-type-configuration/custom-notes-list";
import { OptionalNotesSelector } from "@/features/note-type-configuration/optional-notes-selector";

export default function Settings() {
  const noteTypes = useNoteTypes();
  const userInfo = useCurrentUser();

  const defaultModel = userInfo.settings.availableLlms.recommended;

  const [editedNoteType, setEditNoteType] = useState<IncompleteNoteType>(
    createNoteType(defaultModel),
  );

  const resetEditor = () => {
    setEditNoteType(createNoteType(defaultModel));
  };

  const editExisting = (noteType: NoteType) => {
    setEditNoteType(noteType);
  };

  const handleChanges = (changes: Partial<IncompleteNoteType>) => {
    setEditNoteType((nt) => ({
      ...nt,
      ...changes,
    }));
  };

  const handleDelete = (noteType: NoteType) => {
    if (noteType.id === editedNoteType.id) {
      resetEditor();
    }
  };

  const handleDefaultChanged = (noteType: NoteType | undefined) => {
    if (noteType) {
      userInfo.setDefaultNoteType(noteType.id);
    }
  };

  const handleEnabledNotesChanged = (update: string[]) => {
    if (noteTypes.default && !update.includes(noteTypes.default.id)) {
      userInfo.setDefaultNoteType(
        noteTypes.builtin.filter((nt) => nt.category === "Common")[0].id,
      );
    }

    userInfo.setEnabledNoteTypes(update);
  };

  return (
    <section className="flex flex-col items-center justify-center gap-10 py-2">
      <h1 className={title()}>Settings</h1>
      <div className="flex flex-col gap-6 justify-center items-center max-w-2xl w-full">
        <h2 className={`${subtitle()} text-center`}>Default Note Type</h2>
        <div className="w-[300px] max-w-[90%] sm:max-w-[600px]">
          <NoteTypeSelector
            builtinTypes={noteTypes.builtin}
            customTypes={noteTypes.custom}
            isDisabled={noteTypes.initState !== "Ready"}
            isLoading={noteTypes.initState == "Initializing"}
            selected={noteTypes.default ?? undefined}
            onChange={handleDefaultChanged}
          />
        </div>
        <h2 className={`${subtitle()} text-center`}>Other Note Types</h2>
        <div className="flex flex-col gap-3 text-justify sm:text-left text-small text-zinc-500 max-w-[90%] sm:max-w-[600px]">
          <p>
            Configure your list of available note types using the following
            list.
            <br className="sm:hidden mb-2" />
            <span className="hidden sm:inline">&nbsp;&nbsp;</span>
            Individual Sections can be used standalone, or alongside a Full
            Visit note to improve partial output.
          </p>
        </div>
        <div className="flex flex-col gap-6 justify-center items-center max-w-2xl w-full">
          <OptionalNotesSelector
            availableNotes={noteTypes.allBuiltin}
            className="flex flex-col gap-3 min-w-[75%] sm:min-w-[60%] max-w-[90%] sm:max-w-[600px]"
            enabledNotes={userInfo.settings.enabledNoteTypes}
            onChanged={handleEnabledNotesChanged}
          />
        </div>
        <h2 className={`${subtitle()} text-center`}>Custom Note Types</h2>
        <div className="flex flex-col gap-3 text-justify sm:text-left text-small text-zinc-500 max-w-[90%] sm:max-w-[600px]">
          <p>
            Use the following options to configure a custom note type. For
            assistance, please reach out to the project team at:&nbsp;
            <br className="sm:hidden mb-1" />
            <span className="text-nowrap">
              <Link
                className="text-sm ms-2 sm:ms-0"
                href="mailto:digitalscribe.team@albertahealthservices.ca"
              >
                digitalscribe.team@albertahealthservices.ca
              </Link>
              .
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-6 justify-center items-center max-w-2xl w-full">
          <CustomNotesList
            className="flex flex-col gap-3 min-w-[75%] sm:min-w-[60%] max-w-[90%] sm:max-w-[600px]"
            editedNoteType={editedNoteType}
            onDelete={handleDelete}
            onEdit={editExisting}
          />
          <CustomNotesEditor
            editedNoteType={editedNoteType}
            onChanges={handleChanges}
            onReset={resetEditor}
          />
        </div>
      </div>
    </section>
  );
}
