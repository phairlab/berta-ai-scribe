from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import selectinload

import app.config.db as db
import app.errors as errors
import app.schemas as sch
from app.config.db import useDatabase
from app.security import authenticate_session, useUserSession
from app.utility.conversion import ConvertToSchema

router = APIRouter(dependencies=[Depends(authenticate_session)])


@router.get("/check-external-changes")
def get_updates(
    userSession: useUserSession, database: useDatabase, *, cutoff: datetime
) -> sch.ExternalChangeUpdate | None:
    """
    Gets all updates for the current user after the specified date
    that occurred in a different (i.e. external) session.
    """

    # Identify any updates.
    get_updates = select(db.DataChangeRecord).where(
        db.DataChangeRecord.logged > cutoff,
        db.DataChangeRecord.username == userSession.username,
        or_(
            db.DataChangeRecord.session_id != userSession.sessionId,
            db.DataChangeRecord.server_task,
        ),
    )

    try:
        updates = database.execute(get_updates).scalars().all()
    except Exception as exc:
        raise errors.DatabaseError(str(exc))

    has_changes = False

    # Check for updated user info.
    is_user_info_modified = any(
        x for x in updates if x.entity_type == "USER" and x.change_type == "MODIFIED"
    )
    has_changes = has_changes or is_user_info_modified

    if is_user_info_modified:
        try:
            user = database.get_one(db.User, userSession.username)
        except NoResultFound:
            raise errors.BadRequest("User is not registered")
        except Exception as exc:
            raise errors.DatabaseError(str(exc))
    else:
        user = None

    # Check for changed note definitions.
    created_note_definition_ids = {
        x.entity_id
        for x in updates
        if x.entity_type == "NOTE DEFINITION" and x.change_type == "CREATED"
    }
    modified_note_definition_ids = {
        x.entity_id
        for x in updates
        if x.entity_type == "NOTE DEFINITION" and x.change_type == "MODIFIED"
    }
    removed_note_definition_ids = {
        x.entity_id
        for x in updates
        if x.entity_type == "NOTE DEFINITION" and x.change_type == "REMOVED"
    }

    note_definition_ids = set.union(
        created_note_definition_ids,
        modified_note_definition_ids,
        removed_note_definition_ids,
    )
    has_changes = has_changes or any(note_definition_ids)

    if any(note_definition_ids):
        get_note_definitions = (
            select(db.NoteDefinition)
            .where(db.NoteDefinition.id.in_(list(note_definition_ids)))
            .order_by(db.NoteDefinition.title)
        )

        try:
            note_definitions = database.execute(get_note_definitions).scalars().all()
        except Exception as exc:
            raise errors.DatabaseError(str(exc))
    else:
        note_definitions = []

    # Check for changed encounters.
    created_encounter_ids = {
        x.entity_id
        for x in updates
        if x.entity_type == "ENCOUNTER" and x.change_type == "CREATED"
    }
    modified_encounter_ids = {
        x.entity_id
        for x in updates
        if x.entity_type == "ENCOUNTER" and x.change_type == "MODIFIED"
    }
    removed_encounter_ids = {
        x.entity_id
        for x in updates
        if x.entity_type == "ENCOUNTER" and x.change_type == "REMOVED"
    }

    encounter_ids = set.union(
        created_encounter_ids, modified_encounter_ids, removed_encounter_ids
    )
    has_changes = has_changes or any(encounter_ids)

    if any(encounter_ids):
        get_encounters = (
            select(db.Encounter)
            .where(db.Encounter.id.in_(list(encounter_ids)))
            .order_by(db.Encounter.created.desc())
            .options(
                selectinload(db.Encounter.recording),
                selectinload(db.Encounter.draft_notes),
            )
        )

        try:
            encounters = database.execute(get_encounters).scalars().all()
        except Exception as exc:
            raise errors.DatabaseError(str(exc))
    else:
        encounters = []

    if not has_changes:
        return None

    # Return the changes.
    return sch.ExternalChangeUpdate(
        lastUpdate=max(u.logged for u in updates) if any(updates) else cutoff,
        userInfo=ConvertToSchema.user_info(user) if user is not None else None,
        noteDefinitions=sch.ExternalChanges[sch.NoteDefinition](
            created=[
                ConvertToSchema.note_definition(e)
                for e in note_definitions
                if e.id in created_note_definition_ids
            ],
            modified=[
                ConvertToSchema.note_definition(e)
                for e in note_definitions
                if e.id in modified_note_definition_ids
            ],
            removed=[
                ConvertToSchema.note_definition(e)
                for e in note_definitions
                if e.id in removed_note_definition_ids
            ],
        ),
        encounters=sch.ExternalChanges[sch.Encounter](
            created=[
                ConvertToSchema.encounter(e)
                for e in encounters
                if e.id in created_encounter_ids
            ],
            modified=[
                ConvertToSchema.encounter(e)
                for e in encounters
                if e.id in modified_encounter_ids
            ],
            removed=[
                ConvertToSchema.encounter(e)
                for e in encounters
                if e.id in removed_encounter_ids
            ],
        ),
    )
