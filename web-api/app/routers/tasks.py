from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Body, Depends, status

import app.errors as errors
import app.schemas as sch
import app.tasks as tasks
from app.config import settings
from app.config.db import next_sqid, useDatabase
from app.logging import WebAPILogger, log_generation, log_transcription
from app.security import authenticate_session, useUserSession
from app.utility.timing import ExecutionTimer

log = WebAPILogger(__name__)

router = APIRouter(
    dependencies=[Depends(authenticate_session)],
    responses={
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Internal Server Error",
            "model": sch.WebAPIError,
        },
        status.HTTP_502_BAD_GATEWAY: {
            "description": "External Service Error",
            "model": sch.WebAPIError,
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "description": "External Service Unavailable",
            "model": sch.WebAPIError,
        },
        status.HTTP_504_GATEWAY_TIMEOUT: {
            "description": "External Service Timeout",
            "model": sch.WebAPIError,
        },
    },
)


@router.post(
    "/transcribe-audio", generate_unique_id_function=(lambda _: "TranscribeAudio")
)
async def transcribe_audio(
    userSession: useUserSession,
    database: useDatabase,
    backgroundTasks: BackgroundTasks,
    *,
    recordingId: Annotated[str, Body()],
) -> sch.TextResponse:
    try:
        media_type = "audio/mpeg"
        filename = f"{recordingId}.mp3"
        filepath = Path(settings.RECORDINGS_FOLDER, userSession.username, filename)

        with ExecutionTimer() as timer, open(filepath, mode="rb") as file:
            transcription_output = await tasks.transcribe_audio(
                file, filename, media_type
            )

        backgroundTasks.add_task(
            log_transcription,
            database=database,
            recording_id=recordingId,
            timer=timer,
            service=settings.TRANSCRIPTION_SERVICE,
            session=userSession,
        )
    except Exception as ex:
        transcription_error = (
            ex
            if isinstance(ex, errors.WebAPIException)
            else errors.WebAPIException(str(ex))
        )

        backgroundTasks.add_task(
            log_transcription,
            database=database,
            recording_id=recordingId,
            timer=timer,
            service=settings.TRANSCRIPTION_SERVICE,
            error=transcription_error,
            session=userSession,
        )

        raise transcription_error

    return sch.TextResponse(text=transcription_output.transcript)


@router.post("/generate-draft-note")
def generate_draft_note(
    database: useDatabase,
    userSession: useUserSession,
    backgroundTasks: BackgroundTasks,
    *,
    model: Annotated[str, Body()] = settings.DEFAULT_NOTE_GENERATION_MODEL,
    instructions: Annotated[str, Body()],
    transcript: Annotated[str, Body()],
    outputType: Annotated[sch.NoteOutputType, Body()],
) -> sch.GenerationResponse:
    # Get the stream of note segments.
    try:
        noteId = next_sqid(database)

        generation_output = tasks.generate_note(
            model, instructions, transcript, outputType
        )

        backgroundTasks.add_task(
            log_generation,
            database=database,
            record_id=noteId,
            task_type="GENERATE NOTE",
            generation_output=generation_output,
            session=userSession,
        )
    except errors.ExternalServiceError as e:
        raise e
    except Exception as e:
        raise errors.WebAPIException(str(e))

    return sch.GenerationResponse(text=generation_output.text, noteId=noteId)
