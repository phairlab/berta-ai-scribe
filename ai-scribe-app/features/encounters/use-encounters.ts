import { use } from "react";

import { DraftNote, Encounter } from "@/core/types";
import { ApplicationStateContext } from "@/services/application-state/application-state-context";
import { useWebApi } from "@/services/web-api/use-web-api";
import * as convert from "@/utility/converters";
import { asApplicationError, InvalidOperationError } from "@/utility/errors";
import { byDate } from "@/utility/sorters";
import { setTracking } from "@/utility/tracking";

/**
 * Hook returning an orchestrator for working with {@link Encounter}
 * state and data persistence.
 */
export function useEncounters() {
  const applicationState = use(ApplicationStateContext);
  const webApi = useWebApi();

  const encounters = applicationState.encounters;

  /** Sets the indicated encounter as active.  A null value unsets it. */
  const setActive = (encounter: Encounter | null) => {
    if (!encounter) {
      encounters.setActive(null);
    } else {
      encounters.setActive(encounter.uuid);
    }
  };

  /** Determines whether the preconditions for {@link canCreate} hold for this encounter. */
  const canCreate = (encounter: Encounter) =>
    !encounters.exists(encounter.uuid);

  /** Adds a new encounter and persists it. */
  const create = async (encounter: Encounter, audio: File) => {
    if (encounters.exists(encounter.uuid)) {
      throw new InvalidOperationError(
        "Saving a new encounter with an ID that already exists",
      );
    }

    const tempRecord = setTracking(encounter, "Persisting");

    encounters.put(tempRecord);

    try {
      // Persist the data.
      const persistedRecord = await webApi.encounters.create(
        audio,
        encounter.createdAt,
      );

      // Mutate temp records to update persisted id.
      encounter.uuid = persistedRecord.uuid;
      tempRecord.uuid = persistedRecord.uuid;

      encounters.put(convert.fromWebApiEncounter(persistedRecord));
    } catch (ex: unknown) {
      // Report on failure.
      encounters.put(
        setTracking(encounter, "Not Persisted", asApplicationError(ex)),
      );
    }
  };

  /** Determines whether the preconditions for {@link canUpdate} hold for this encounter. */
  const canUpdate = (encounter: Encounter) =>
    encounters.exists(encounter.uuid) &&
    encounters.get(encounter.uuid)!.tracking.isPersisted === true &&
    encounters.get(encounter.uuid)!.tracking.isSaving === false;

  /** Updates data for an existing encounter and persists the changes. */
  const update = async (encounter: Encounter) => {
    if (!encounters.exists(encounter.uuid)) {
      throw new InvalidOperationError("Updating an unknown encounter");
    }

    if (encounters.get(encounter.uuid)!.tracking.isPersisted === false) {
      throw new InvalidOperationError(
        "Saving an encounter that has not yet been persisted",
      );
    }

    if (encounters.get(encounter.uuid)!.tracking.isSaving === true) {
      throw new InvalidOperationError(
        "Saving an encounter that is currently being saved",
      );
    }

    // Determine any changes that should be persisted.
    const existing = encounters.get(encounter.uuid)!;
    const changes: Partial<{ title: string; transcript: string }> = {};

    if (encounter.title !== existing.title) {
      changes.title = encounter.title;
    }

    if (encounter.recording?.transcript !== existing.recording?.transcript) {
      changes.transcript = encounter.recording?.transcript;
    }

    // Directly update when no changes need to be persisted.
    if (Object.keys(changes).length === 0) {
      encounters.put(setTracking(encounter, "Synchronized"));
    } else {
      // Otherwise update and persist changes.
      encounters.put(setTracking(encounter, "Synchronizing"));

      try {
        const persistedRecord = await webApi.encounters.update(
          encounter.uuid,
          changes,
        );

        encounters.put(convert.fromWebApiEncounter(persistedRecord));
      } catch (ex: unknown) {
        // Report on failure.
        encounters.put(
          setTracking(encounter, "Locally Modified", asApplicationError(ex)),
        );
      }
    }
  };

  /** Determines whether the preconditions for {@link canSave} hold for this encounter. */
  const canSave = (encounter: Encounter) =>
    canCreate(encounter) || canUpdate(encounter);

  /** Adds or updates and then persists an encounter with the provided data. */
  const save = async (encounter: Encounter, audio?: File) => {
    if (encounters.status !== "Ready") {
      throw new InvalidOperationError("Saving an encounter before state ready");
    }

    if (!encounters.exists(encounter.uuid)) {
      if (audio === undefined) {
        throw new InvalidOperationError(
          "Saving a new encounter without audio data",
        );
      }

      await create(encounter, audio);
    } else {
      await update(encounter);
    }
  };

  /** Determines whether the preconditions for {@link purge} hold for this encounter. */
  const canPurge = (encounter: Encounter) =>
    encounters.exists(encounter.uuid) &&
    encounters.get(encounter.uuid)!.tracking.isPersisted === true;
  // encounters.get(encounter.uuid)!.tracking.isSaving === false;

  /** Removes the encounter and persists the change. */
  const purge = async (encounter: Encounter) => {
    if (encounters.status !== "Ready") {
      throw new InvalidOperationError(
        "Deleting an encounter before state ready",
      );
    }

    if (!encounters.exists(encounter.uuid)) {
      throw new InvalidOperationError("Deleting an unknown encounter");
    }

    if (encounters.get(encounter.uuid)!.tracking.isPersisted === false) {
      throw new InvalidOperationError(
        "Deleting an encounter that has not yet been persisted",
      );
    }

    // if (encounters.get(encounter.uuid)!.tracking.isSaving === true) {
    //   throw new InvalidOperationError(
    //     "Deleting an encounter that is being saved",
    //   );
    // }

    // Remove from the list.
    encounters.remove(encounter.uuid);

    // Persist the chanage.
    try {
      await webApi.encounters.purgeData(encounter.uuid);
    } catch (ex: unknown) {
      // Revert the change on failure.
      // encounters.put(
      //   setTracking(
      //     encounter,
      //     encounter.tracking.state,
      //     asApplicationError(ex),
      //   ),
      // );
    }
  };

  /** Determines whether the preconditions for {@link saveNote} hold for this encounter. */
  const canSaveNote = (encounter: Encounter) =>
    encounters.exists(encounter.uuid) &&
    encounters.get(encounter.uuid)!.tracking.isPersisted === true;

  /** Saves a note to an encounter and persists the change. */
  const saveNote = async (encounter: Encounter, note: DraftNote) => {
    if (encounters.status !== "Ready") {
      throw new InvalidOperationError("Saving note before state ready");
    }

    if (!encounters.exists(encounter.uuid)) {
      throw new InvalidOperationError("Saving note to an unknown encounter");
    }

    if (!encounter.tracking.isPersisted) {
      throw new InvalidOperationError(
        "Saving note to an un-persisted encounter",
      );
    }

    // Update encounter notes.
    const notes = [
      ...encounter.draftNotes.filter(
        (n) => n.noteDefinitionUuid !== note.noteDefinitionUuid,
      ),
      setTracking(note, "Persisting"),
    ].sort(byDate((x) => x.createdAt, "Descending"));

    const updated: Encounter = { ...encounter, draftNotes: notes };

    encounters.put(updated);

    try {
      // Persist the change.
      const persistedNote = await webApi.encounters.createDraftNote(
        encounter.uuid,
        note.noteDefinitionUuid,
        note.text,
        note.tag,
      );

      const notes = [
        ...updated.draftNotes.filter((n) => n.tag !== note.tag),
        convert.fromWebApiDraftNote(persistedNote),
      ].sort(byDate((x) => x.createdAt, "Descending"));

      encounters.put({ ...updated, draftNotes: notes });
    } catch (ex: unknown) {
      // Report on failure.
      const notes = [
        ...updated.draftNotes.filter((n) => n.tag !== note.tag),
        setTracking(note, "Not Persisted", asApplicationError(ex)),
      ];

      encounters.put({ ...updated, draftNotes: notes });
    }
  };

  /** Determines whether the preconditions for {@link discardNote} hold for this encounter. */
  const canDiscardNote = (encounter: Encounter, note: DraftNote) =>
    encounters.exists(encounter.uuid) &&
    encounters.get(encounter.uuid)!.tracking.isPersisted === true &&
    encounters
      .get(encounter.uuid)!
      .draftNotes.find((n) => n.tag === note.tag) !== undefined &&
    encounters.get(encounter.uuid)!.draftNotes.find((n) => n.tag === note.tag)!
      .tracking.isPersisted === true;

  /** Removes the note from the specified encounter */
  const discardNote = async (encounter: Encounter, note: DraftNote) => {
    if (encounters.status !== "Ready") {
      throw new InvalidOperationError("Discarding note before state ready");
    }

    if (!encounters.exists(encounter.uuid)) {
      throw new InvalidOperationError(
        "Discarding note on an unknown encounter",
      );
    }

    if (encounters.get(encounter.uuid)!.tracking.isPersisted === false) {
      throw new InvalidOperationError(
        "Discarding a note from an encounter that is not persisted",
      );
    }

    if (
      encounters
        .get(encounter.uuid)!
        .draftNotes.find((n) => n.tag === note.tag)!.tracking.isPersisted ===
      false
    ) {
      throw new InvalidOperationError(
        "Discarding a note that has not been persisted",
      );
    }

    if (
      encounters
        .get(encounter.uuid)!
        .draftNotes.find((n) => n.tag === note.tag) === undefined
    ) {
      throw new InvalidOperationError("Discarding an unknown note");
    }

    // Remove the note from state and persist the change.
    const notes = [...encounter.draftNotes.filter((n) => n.tag === note.tag)];

    encounters.put({ ...encounter, draftNotes: notes });

    try {
      await webApi.encounters.discardDraftNote(encounter.uuid, note.tag);
    } catch (ex: unknown) {
      // Revert the change if failed.
      const notes = [
        ...encounter.draftNotes.filter((n) => n.tag !== note.tag),
        setTracking(note, note.tracking.state, asApplicationError(ex)),
      ];

      encounters.put({ ...encounter, draftNotes: notes });
    }
  };

  return {
    isReady: encounters.status === "Ready",
    list: encounters.list,
    activeEncounter: encounters.activeEncounter,
    setActive,
    save,
    purge,
    saveNote,
    discardNote,
    check: {
      canSave,
      canPurge,
      canSaveNote,
      canDiscardNote,
    },
  } as const;
}
