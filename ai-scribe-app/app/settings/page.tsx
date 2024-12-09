"use client";

import { useState } from "react";

import { NoteTypeSelector } from "@/core/note-type-selector";
import { subtitle, title } from "@/core/primitives";
import { IncompleteNoteType, NoteType } from "@/core/types";
import { createNoteType } from "@/services/application-state/create-note-type";
import { useNoteTypes } from "@/services/application-state/use-note-types";
import { setTracking } from "@/utility/tracking";

import { CustomNotesEditor } from "@/features/custom-note-types/custom-notes-editor";
import { CustomNotesList } from "@/features/custom-note-types/custom-notes-list";

export default function Settings() {
  const noteTypes = useNoteTypes();

  const [editedNoteType, setEditNoteType] =
    useState<IncompleteNoteType>(createNoteType());

  const resetEditor = () => {
    setEditNoteType(createNoteType());
  };

  const editExisting = (noteType: NoteType) => {
    setEditNoteType(setTracking(noteType, "Locally Modified"));
  };

  const handleChanges = (changes: Partial<IncompleteNoteType>) => {
    setEditNoteType({
      ...editedNoteType,
      ...changes,
    });
  };

  const handleDelete = (noteType: NoteType) => {
    if (noteType.id === editedNoteType.id) {
      resetEditor();
    }
  };

  const handleDefaultChanged = (noteType: NoteType | undefined) => {
    if (noteType) {
      noteTypes.setDefault(noteType.id);
    }
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
            isLoading={!noteTypes.isReady}
            selected={noteTypes.default ?? undefined}
            onChange={handleDefaultChanged}
          />
        </div>
        <h2 className={`${subtitle()} text-center`}>Custom Note Types</h2>
        <div className="flex flex-col gap-3 text-small text-zinc-500 max-w-[90%] sm:max-w-[600px]">
          <p>
            Use the following options to configure a custom note type. For
            assistance, please reach out to a member of the project team.
          </p>
        </div>
        <div className="flex flex-col gap-6 justify-center items-center max-w-2xl w-full">
          <CustomNotesList
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
