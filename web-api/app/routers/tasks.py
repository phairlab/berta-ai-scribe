from typing import Annotated

from fastapi import APIRouter, Depends, Body, UploadFile, status, BackgroundTasks

import app.services.tasks as tasks
import app.services.error_handling as errors
import app.schemas as sch
from app.services.db import get_tag, useDatabase
from app.services.security import authenticate_user, useUserSession
from app.services.logging import WebAPILogger, log_transcription, log_generation
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
    backgroundTasks: BackgroundTasks,
    *, 
    audio: UploadFile
) -> sch.TextResponse:
    try:
        transcription_output = await tasks.transcribe_audio(audio.file, audio.filename, audio.content_type)
        backgroundTasks.add_task(log_transcription, transcription_output.transcribedAt, transcription_output.service, transcription_output.audioDuration, transcription_output.timeToGenerate, userSession)
    except (errors.ExternalServiceError, errors.AudioProcessingError) as e:
        raise e
    except Exception as e:
        raise errors.WebAPIException(str(e))
        
    return sch.TextResponse(text=transcription_output.transcript)

@router.post("/generate-draft-note")
def generate_draft_note(
    database: useDatabase, 
    userSession: useUserSession,
    backgroundTasks: BackgroundTasks,
    *, 
    instructions: Annotated[str, Body()], 
    transcript: Annotated[str, Body()]
) -> sch.GenerationResponse:
    # Get the stream of note segments.
    try:
        tag = get_tag(database)
        generation_output = tasks.generate_note(settings.GENERATIVE_AI_MODEL, instructions, transcript)
        backgroundTasks.add_task(log_generation, generation_output.generatedAt, generation_output.service, generation_output.model, tag, generation_output.completionTokens, generation_output.promptTokens, generation_output.timeToGenerate, userSession)
    except errors.ExternalServiceError as e:
        raise e
    except Exception as e:
        raise errors.WebAPIException(str(e))

    return sch.GenerationResponse(text=generation_output.text, tag=tag)
