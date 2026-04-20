from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Body, Depends
from sqlalchemy import or_, select
from sqlalchemy.exc import NoResultFound

import app.config.db as db
import app.errors as errors
import app.schemas as sch
from app.config import settings
from app.config.db import useDatabase
from app.logging import log_data_change
from app.security import authenticate_session, useUserSession
from app.utility.conversion import ConvertToSchema

router = APIRouter(dependencies=[Depends(authenticate_session)])


@router.get("")
def get_note_definitions(
    userSession: useUserSession, database: useDatabase
) -> list[sch.NoteDefinition]:
    """
    Returns the list of note types for the current user,
    including all built-in types and any custom types created by the user.
    """

    # Get the built-in note definitions, and those for the current user.
    get_note_definitions = (
        select(db.NoteDefinition)
        .where(
            db.NoteDefinition.inactivated.is_(None),
            or_(
                db.NoteDefinition.username == settings.SYSTEM_USER,
                db.NoteDefinition.username == userSession.username,
            ),
        )
        .order_by(db.NoteDefinition.title)
    )

    records = database.execute(get_note_definitions).scalars().all()

    return [ConvertToSchema.note_definition(r) for r in records]


@router.post("")
def create_note_definition(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    title: Annotated[str, Body()],
    instructions: Annotated[str, Body()],
    model: Annotated[str, Body()] = settings.DEFAULT_NOTE_GENERATION_MODEL,
) -> sch.NoteDefinition:
    """
    Creates and saves a new custom note definition for the current user.
    """
    # Create the new note definition and associate to the current user.
    try:
        created = datetime.now(timezone.utc).astimezone()
        sqid = db.next_sqid(database)

        record = db.NoteDefinition(
            id=sqid,
            version=sqid,
            username=userSession.username,
            created=created,
            category="Custom",
            title=title,
            instructions=instructions,
            model=model,
            output_type="Markdown",
        )

        database.add(record)
        database.commit()

        # Record the change.
        backgroundTasks.add_task(
            log_data_change,
            database=database,
            session=userSession,
            changed=created,
            entity_type="NOTE DEFINITION",
            change_type="CREATED",
            entity_id=sqid,
        )
    except Exception as e:
        raise errors.DatabaseError(str(e))

    # Return the new note definition.
    return ConvertToSchema.note_definition(record)


@router.patch("/{id}")
def update_note_definition(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    id: str,
    title: Annotated[str | None, Body()] = None,
    instructions: Annotated[str | None, Body()] = None,
    model: Annotated[str | None, Body()] = None,
) -> sch.NoteDefinition:
    """
    Applies updates to an existing custom note definition for the current user.
    The previous version of the note definition is retrained in case it must
    later be recovered.
    """

    # Fetch the existing note definition.
    try:
        get_note_definition = select(db.NoteDefinition).where(
            db.NoteDefinition.username == userSession.username,
            db.NoteDefinition.id == id,
            db.NoteDefinition.inactivated.is_(None),
        )

        current_record = database.execute(get_note_definition).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Note definition not found")

    # Create a new version of the note definition and inactivate the previous.
    try:
        modified = datetime.now(timezone.utc).astimezone()
        sqid = db.next_sqid(database)

        new_version = db.NoteDefinition(
            id=current_record.id,
            version=sqid,
            username=current_record.username,
            created=modified,
            category="Custom",
            title=title if title is not None else current_record.title,
            instructions=(
                instructions
                if instructions is not None
                else current_record.instructions
            ),
            model=model if model is not None else current_record.model,
            output_type=current_record.output_type,
        )

        database.add(new_version)

        current_record.inactivated = modified

        database.commit()

        # Record the changes.
        backgroundTasks.add_task(
            log_data_change,
            database=database,
            session=userSession,
            changed=modified,
            entity_type="NOTE DEFINITION",
            change_type="MODIFIED",
            entity_id=current_record.id,
        )
    except Exception as e:
        raise errors.DatabaseError(str(e))

    # Return the updated record.
    return ConvertToSchema.note_definition(new_version)


@router.delete("/{id}")
def delete_note_definition(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    id: str,
):
    """
    Deletes a custom note definition.
    This operation sets the note as inactivated and prevents it from being included
    in queries but does not purge the record in case it needs to be recovered.
    """

    inactivated = datetime.now(timezone.utc).astimezone()

    # Fetch the note definition and verify it exists.
    try:
        get_note_definition = select(db.NoteDefinition).where(
            db.NoteDefinition.username == userSession.username,
            db.NoteDefinition.id == id,
            db.NoteDefinition.inactivated.is_(None),
        )

        record = database.execute(get_note_definition).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Note definition not found")

    # Soft-delete the note definition.
    record.inactivated = inactivated

    try:
        database.commit()

        # Record the changes.
        backgroundTasks.add_task(
            log_data_change,
            database=database,
            session=userSession,
            changed=inactivated,
            entity_type="NOTE DEFINITION",
            change_type="REMOVED",
            entity_id=record.id,
        )
    except Exception as e:
        raise errors.DatabaseError(str(e))
