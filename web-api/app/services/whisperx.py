import json
from typing import BinaryIO

import aiohttp

from app.schemas import TranscriptionOutput
from app.services.audio_processing import get_duration
from app.services.measurement import ExecutionTimer
from app.services.error_handling import ExternalServiceTimeout, ExternalServiceError, ExternalServiceInterruption, AudioProcessingError
from app.config import settings

SERVICE_NAME = "Local WhisperX"

async def transcribe(audio_file: BinaryIO, filename: str, content_type: str, prompt: str | None = None) -> TranscriptionOutput:
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

    # log_transcription(database, timer.started_at, SERVICE_NAME, audio_duration, timer.elapsed_ms, userSession)
    return TranscriptionOutput(
        transcript=transcript,
        transcribedAt=timer.started_at,
        service=SERVICE_NAME,
        audioDuration=audio_duration,
        timeToGenerate=timer.elapsed_ms,
    )