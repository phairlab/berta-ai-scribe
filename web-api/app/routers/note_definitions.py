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
async def get_note_definitions(userSession: useUserSession, database: useDatabase) -> list[sch.NoteDefinition]:
    # Get the built-in note definitions, and those for the current user.
    records = database.execute(
        select(db.NoteDefinition) \
            .where(and_(
                or_(db.NoteDefinition.username == settings.SYSTEM_USER, db.NoteDefinition.username == userSession.username),
                db.NoteDefinition.is_discarded == False
            )) \
            .order_by(db.NoteDefinition.title)
    ).all()

    return [sch.NoteDefinition.from_db_record(record[0]) for record in records]

@router.post("")
async def create_note_definition(
    userSession: useUserSession, 
    database: useDatabase, 
    *,
    title: Annotated[str, Body()], 
    instructions: Annotated[str, Body()]
) -> sch.NoteDefinition:
    # Get the current user record.
    try:
        user: db.User = database.execute(
            select(db.User) \
                .where(db.User.username == userSession.username)
        ).one()[0]
    except NoResultFound:
        raise errors.BadRequest("User is not registered.")

    # Create the new note definition and associate to the current user.
    try:
        definition = db.NoteDefinition(
            title=title, 
            instructions=instructions,
            created_at=datetime.now(timezone.utc),
        )
        user.note_definitions.append(definition)

        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))
    
    # Return the new note definition.
    return sch.NoteDefinition.from_db_record(definition)

@router.patch("/{uuid}")
async def update_note_definition(
    userSession: useUserSession, 
    database: useDatabase, 
    *, 
    uuid: str, 
    title: Annotated[str | None, Body()] = None,
    instructions: Annotated[str | None, Body()] = None
) -> sch.NoteDefinition:
    # Fetch the existing note definition.
    try:
        note_definition: db.NoteDefinition = database.execute(
            select(db.NoteDefinition) \
                .where(and_(db.NoteDefinition.username == userSession.username, db.NoteDefinition.uuid == uuid))
        ).one()[0]
    except NoResultFound:
        raise errors.NotFound("Note definition not found")
    
    if title is not None:
        note_definition.title = title

    if instructions is not None:
        note_definition.instructions = instructions

    try:
        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))
    
    # Return the note definition with applied changes.
    return sch.NoteDefinition.from_db_record(note_definition)
    
@router.delete("/{uuid}")
async def delete_note_definition(userSession: useUserSession, database: useDatabase, *, uuid: str):
    # Fetch the note definition and confirm it exists.
    try:
        note_definition: db.NoteDefinition = database.execute(
            select(db.NoteDefinition) \
                .where(and_(db.NoteDefinition.username == userSession.username, db.NoteDefinition.uuid == uuid))
        ).one()[0]
    except NoResultFound:
        raise errors.NotFound("Note definition not found")

    # Soft-delete the note definition.
    note_definition.is_discarded = True

    try:
        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))
