import os
from datetime import datetime, timezone
from typing import Annotated
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, UploadFile, Depends, Body
from fastapi.responses import FileResponse
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import NoResultFound

import app.schemas as sch
import app.services.db as db
import app.services.error_handling as errors
from app.services.audio_processing import reformat_audio
from app.services.security import authenticate_user, useUserSession
from app.services.db import useDatabase
from app.config import settings

router = APIRouter(dependencies=[Depends(authenticate_user)])

@router.get("")
def get_encounters(userSession: useUserSession, database: useDatabase) -> list[sch.Encounter]:
    # Fetch the encounter records for the current user.
    records = database.execute(
        select(db.Encounter) \
            .options(
                joinedload(db.Encounter.recording),
                joinedload(db.Encounter.draft_notes),
            ) \
            .where(and_(db.Encounter.username == userSession.username, db.Encounter.is_discarded == False)) \
            .order_by(db.Encounter.created_at.desc())
    ).unique().all()
    
    return [sch.Encounter.from_db_record(record[0]) for record in records]

@router.get("/recording-files/{filename}")
def get_recording_file(userSession: useUserSession, *, filename: str) -> FileResponse:
    filepath = Path(settings.RECORDINGS_FOLDER, userSession.username, filename)

    if not os.path.isfile(filepath):
        raise errors.NotFound("File not found")
    
    return FileResponse(filepath)

@router.post("")
def create_encounter(
    userSession: useUserSession, 
    database: useDatabase,
    *, 
    audio: UploadFile, 
    createdAt: Annotated[datetime, Body()], 
    title: Annotated[str | None, Body()] = None,
) -> sch.Encounter:
    # Determine the recording metadata.
    # media_type = audio.content_type
    # file_extension = Path(audio.filename).suffix
    filename = f"{uuid4()}.mp3"

    # Standardize all audio into mp3 at the default bitrate.
    try:
        (reformatted, duration) = reformat_audio(audio.file, format="mp3", bitrate=settings.DEFAULT_AUDIO_BITRATE)
    except Exception as e:
        raise errors.AudioProcessingError(str(e))

    # Get the current user record.
    try:
        user: db.User = database.execute(
            select(db.User) \
                .where(db.User.username == userSession.username)
        ).one()[0]
    except NoResultFound:
        raise errors.BadRequest("User is not registered.")

    # Create the encounter record and associate it to the current user.
    try:
        encounter = db.Encounter(created_at=createdAt, title=(title or db.get_tag(database)))
        encounter.recording = db.Recording(filename=filename, media_type="audio/mp3", duration=duration)
        user.encounters.append(encounter)

        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))    

    # Save the recording file.
    try:
        db.save_recording(reformatted, userSession.username, filename)

        if settings.ENVIRONMENT == "development":
            db.persist_recording(reformatted, userSession.username, filename)
    finally:
        reformatted.close()
    
    return sch.Encounter.from_db_record(encounter)

@router.patch("/{uuid}")
def update_encounter(
    userSession: useUserSession, 
    database: useDatabase, 
    *, 
    uuid: str, 
    title: Annotated[str | None, Body()] = None,
    transcript: Annotated[str | None, Body()] = None,
) -> sch.Encounter:
    # Get the encounter record.
    try:
        db_record: db.Encounter = database.execute(
            select(db.Encounter) \
                .options(joinedload(db.Encounter.recording)) \
                .where(and_(db.Encounter.username == userSession.username, db.Encounter.uuid == uuid, db.Encounter.is_discarded == False))
        ).unique().one()[0]
    except NoResultFound:
        raise errors.NotFound("Encounter not found")

    if title is not None:
        db_record.title = title

    if transcript is not None:
        db_record.recording.transcript = transcript
        db_record.recording.transcription_service = "Local WhisperX"
        db_record.recording.time_to_transcribe = 0

    try:
        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))

    # Return the updated encounter.
    return sch.Encounter.from_db_record(db_record)
    
@router.delete("/{uuid}")
def delete_encounter(
    userSession: useUserSession, 
    database: useDatabase,
    *, 
    uuid: str
):
    # Fetch the encounter and confirm it exists.
    try:
        encounter: db.Encounter = database.execute(
            select(db.Encounter) \
                .options(joinedload(db.Encounter.recording))
                .where(and_(db.Encounter.username == userSession.username, db.Encounter.uuid == uuid, db.Encounter.is_discarded == False))
        ).unique().one()[0]
    except NoResultFound:
        raise errors.NotFound("Encounter not found")
    
    # Delete the encounter.
    try:
        filename = encounter.recording.filename

        encounter.recording.transcript = None
        for draft_note in encounter.draft_notes:
            draft_note.text = ""
            draft_note.is_discarded = True
        encounter.is_discarded = True
        
        database.commit()

        try:
            db.delete_recording(userSession.username, filename)
        except:
            pass

        if settings.ENVIRONMENT == "development":
            db.purge_recording(userSession.username, filename)
    except Exception as e:
        raise errors.DatabaseError(str(e))

@router.post("/{uuid}/draft-notes")
def create_draft_note(
    userSession: useUserSession, 
    database: useDatabase, 
    *, 
    uuid: str, 
    noteDefinitionUuid: Annotated[str, Body()], 
    noteText: Annotated[str, Body()],
    noteTag: Annotated[str, Body()],
) -> sch.DraftNote:
    # Fetch the encounter.
    try:
        encounter: db.Encounter = database.execute(
            select(db.Encounter) \
                .options(
                    joinedload(db.Encounter.recording),
                    joinedload(db.Encounter.draft_notes),
                ) \
                .where(and_(db.Encounter.username == userSession.username, db.Encounter.uuid == uuid, db.Encounter.is_discarded == False))
        ).unique().one()[0]
    except NoResultFound:
        raise errors.NotFound("Encounter not found")
    
    # Fetch the note definition.
    try:
        note_definition: db.NoteDefinition = database.execute(
            select(db.NoteDefinition) \
                .where(and_(
                    or_(db.NoteDefinition.username == userSession.username, db.NoteDefinition.username == settings.SYSTEM_USER),
                    db.NoteDefinition.uuid == noteDefinitionUuid
                ))
        ).one()[0]
    except NoResultFound:
        raise errors.NotFound("Note definition not found")
    
    # Save the note.
    try:
        if any(n for n in encounter.draft_notes if not n.is_discarded and n.note_definition_id == note_definition.id) > 0:
            discard_note = next(n for n in encounter.draft_notes if not n.is_discarded and n.note_definition_id == note_definition.id)
            discard_note.is_discarded = True

        new_note = db.DraftNote(
            note_definition=note_definition, 
            title=note_definition.title, 
            text=noteText,
            created_at=datetime.now(timezone.utc),
            tag=noteTag,
            generation_service="Snowflake Cortex",
            model=settings.GENERATIVE_AI_MODEL,
            time_to_generate=0,
            is_discarded=False
        )

        encounter.draft_notes.append(new_note)
        database.commit()

        return sch.DraftNote.from_db_record(new_note)
    except Exception as e:
        raise errors.DatabaseError(str(e))

@router.delete("/{uuid}/draft-notes/{tag}")
def delete_draft_note(userSession: useUserSession, database: useDatabase, *, uuid: str, tag: str):
    # Fetch draft note.
    try:
        draft_note: db.DraftNote = database.execute(
            select(db.DraftNote) \
                .where(and_(
                    db.DraftNote.tag == tag,
                    db.DraftNote.encounter.has(and_(
                        db.Encounter.username == userSession.username,
                        db.Encounter.uuid == uuid,
                        db.Encounter.is_discarded == False
                    ))
                ))
        ).one()[0]
    except NoResultFound:
        raise errors.NotFound("Draft note not found")
    
    # Delete the draft note.
    try:
        draft_note.is_discarded = True
        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))
