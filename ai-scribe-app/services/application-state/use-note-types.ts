import { use } from "react";

import { EditedNoteType, NoteType } from "@/core/types";
import { ApplicationStateContext } from "@/services/application-state/application-state-context";
import { useWebApi } from "@/services/web-api/use-web-api";
import * as convert from "@/utility/converters";
import { asApplicationError, InvalidOperationError } from "@/utility/errors";
import { setTracking } from "@/utility/tracking";

/**
 * Hook returning an orchestrator for working with {@link NoteType}
 * state and data persistence.
 */
export function useNoteTypes() {
  const applicationState = use(ApplicationStateContext);
  const webApi = useWebApi();

  const noteTypes = applicationState.noteTypes;

  /** Sets the default note type. A null value unsets it. */
  const setDefault = (id: string) => {
    if (noteTypes.exists(id)) {
      noteTypes.setDefault(id);
      webApi.user.setDefaultNoteType(id);
    }
  };

  /** Determines whether the note type has the fields required to persist the record. */
  const hasRequiredFields = (
    noteType: NoteType | EditedNoteType,
  ): noteType is NoteType => !!noteType.title && !!noteType.instructions;

  /** Determines whether the preconditions for {@link create} hold for this note type. */
  const canCreate = (noteType: EditedNoteType) =>
    hasRequiredFields(noteType) &&
    !noteTypes.list.find((nt) => nt.id === noteType.id);

  /** Adds a new note type and persists it. */
  const create = async (noteType: NoteType) => {
    if (noteTypes.list.find((nt) => nt.id === noteType.id)) {
      throw new InvalidOperationError(
        "Creating a note type with an ID that is already taken",
      );
    }

    const tempRecord = setTracking(noteType, "Persisting");

    noteTypes.put(tempRecord);

    try {
      const persistedRecord = await webApi.noteDefinitions.create(
        noteType.title,
        noteType.instructions,
      );

      // Mutate temp record to update persisted id.
      noteType.id = persistedRecord.id;
      tempRecord.id = persistedRecord.id;

      noteTypes.put(convert.fromWebApiNoteType(persistedRecord));
    } catch (ex: unknown) {
      // Report on failure.
      noteTypes.put(
        setTracking(noteType, "Not Persisted", asApplicationError(ex)),
      );
    }
  };

  /** Determines whether the preconditions for {@link update} hold for this note type. */
  const canUpdate = (noteType: EditedNoteType) =>
    hasRequiredFields(noteType) &&
    noteTypes.exists(noteType.id) &&
    noteTypes.get(noteType.id)!.tracking.isPersisted === true &&
    noteTypes.get(noteType.id)!.tracking.isSaving === false;

  /** Updates the data for an existing note type and persists the changes. */
  const update = async (noteType: NoteType) => {
    if (!noteTypes.exists(noteType.id)) {
      throw new InvalidOperationError("Saving an unknown note type");
    }

    if (noteTypes.get(noteType.id)!.tracking.isPersisted === false) {
      throw new InvalidOperationError(
        "Saving a note type that has not yet been persisted",
      );
    }

    if (noteTypes.get(noteType.id)!.tracking.isSaving === true) {
      throw new InvalidOperationError(
        "Saving a note type that is currently being saved",
      );
    }

    noteTypes.put(setTracking(noteType, "Synchronizing"));

    try {
      const persistedRecord = await webApi.noteDefinitions.update(noteType.id, {
        title: noteType.title,
        instructions: noteType.instructions,
      });

      noteTypes.put(convert.fromWebApiNoteType(persistedRecord));
    } catch (ex: unknown) {
      // Report on failure.
      noteTypes.put(
        setTracking(noteType, "Locally Modified", asApplicationError(ex)),
      );
    }
  };

  /** Determines whether the preconditions for {@link save} hold for this note type. */
  const canSave = (noteType: EditedNoteType) =>
    canCreate(noteType) || canUpdate(noteType);

  /** Adds or updates and then persists a note type with the provided data. */
  const save = async (noteType: EditedNoteType) => {
    if (noteTypes.status !== "Ready") {
      throw new InvalidOperationError("Saving a note type before state ready");
    }

    if (!hasRequiredFields(noteType)) {
      throw new InvalidOperationError(
        "Saving a note type without required fields",
      );
    }

    if (!noteTypes.exists(noteType.id)) {
      await create(noteType);
    } else {
      await update(noteType);
    }
  };

  /** Determines whether the preconditions for {@link discard} hold for this note type. */
  const canDiscard = (noteType: NoteType) =>
    noteTypes.exists(noteType.id) &&
    noteTypes.get(noteType.id)!.tracking.isPersisted === true &&
    noteTypes.get(noteType.id)!.tracking.isSaving === false &&
    noteTypes.get(noteType.id)!.isBuiltin === false;

  /** Removes a note type and persists the change. */
  const discard = async (noteType: NoteType) => {
    if (noteTypes.status !== "Ready") {
      throw new InvalidOperationError(
        "Discarding a note type before state ready",
      );
    }

    if (!noteTypes.exists(noteType.id)) {
      throw new InvalidOperationError("Deleting an unknown note type");
    }

    if (noteTypes.get(noteType.id)!.tracking.isPersisted === false) {
      throw new InvalidOperationError(
        "Deleting a note type that is not persisted",
      );
    }

    if (noteTypes.get(noteType.id)!.tracking.isSaving === true) {
      throw new InvalidOperationError(
        "Deleting a note type that is currently being saved",
      );
    }

    if (noteTypes.get(noteType.id)!.isBuiltin === true) {
      throw new InvalidOperationError("Deleting a built-in note type");
    }

    noteTypes.remove(noteType.id);

    try {
      await webApi.noteDefinitions.discard(noteType.id);
    } catch (ex: unknown) {
      // Revert the state change on failure.
      noteTypes.put(
        setTracking(noteType, noteType.tracking.state, asApplicationError(ex)),
      );
    }
  };

  return {
    isReady: noteTypes.status === "Ready",
    builtin: noteTypes.list.filter((nt) => nt.isBuiltin),
    custom: noteTypes.list.filter((nt) => !nt.isBuiltin),
    default: noteTypes.default,
    setDefault,
    save,
    discard,
    check: {
      canSave,
      canDiscard,
    },
  } as const;
}
