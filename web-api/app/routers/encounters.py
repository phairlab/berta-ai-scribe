import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Body, Depends, UploadFile
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import selectinload

import app.config.db as db
import app.errors as errors
import app.schemas as sch
from app.config import settings
from app.config.db import useDatabase
from app.services.file_validation import file_validator
from app.logging import log_audio_conversion, log_data_change, log_generation
from app.security import authenticate_session, useUserSession
from app.services.audio_processing import append_audio, compute_peaks, reformat_audio
from app.tasks import generate_transcript_label
from app.utility.conversion import ConvertToSchema, get_file_size
from app.utility.timing import ExecutionTimer

router = APIRouter(dependencies=[Depends(authenticate_session)])


@router.get("")
def get_encounters(
    userSession: useUserSession,
    database: useDatabase,
    *,
    earlierThan: datetime | None = None,
) -> sch.Page[sch.Encounter]:
    """
    Gets all saved encounters for the current user.
    """

    get_encounters_batch = select(db.Encounter)

    if earlierThan is not None:
        get_encounters_batch = get_encounters_batch.where(
            db.Encounter.created < earlierThan
        )

    get_encounters_batch = (
        get_encounters_batch.where(
            db.Encounter.username == userSession.username,
            db.Encounter.inactivated.is_(None),
        )
        .order_by(db.Encounter.created.desc())
        .limit(settings.ENCOUNTERS_PAGE_SIZE + 1)
        .options(
            selectinload(db.Encounter.recording),
            selectinload(db.Encounter.draft_notes),
        )
    )

    records = database.execute(get_encounters_batch).scalars().all()
    encounters = [ConvertToSchema.encounter(r) for r in records]

    return sch.Page[sch.Encounter](
        data=encounters[: settings.ENCOUNTERS_PAGE_SIZE],
        isLastPage=len(encounters) <= settings.ENCOUNTERS_PAGE_SIZE,
    )


@router.post("")
def create_encounter(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    audio: UploadFile,
    label: Annotated[str | None, Body()] = None,
    context: Annotated[str | None, Body()] = None,
) -> sch.Encounter:
    """
    Creates and saves a new encounter record.
    """

    if audio.size is None or audio.content_type is None:
        raise errors.BadRequest("Audio file metadata is missing")
    
    # Validate the uploaded audio file
    try:
        is_valid, error_message = file_validator.validate_audio_file(audio.file, audio.filename)
        if not is_valid:
            raise errors.BadRequest(error_message)
    except ValueError as e:
        raise errors.BadRequest(str(e))

    created = datetime.now(timezone.utc).astimezone()

    encounter_id = db.next_sqid(database)
    recording_id = db.next_sqid(database)

    reformatted_media_type = "audio/mpeg"

    try:
        # Standardize all audio into mp3 at the default bitrate.
        with ExecutionTimer() as timer:
            (reformatted, duration) = reformat_audio(
                audio.file, format="mp3", bitrate=settings.DEFAULT_AUDIO_BITRATE
            )

        reformatted_file_size = get_file_size(reformatted)

        backgroundTasks.add_task(
            log_audio_conversion,
            database=database,
            recording_id=recording_id,
            timer=timer,
            original_file=(audio.content_type, audio.size),
            converted_file=(reformatted_media_type, reformatted_file_size),
            session=userSession,
            task_type="NEW RECORDING",
        )

        peaks = compute_peaks(reformatted)
    except Exception as e:
        audio_error = errors.AudioProcessingError(str(e))

        backgroundTasks.add_task(
            log_audio_conversion,
            database=database,
            recording_id=recording_id,
            timer=timer,
            original_file=(audio.content_type, audio.size),
            error=audio_error,
            session=userSession,
            task_type="NEW RECORDING",
        )

        raise audio_error

    try:
        recording = db.Recording(
            id=recording_id,
            media_type=reformatted_media_type,
            file_size=reformatted_file_size,
            duration=duration,
            waveform_peaks=json.dumps(peaks),
            segments=json.dumps([0]),
        )

        encounter = db.Encounter(
            id=encounter_id,
            username=userSession.username,
            created=created,
            modified=created,
            label=label,
            context=context,
            recording=recording,
        )

        database.add(encounter)

        try:
            filename = f"{recording_id}.mp3"
            db.save_recording(reformatted, userSession.username, filename)
        finally:
            reformatted.close()

        database.commit()
    except Exception as e:
        reformatted.close()
        raise errors.DatabaseError(str(e))

    backgroundTasks.add_task(
        log_data_change,
        database=database,
        session=userSession,
        changed=created,
        entity_type="ENCOUNTER",
        change_type="CREATED",
        entity_id=encounter_id,
    )

    return ConvertToSchema.encounter(encounter)


@router.patch("/{encounterId}/append-recording")
def append_recording(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    encounterId: str,
    audio: UploadFile,
) -> sch.Encounter:
    """
    Appends further audio to an encounter's recording.
    """

    if audio.size is None or audio.content_type is None:
        raise errors.BadRequest("Audio file metadata is missing")
    
    # Validate the uploaded audio file
    try:
        is_valid, error_message = file_validator.validate_audio_file(audio.file, audio.filename)
        if not is_valid:
            raise errors.BadRequest(error_message)
    except ValueError as e:
        raise errors.BadRequest(str(e))

    modified = datetime.now(timezone.utc).astimezone()
    reformatted_media_type = "audio/mpeg"

    try:
        get_encounter = (
            select(db.Encounter)
            .where(
                db.Encounter.username == userSession.username,
                db.Encounter.id == encounterId,
                db.Encounter.inactivated.is_(None),
            )
            .options(selectinload(db.Encounter.recording))
        )

        encounter = database.execute(get_encounter).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Record not found")

    recording_id = encounter.recording.id

    recording_path = Path(
        settings.RECORDINGS_FOLDER, userSession.username, f"{recording_id}.mp3"
    )

    if not os.path.isfile(recording_path):
        raise errors.NotFound("Recording not found")

    try:
        # Standardize all audio into mp3 at the default bitrate.
        with ExecutionTimer() as timer, open(recording_path, "rb") as original_file:
            (combined, duration) = append_audio(
                original_file,
                audio.file,
                format="mp3",
                bitrate=settings.DEFAULT_AUDIO_BITRATE,
            )

        # Determine the reformatted file size.
        combined_file_size = get_file_size(combined)

        backgroundTasks.add_task(
            log_audio_conversion,
            database=database,
            recording_id=recording_id,
            timer=timer,
            original_file=(audio.content_type, audio.size),
            converted_file=(reformatted_media_type, combined_file_size),
            session=userSession,
            task_type="APPEND AUDIO",
        )

        # Compute waveform peaks.
        peaks = compute_peaks(combined)

        if encounter.recording.segments is not None:
            segments: list[int] = json.loads(encounter.recording.segments)
        else:
            segments: list[int] = [0]

        segments.append(encounter.recording.duration)
    except Exception as e:
        audio_error = errors.AudioProcessingError(str(e))

        backgroundTasks.add_task(
            log_audio_conversion,
            database=database,
            recording_id=recording_id,
            timer=timer,
            original_file=(audio.content_type, audio.size),
            error=audio_error,
            session=userSession,
        )

        raise audio_error

    try:
        encounter.modified = modified
        encounter.recording.transcript = None
        encounter.recording.duration = duration
        encounter.recording.waveform_peaks = json.dumps(peaks)
        encounter.recording.segments = json.dumps(segments)
        database.commit()
    except Exception as e:
        combined.close()
        raise errors.DatabaseError(str(e))

    try:
        filename = f"{recording_id}.mp3"
        db.save_recording(combined, userSession.username, filename)
    finally:
        combined.close()

    backgroundTasks.add_task(
        log_data_change,
        database=database,
        session=userSession,
        changed=modified,
        entity_type="ENCOUNTER",
        change_type="MODIFIED",
        entity_id=encounterId,
    )

    return ConvertToSchema.encounter(encounter)


@router.patch("/{encounterId}")
def update_encounter(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    encounterId: str,
    label: Annotated[str | None, Body()] = None,
    transcript: Annotated[str | None, Body()] = None,
    context: Annotated[str | None, Body()] = None,
) -> sch.Encounter:
    """
    Saves updates to a saved encounter for the current user.
    """

    try:
        get_encounter = (
            select(db.Encounter)
            .where(
                db.Encounter.username == userSession.username,
                db.Encounter.id == encounterId,
                db.Encounter.inactivated.is_(None),
            )
            .options(selectinload(db.Encounter.recording))
        )

        encounter = database.execute(get_encounter).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Record not found")

    if label is not None:
        encounter.label = label

    if context is not None:
        encounter.context = context

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
            labelled_encounter.modified = datetime.now(timezone.utc).astimezone()

            try:
                database.commit()
            except Exception as e:
                if settings.ENVIRONMENT == "development":
                    print(str(e))

                raise e

            log_generation(
                database=database,
                record_id=encounter.recording.id,
                task_type="LABEL TRANSCRIPT",
                generation_output=generation,
                session=userSession,
            )

            log_data_change(
                database=database,
                session=userSession,
                changed=labelled_encounter.modified,
                entity_type="ENCOUNTER",
                change_type="MODIFIED",
                entity_id=labelled_encounter.id,
                server_task=True,
            )

        backgroundTasks.add_task(auto_label_transcript)

    encounter.modified = datetime.now(timezone.utc).astimezone()

    try:
        database.commit()
    except Exception as e:
        raise errors.DatabaseError(str(e))

    backgroundTasks.add_task(
        log_data_change,
        database=database,
        session=userSession,
        changed=encounter.modified,
        entity_type="ENCOUNTER",
        change_type="MODIFIED",
        entity_id=encounter.id,
    )

    return ConvertToSchema.encounter(encounter)


@router.delete("/{encounterId}")
def delete_encounter(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    encounterId: str,
):
    """
    Deletes a saved encounter for the current user,
    purging all sensitive data including saved recording, transcript, and the
    content of any draft notes that were generated.
    """

    # Fetch the encounter and verify it exists.
    try:
        get_encounter = (
            select(db.Encounter)
            .where(
                db.Encounter.username == userSession.username,
                db.Encounter.id == encounterId,
                or_(
                    db.Encounter.inactivated.is_(None),
                    db.Encounter.purged.is_(None),
                ),
            )
            .options(
                selectinload(db.Encounter.recording),
                selectinload(db.Encounter.draft_notes),
            )
        )

        encounter = database.execute(get_encounter).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Record not found")

    deleted = datetime.now(timezone.utc).astimezone()
    filename = f"{encounter.recording.id}.mp3"

    try:
        try:
            db.delete_recording(userSession.username, filename)
        except OSError:
            pass

        encounter.recording.transcript = ""

        encounter.context = ""

        for draft_note in encounter.draft_notes:
            draft_note.content = ""
            draft_note.inactivated = deleted

        encounter.inactivated = deleted
        encounter.purged = deleted

        database.commit()

        # Record the change.
        backgroundTasks.add_task(
            log_data_change,
            database=database,
            session=userSession,
            changed=deleted,
            entity_type="ENCOUNTER",
            change_type="REMOVED",
            entity_id=encounterId,
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
    If a note exists for the indicated note definition,
    it will be overwritten with the newer generated note.
    """

    # Fetch the encounter record.
    try:
        get_encounter = (
            select(db.Encounter)
            .where(
                db.Encounter.username == userSession.username,
                db.Encounter.id == encounterId,
                db.Encounter.inactivated.is_(None),
            )
            .options(
                selectinload(db.Encounter.draft_notes),
            )
        )

        encounter = database.execute(get_encounter).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Encounter not found")

    # Fetch the note definition.
    try:
        get_definition = select(db.NoteDefinition).where(
            db.NoteDefinition.id == noteDefinitionId,
            db.NoteDefinition.inactivated.is_(None),
        )

        note_definition = database.execute(get_definition).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Note definition not found")

    try:
        saved = datetime.now(timezone.utc).astimezone()

        # Auto-inactivate any previous notes of the same type.
        for note in encounter.draft_notes:
            if note.inactivated is None and note.definition_id == noteDefinitionId:
                note.inactivated = saved

        # Create and add the new note.
        new_note = db.DraftNote(
            id=noteId,
            definition_id=note_definition.id,
            definition_version=note_definition.version,
            created=saved,
            title=title,
            model=note_definition.model,
            content=content,
            output_type=outputType,
        )

        encounter.draft_notes.append(new_note)
        encounter.modified = saved
        database.commit()

        # Record the change.
        backgroundTasks.add_task(
            log_data_change,
            database=database,
            session=userSession,
            changed=saved,
            entity_type="ENCOUNTER",
            change_type="MODIFIED",
            entity_id=encounter.id,
        )

        return ConvertToSchema.encounter(encounter)
    except Exception as e:
        raise errors.DatabaseError(str(e))


@router.delete("/{encounterId}/draft-notes/{noteId}")
def delete_draft_note(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    encounterId: str,
    noteId: str,
):
    """
    Deletes a note from the saved encounter for a user.
    """

    # Fetch the note and verify it exists for the current user
    # and specified encounter.
    try:
        get_note = (
            select(db.DraftNote)
            .where(
                db.DraftNote.id == noteId,
                db.DraftNote.encounter.has(
                    and_(
                        db.Encounter.username == userSession.username,
                        db.Encounter.id == encounterId,
                        db.Encounter.inactivated.is_(None),
                    )
                ),
            )
            .options(selectinload(db.DraftNote.encounter))
        )

        draft_note = database.execute(get_note).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Draft note not found")

    try:
        inactivated = datetime.now(timezone.utc).astimezone()
        draft_note.inactivated = inactivated
        draft_note.encounter.modified = inactivated

        database.commit()

        # Record the change.
        backgroundTasks.add_task(
            log_data_change,
            database=database,
            session=userSession,
            changed=inactivated,
            entity_type="ENCOUNTER",
            change_type="MODIFIED",
            entity_id=encounterId,
        )
    except Exception as e:
        raise errors.DatabaseError(str(e))


@router.patch("/{encounterId}/draft-notes/{noteId}/set-flag")
def set_note_flag(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    encounterId: str,
    noteId: str,
    isFlagged: Annotated[bool, Body()],
    comments: Annotated[str | None, Body()] = None,
):
    """
    Sets or unsets a flag on a note and updates the associated QA comments.
    """

    # Get the draft note and confirm it exists.
    try:
        get_note = (
            select(db.DraftNote)
            .where(
                db.DraftNote.id == noteId,
                db.DraftNote.encounter.has(
                    and_(
                        db.Encounter.username == userSession.username,
                        db.Encounter.id == encounterId,
                        db.Encounter.inactivated.is_(None),
                    )
                ),
            )
            .options(selectinload(db.DraftNote.encounter))
        )

        draft_note = database.execute(get_note).scalar_one()
    except NoResultFound:
        raise errors.NotFound("Draft note not found")

    try:
        modified = datetime.now(timezone.utc).astimezone()
        draft_note.is_flagged = isFlagged
        draft_note.comments = comments
        draft_note.encounter.modified = modified

        database.commit()

        # Record the change.
        backgroundTasks.add_task(
            log_data_change,
            database=database,
            session=userSession,
            changed=modified,
            entity_type="ENCOUNTER",
            change_type="MODIFIED",
            entity_id=encounterId,
        )
    except Exception as e:
        raise errors.DatabaseError(str(e))
