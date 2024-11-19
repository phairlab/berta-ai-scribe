from typing import Annotated
from pathlib import Path

from fastapi import APIRouter, Depends, Body, status, BackgroundTasks

import app.services.error_handling as errors
import app.schemas as sch
from app.tasks.transcription import transcribe_audio
from app.tasks.generation import generate_note
from app.services.db import new_sqid, useDatabase
from app.services.security import authenticate_user, useUserSession
from app.services.logging import WebAPILogger, log_transcription, log_generation
from app.services.measurement import ExecutionTimer
from app.config import settings

log = WebAPILogger(__name__)

router = APIRouter(dependencies=[Depends(authenticate_user)], responses={
    status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal Server Error", "model": sch.WebAPIError},
    status.HTTP_502_BAD_GATEWAY: {"description": "External Service Error", "model": sch.WebAPIError},
    status.HTTP_503_SERVICE_UNAVAILABLE: {"description": "External Service Unavailable", "model": sch.WebAPIError},
    status.HTTP_504_GATEWAY_TIMEOUT: {"description": "External Service Timeout", "model": sch.WebAPIError},
})

@router.post("/transcribe-audio", generate_unique_id_function=(lambda _: "TranscribeAudio"))
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
            transcription_output = await transcribe_audio(file, filename, media_type)

        backgroundTasks.add_task(
            log_transcription,
            database,
            recordingId,
            timer.started_at,
            timer.elapsed_ms,
            settings.TRANSCRIPTION_SERVICE,
            session=userSession,
        )
    except (errors.ExternalServiceError, errors.AudioProcessingError) as e:
        backgroundTasks.add_task(
            log_transcription,
            database,
            recordingId,
            timer.started_at,
            timer.elapsed_ms,
            settings.TRANSCRIPTION_SERVICE,
            error_id=e.uuid,
            session=userSession,
        )

        raise e
    except Exception as e:
        transcription_error = errors.WebAPIException(str(e))

        backgroundTasks.add_task(
            log_transcription,
            database,
            recordingId,
            timer.started_at,
            timer.elapsed_ms,
            settings.TRANSCRIPTION_SERVICE,
            error_id=transcription_error.uuid,
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
    instructions: Annotated[str, Body()], 
    transcript: Annotated[str, Body()],
    outputType: Annotated[sch.NoteOutputType, Body()],
) -> sch.GenerationResponse:
    # Get the stream of note segments.
    try:
        noteId = new_sqid(database)
        generation_output = generate_note(settings.GENERATIVE_AI_MODEL, instructions, transcript, outputType)
        backgroundTasks.add_task(
            log_generation,
            database,
            noteId,
            "GENERATE NOTE",
            generation_output.generatedAt,
            generation_output.timeToGenerate,
            generation_output.service,
            generation_output.model,
            generation_output.completionTokens,
            generation_output.promptTokens,
            session=userSession,
        )
    except errors.ExternalServiceError as e:
        raise e
    except Exception as e:
        raise errors.WebAPIException(str(e))

    return sch.GenerationResponse(text=generation_output.text, noteId=noteId)
