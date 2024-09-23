import json
from typing import BinaryIO

import aiohttp
from sqlalchemy.orm import Session as SQLAlchemySession

from app.schemas import WebAPISession
from app.services.logging import log_transcription
from app.services.audio_processing import get_duration
from app.services.measurement import ExecutionTimer
from app.services.error_handling import ExternalServiceTimeout, ExternalServiceError, ExternalServiceInterruption, AudioProcessingError
from app.config import settings

SERVICE_NAME = "Local WhisperX"

async def transcribe(database: SQLAlchemySession, userSession: WebAPISession, audio_file: BinaryIO, filename: str, content_type: str, prompt: str | None = None) -> str:
    try:
        audio_duration = get_duration(audio_file)
    except Exception as e:
        raise AudioProcessingError(str(e))
    
    with ExecutionTimer() as timer:
        async with aiohttp.ClientSession(settings.LOCAL_WHISPER_SERVICE_URL) as session:
            form_data = aiohttp.FormData()
            form_data.add_field("audio", audio_file.read(), filename=filename, content_type="multipart/form-data")

            try:
                async with session.post("/transcribe-audio", data=form_data) as response:
                    if response.status == 200:
                        response = await response.json()
                        transcript = response["text"]
                    else:
                        error = await response.json()
                        error_message = error["detail"]
                        raise ExternalServiceError(SERVICE_NAME, json.dumps(error_message))
            except aiohttp.ServerTimeoutError as e:
                raise ExternalServiceTimeout(SERVICE_NAME, str(e))
            except aiohttp.ServerConnectionError as e:
                raise ExternalServiceInterruption(SERVICE_NAME, str(e))
            except (aiohttp.ClientPayloadError, aiohttp.ClientResponseError, aiohttp.RedirectClientError) as e:
                raise ExternalServiceError(SERVICE_NAME, str(e))

    log_transcription(database, timer.started_at, SERVICE_NAME, audio_duration, timer.elapsed_ms, userSession)
    return transcript