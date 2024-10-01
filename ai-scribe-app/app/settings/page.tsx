"use client";

import { subtitle, title } from "@/core-ui/primitives";
import { useAccessToken } from "@/services/session-management/use-access-token";
import { httpAction } from "@/services/web-api/base-queries";

import { CustomNotesEditor } from "@/features/note-types/custom-notes-editor";
import { NoteDefinition } from "@/features/note-types/note-definition";
import { NoteTypeSelector } from "@/features/note-types/note-type-selector";
import { useDefaultNoteType } from "@/features/note-types/use-default-note-type";
import { useNoteTypes } from "@/features/note-types/use-note-types";

export default function Settings() {
  const { accessToken } = useAccessToken();
  const noteDefinitions = useNoteTypes();
  const defaultNoteType = useDefaultNoteType();

  const updateDefault = (definition: NoteDefinition | undefined) => {
    if (definition && definition !== defaultNoteType.state) {
      defaultNoteType.set(definition);
      saveDefaultToDb(definition);
    }
  };

  const saveDefaultToDb = async (
    defintion: NoteDefinition,
    retry: number = 0,
  ) => {
    try {
      void (await httpAction<void>(
        "PATCH",
        `/api/note-definitions/${defintion.uuid}/set-default`,
        {
          accessToken: accessToken,
        },
      ));
    } catch {
      setTimeout(
        () => saveDefaultToDb(defintion, retry + 1),
        (retry + 1) * 3000,
      );
    }
  };

  return (
    <section className="flex flex-col items-center justify-center gap-10 py-2">
      <h1 className={title()}>Settings</h1>
      <div className="flex flex-col gap-6 justify-center items-center max-w-2xl w-full">
        <h2 className={`${subtitle()} text-center`}>Default Note Type</h2>
        <div className="max-w-[90%] sm:max-w-[600px]">
          <NoteTypeSelector
            isLoading={!noteDefinitions.isFetched}
            noteTypes={noteDefinitions.state}
            selected={defaultNoteType.state ?? undefined}
            onChange={updateDefault}
          />
        </div>
        <h2 className={`${subtitle()} text-center`}>Custom Note Types</h2>
        <div className="flex flex-col gap-3 text-small text-zinc-500 max-w-[90%] sm:max-w-[600px]">
          <p>
            Use the following options to configure a custom note type. For
            assistance, please reach out to a member of the project team.
          </p>
        </div>
        <CustomNotesEditor />
      </div>
    </section>
  );
}
