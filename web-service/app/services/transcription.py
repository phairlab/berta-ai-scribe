from typing import BinaryIO

import aiohttp
import openai
from openai import AsyncOpenAI, NotGiven

from app.services.error_handling import ExternalServiceTimeout, ExternalServiceError, ExternalServiceInterruption, WebServiceError
from app.config import get_app_logger, settings

logger = get_app_logger(__name__)

async def transcribe(audio_file: BinaryIO, filename: str, content_type: str, prompt: str | None = None, timeout: int | None = None) -> str:
    if settings.TRANSCRIPTION_SERVICE == "OPENAI":
        logger.info("Generating transcript using OpenAI API")
        service = "OpenAI"
        
        try:
            openai_client = AsyncOpenAI(timeout=timeout, max_retries=0)
            transcript = await openai_client.audio.transcriptions.create(model="whisper-1", file=(filename, audio_file, content_type), prompt=prompt or NotGiven)

            return transcript.text
        except openai.APITimeoutError as e:
            raise ExternalServiceTimeout(service, str(e))
        except (openai.ConflictError, openai.InternalServerError, openai.RateLimitError, openai.UnprocessableEntityError) as e:
            raise ExternalServiceInterruption(service, str(e))
        except Exception as e:
            raise ExternalServiceError(service, str(e))

    elif settings.TRANSCRIPTION_SERVICE == "LOCAL_WHISPER":
        if settings.LOCAL_WHISPER_SERVICE_URL is None:
            raise WebServiceError("The connection to the local whisper service is missing. Check and correct the server configuration.")

        logger.info(f"Generating transcript using local whisper service at {settings.LOCAL_WHISPER_SERVICE_URL}")
        service = "Transcription Service"

        async with aiohttp.ClientSession(settings.LOCAL_WHISPER_SERVICE_URL) as session:
            form_data = aiohttp.FormData()
            form_data.add_field("audio", audio_file.read(), filename=filename)

            try:
                async with session.post("/transcribe-audio", data=form_data) as response:
                    if response.status == 200:
                        transcript = await response.json()
                        return transcript["text"]
                    else:
                        error = await response.json()
                        error_message = error["detail"]
                        raise ExternalServiceError(service, error_message)
            except aiohttp.ServerTimeoutError as e:
                raise ExternalServiceTimeout(service, str(e))
            except aiohttp.ServerConnectionError as e:
                raise ExternalServiceInterruption(service, str(e))
            except (aiohttp.ClientPayloadError, aiohttp.ClientResponseError, aiohttp.RedirectClientError) as e:
                raise ExternalServiceError(service, str(e))

    else:
        raise WebServiceError(f"Unknown transcription service '{settings.TRANSCRIPTION_SERVICE}'. Check and correct the server configuration.")
