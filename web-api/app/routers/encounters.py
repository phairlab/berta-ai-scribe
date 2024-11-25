import json
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, UploadFile, Depends, Body
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import NoResultFound

import app.schemas as sch
import app.services.db as db
import app.services.error_handling as errors
from app.services.audio_processing import reformat_audio, compute_peaks
from app.services.measurement import get_file_size, ExecutionTimer
from app.services.logging import log_audio_conversion, log_data_change, log_generation
from app.services.security import authenticate_session, useUserSession
from app.services.db import useDatabase
from app.tasks import generate_transcript_label
from app.config import settings

router = APIRouter(dependencies=[Depends(authenticate_session)])

@router.get("")
def get_encounters(
    userSession: useUserSession,
    database: useDatabase,
    *,
    earlierThan: datetime | None = None,
) -> sch.DataPage[sch.Encounter]:
    """
    Gets all saved encounters for the current user.
    """

    # Fetch the encounter records for the current user.
    get_encounters_batch = select(db.Encounter)
    
    if (earlierThan is not None):
        get_encounters_batch = get_encounters_batch.where(
            db.Encounter.created < earlierThan
        )
    
    get_encounters_batch = get_encounters_batch \
        .where(
            db.Encounter.username == userSession.username,
            db.Encounter.inactivated.is_(None),
        ) \
        .order_by(db.Encounter.created.desc()) \
        .limit(settings.ENCOUNTERS_PAGE_SIZE + 1) \
        .options(
            selectinload(db.Encounter.recording),
            selectinload(db.Encounter.draft_notes),
        )
    
    records = database.execute(get_encounters_batch).scalars().all()
    encounters = [sch.Encounter.from_db_record(r) for r in records]

    return sch.DataPage[sch.Encounter](
        data=encounters[:settings.ENCOUNTERS_PAGE_SIZE],
        isLastPage=len(encounters) <= settings.ENCOUNTERS_PAGE_SIZE
    )

@router.post("")
def create_encounter(
    userSession: useUserSession, 
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *, 
    audio: UploadFile, 
    created: Annotated[datetime, Body()] = datetime.now(timezone.utc), 
    label: Annotated[str | None, Body()] = None,
) -> sch.Encounter:
    """
    Creates and saves a new encounter record.
    """

    encounter_id = db.new_sqid(database)
    recording_id = db.new_sqid(database)

    reformatted_media_type = "audio/mpeg"

    try:
        # Standardize all audio into mp3 at the default bitrate.
        with ExecutionTimer() as timer:
            (reformatted, duration) = reformat_audio(audio.file, format="mp3", bitrate=settings.DEFAULT_AUDIO_BITRATE)

        # Determine the reformatted file size.
        reformatted_file_size = get_file_size(reformatted)

        backgroundTasks.add_task(
            log_audio_conversion,
            database, recording_id, timer.started_at, timer.elapsed_ms, audio.content_type, audio.size,
            reformatted_media_type, reformatted_file_size, session=userSession,
        )

        # Compute waveform peaks.
        peaks = compute_peaks(reformatted)
    except Exception as e:
        audio_error = errors.AudioProcessingError(str(e))

        backgroundTasks.add_task(
            log_audio_conversion,
            database, recording_id, timer.started_at, timer.elapsed_ms, audio.content_type, audio.size,
            error_id=audio_error.uuid, session=userSession,
        )

        raise audio_error

    # Create the encounter record and associate it to the current user.
    try:
        recording = db.Recording(
            id=recording_id, media_type=reformatted_media_type, file_size=reformatted_file_size,
            duration=duration, waveform_peaks=json.dumps(peaks)
        )

        encounter = db.Encounter(
            id=encounter_id, username=userSession.username, created=created, modified=created,
            label=label, recording=recording,
        )
        
        database.add(encounter)
        database.commit()
    except Exception as e:
        reformatted.close()
        raise errors.DatabaseError(str(e))    

    # Save the recording file.
    try:
        filename = f"{recording_id}.mp3"
        db.save_recording(reformatted, userSession.username, filename)

        if settings.ENVIRONMENT == "development":
            # This operation will close the file once completed.
            backgroundTasks.add_task(
                db.persist_recording,
                reformatted, userSession.username, filename,
            )
    finally:
        if settings.ENVIRONMENT != "development":
            reformatted.close()
    
    # Record the change.
    backgroundTasks.add_task(
        log_data_change,
        database, userSession, created, "ENCOUNTER", "CREATED", entity_id=encounter_id,
    )

    # Return the created encounter.
    return sch.Encounter.from_db_record(encounter)

@router.patch("/{encounterId}")
def update_encounter(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *, 
    encounterId: str,
    label: Annotated[str | None, Body()] = None,
    transcript: Annotated[str | None, Body()] = None,
) -> sch.Encounter:
    """
    Saves updates to a saved encounter for the current user.
    """

    # Get the encounter record.
    try:
        get_encounter = select(db.Encounter) \
            .where(
                db.Encounter.username == userSession.username,
                db.Encounter.id == encounterId,
                db.Encounter.inactivated.is_(None),
            ) \
            .options(selectinload(db.Encounter.recording))
        
        encounter = database.execute(get_encounter).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Record not found")

    if label is not None:
        encounter.label = label

    if transcript is not None:
        encounter.recording.transcript = transcript

        def auto_label_transcript():
            try:
                generation = generate_transcript_label(settings.LABEL_MODEL, transcript)
                autolabel = generation.text.split("\n")[-1][0:100]
            except Exception as e:
                if settings.ENVIRONMENT == "development":
                    print(str(e))
                
                raise e

            labelled_encounter = database.get_one(db.Encounter, encounterId)
            labelled_encounter.autolabel = autolabel
            labelled_encounter.modified = datetime.now(timezone.utc)

            try:
                database.commit()
            except Exception as e:
                if settings.ENVIRONMENT == "development":
                    print(str(e))
                
                raise e
            
            log_generation(
                database, encounter.recording.id, "LABEL TRANSCRIPT", generation.generatedAt,
                generation.timeToGenerate, generation.service, generation.model, generation.completionTokens, generation.promptTokens,
                session=userSession,
            )
            
            log_data_change(
                database, userSession, labelled_encounter.modified, "ENCOUNTER", "MODIFIED",
                entity_id=labelled_encounter.id, server_task=True,
            )

        backgroundTasks.add_task(auto_label_transcript)



    encounter.modified = datetime.now(timezone.utc)

    try:
        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))
    
    # Record the change.
    backgroundTasks.add_task(
        log_data_change,
        database, userSession, encounter.modified, "ENCOUNTER", "MODIFIED", entity_id=encounter.id,
    )

    # Return the updated encounter.
    return sch.Encounter.from_db_record(encounter)
    
@router.delete("/{encounterId}")
def delete_encounter(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    encounterId: str
):
    """
    Deletes a saved encounter for the current user,
    purging all sensitive data including saved recording, transcript, and the
    content of any draft notes that were generated.
    """
    
    # Fetch the encounter and verify it exists.
    try:
        get_encounter = select(db.Encounter) \
            .where(
                db.Encounter.username == userSession.username,
                db.Encounter.id == encounterId,
                or_(
                    db.Encounter.inactivated.is_(None),
                    db.Encounter.purged.is_(None),
                )
            ) \
            .options(
                selectinload(db.Encounter.recording),
                selectinload(db.Encounter.draft_notes),
            )
        
        encounter = database.execute(get_encounter).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Record not found")
    
    # Delete the encounter.
    deleted = datetime.now(timezone.utc)
    filename = f"{encounter.recording.id}.mp3"

    try:
        # Delete the saved recording.
        try:
            db.delete_recording(userSession.username, filename)
        except:
            pass

        if settings.ENVIRONMENT == "development":
            db.purge_recording(userSession.username, filename)

        # Delete the transcript.
        encounter.recording.transcript = ""

        # Delete the content of any saved notes and inactivate them.
        for draft_note in encounter.draft_notes:
            draft_note.content = ""
            draft_note.inactivated = deleted

        # Record the deletion on the encounter
        encounter.inactivated = deleted
        encounter.purged = deleted

        database.commit()

        # Record the change.
        backgroundTasks.add_task(
            log_data_change,
            database, userSession, deleted, "ENCOUNTER", "REMOVED", entity_id=encounterId,
        )
    except Exception as e:
        raise errors.DatabaseError(str(e))

@router.post("/{encounterId}/draft-notes")
def create_draft_note(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *, 
    encounterId: str,
    noteDefinitionId: Annotated[str, Body()],
    noteId: Annotated[str, Body()],
    title: Annotated[str, Body()],
    content: Annotated[str, Body()],
    outputType: Annotated[sch.NoteOutputType, Body()],
) -> sch.Encounter:
    """
    Creates and saves a new draft note to the encounter record for this user.
    If a note exists for the indicated note definition, it will be overwritten with the newer generated note.
    """

    # Fetch the encounter record.
    try:
        get_encounter = select(db.Encounter) \
            .where(
                db.Encounter.username == userSession.username,
                db.Encounter.id == encounterId,
                db.Encounter.inactivated.is_(None),
            ) \
        .options(
            selectinload(db.Encounter.recording),
            selectinload(db.Encounter.draft_notes),
        )
        
        encounter = database.execute(get_encounter).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Encounter not found")
    
    # Fetch the note definition.
    try:
        get_definition = select(db.NoteDefinition) \
            .where(
                db.NoteDefinition.id == noteDefinitionId,
                db.NoteDefinition.inactivated.is_(None),
            )
        
        note_definition = database.execute(get_definition).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Note definition note found")
    
    # Save the note.
    try:
        saved = datetime.now(timezone.utc)
    
        get_active_note = select(db.DraftNote) \
            .where(
                db.DraftNote.encounter_id == encounterId,
                db.DraftNote.definition_id == noteDefinitionId,
                db.DraftNote.inactivated.is_(None),
            )
        
        active_note = database.execute(get_active_note).scalar_one_or_none()

        # If the note exists for this note definition, auto-inactivate it.
        if active_note is not None:
            active_note.inactivated = saved

        new_note = db.DraftNote(
            id=noteId, definition_id=note_definition.id, definition_version=note_definition.version,
            created=saved, title=title, content=content, output_type=outputType,
        )

        encounter.draft_notes.append(new_note)
        encounter.modified = saved
        database.commit()

        # Record the change.
        backgroundTasks.add_task(
            log_data_change,
            database, userSession, saved, "ENCOUNTER", "MODIFIED", entity_id=encounter.id,
        )

        return sch.Encounter.from_db_record(encounter)
    except Exception as e:
        raise errors.DatabaseError(str(e))

@router.delete("/{encounterId}/draft-notes/{noteId}")
def delete_draft_note(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    encounterId: str,
    noteId: str
):
    """
    Deletes a note from the saved encounter for a user.
    """
    
    # Fetch the note and verify it exists for the current user
    # and specified encounter.
    try:
        get_note = select(db.DraftNote) \
            .where(
                db.DraftNote.id == noteId,
                db.DraftNote.encounter.has(
                    and_(
                        db.Encounter.username == userSession.username,
                        db.Encounter.id == encounterId,
                        db.Encounter.inactivated.is_(None),
                    )
                )
            ) \
            .options(selectinload(db.DraftNote.encounter))
        
        draft_note = database.execute(get_note).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Draft note not found")
    
    # Delete the draft note.
    try:
        inactivated = datetime.now(timezone.utc)
        draft_note.inactivated = inactivated
        draft_note.encounter.modified = inactivated

        database.commit()

        # Record the change.
        backgroundTasks.add_task(
            log_data_change,
            database, userSession, inactivated, "ENCOUNTER", "MODIFIED", entity_id=encounterId,
        )
    except Exception as e:
        raise errors.DatabaseError(str(e))
