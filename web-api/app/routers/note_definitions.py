from typing import Annotated
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Body
from sqlalchemy import select, and_, or_
from sqlalchemy.exc import NoResultFound

import app.schemas as sch
import app.services.db as db
import app.services.error_handling as errors
from app.services.security import authenticate_user, useUserSession
from app.services.db import useDatabase
from app.config import settings

router = APIRouter(dependencies=[Depends(authenticate_user)])

@router.get("")
def get_note_definitions(userSession: useUserSession, database: useDatabase) -> list[sch.NoteDefinition]:
    """
    Returns the list of note types for the current user,
    including all built-in types and any custom types created by the user.
    """
    
    # Get the built-in note definitions, and those for the current user.
    get_note_definitions = select(db.NoteDefinition) \
        .where(
            db.NoteDefinition.inactivated.is_(None),
            or_(
                db.NoteDefinition.username == settings.SYSTEM_USER, 
                db.NoteDefinition.username == userSession.username
            ),
        ) \
        .order_by(db.NoteDefinition.title)
    
    records = database.execute(get_note_definitions).scalars().all()

    return [sch.NoteDefinition.from_db_record(r) for r in records]

@router.post("")
def create_note_definition(
    userSession: useUserSession, 
    database: useDatabase, 
    *,
    title: Annotated[str, Body()], 
    instructions: Annotated[str, Body()]
) -> sch.NoteDefinition:
    """
    Creates and saves a new custom note definition for the current user.
    """
    
    # Associate the note definition with the current model,
    # which is what the definition is assumed tested against.
    gen_ai_model = settings.GENERATIVE_AI_MODEL

    # Create the new note definition and associate to the current user.
    try:
        sqid = db.new_sqid(database)

        record = db.NoteDefinition(
            id=sqid,
            version=sqid,
            username=userSession.username,
            created=datetime.now(timezone.utc),
            title=title,
            instructions=instructions,
            model=gen_ai_model,
        )

        database.add(record)
        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))
    
    # Return the new note definition.
    return sch.NoteDefinition.from_db_record(record)

@router.patch("/{id}")
def update_note_definition(
    userSession: useUserSession, 
    database: useDatabase, 
    *, 
    id: str, 
    title: Annotated[str | None, Body()] = None,
    instructions: Annotated[str | None, Body()] = None
) -> sch.NoteDefinition:
    """
    Applies updates to an existing custom note definition for the current user.
    The previous version of the note definition is retrained in case it must
    later be recovered.
    """

    # Fetch the existing note definition.
    try:
        get_note_definition = select(db.NoteDefinition) \
            .where(
                db.NoteDefinition.username == userSession.username, 
                db.NoteDefinition.id == id,
                db.NoteDefinition.inactivated.is_(None),
            )
        
        current_record = database.execute(get_note_definition).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Note definition not found")
    
    # Create a new version of the note definition and inactivate the previous.
    try:
        modified = datetime.now(timezone.utc)
        sqid = db.new_sqid(database)

        new_version = db.NoteDefinition(
            id=current_record.id,
            version=sqid,
            username=current_record.username,
            created=modified,
            title=title if title is not None else current_record.title,
            instructions=instructions if instructions is not None else current_record.instructions,
            model=current_record.model,
        )

        database.add(new_version)

        current_record.inactivated = modified

        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))
    
    # Return the updated record.
    return sch.NoteDefinition.from_db_record(new_version)

@router.patch("/{id}/set-default")
def set_default_note_type(userSession: useUserSession, database: useDatabase, *, id: str):
    """
    Sets an existing note definition as the default for the current user.
    """

    try:
        user = database.get_one(db.User, userSession.username)
    except NoResultFound:
        raise errors.BadRequest("User is not registered.")
    
    user.default_note = id
    database.commit()
    
@router.delete("/{id}")
def delete_note_definition(userSession: useUserSession, database: useDatabase, *, id: str):
    """
    Deletes a custom note definition.
    This operation sets the note as inactivated and prevents it from being included
    in queries but does not purge the record in case it needs to be recovered.
    """

    # Fetch the note definition and verify it exists.
    try:
        get_note_definition = select(db.NoteDefinition) \
            .where(
                db.NoteDefinition.username == userSession.username, 
                db.NoteDefinition.id == id,
                db.NoteDefinition.inactivated.is_(None),
            )
        
        record = database.execute(get_note_definition).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Note definition not found")

    # Soft-delete the note definition.
    record.inactivated = datetime.now(timezone.utc)

    try:
        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))
