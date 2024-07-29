import io
import logging
import asyncio
import openai
from openai import AsyncOpenAI
from app.services.error_handling import AIServiceTimeout, UnrecoverableAIServiceError, TransientAIServiceError
from app.config import settings

logger = logging.getLogger(__name__)


async def transcribe_audio(audio_buffer: io.BytesIO) -> str:
    MAX_RETRIES = 3

    async def transcribe_audio_with_retry(audio_buffer: io.BytesIO, retries: int = MAX_RETRIES) -> str:
        openai_client = AsyncOpenAI(timeout=settings.TRANSCRIPTION_TIMEOUT, max_retries=0)
        
        try:
            transcript = await openai_client.audio.transcriptions.create(model="whisper-1", file=audio_buffer)
        except (AIServiceTimeout, UnrecoverableAIServiceError, TransientAIServiceError) as e:
            # Propagate service errors that have already been identified in a recursive step.
            raise e
        except openai.APITimeoutError as e:
            # Report normal timeouts and defer downstream for handling strategy.
            raise AIServiceTimeout({
                "message": f"The OpenAI API service timed out after {settings.TRANSCRIPTION_TIMEOUT} seconds. Please wait and try again.",
            })
        except (openai.ConflictError, openai.InternalServerError) as e:
            # Attempt simple recovery from transient errors.
            if retries < 1:
                TransientAIServiceError({
                    "message": "The OpenAI API service reported a temporary issue with their service. Please wait and try again.",
                    "errorDetails": str(e),
                })
            else:
                retry_attempt = MAX_RETRIES - retries

                # Exponential falloff for wait before retry (1st: 1 second, 2nd: 3 seconds, 3rd: 9 seconds).
                retry_wait = 3**(retry_attempt) * 1000

                logger.warning(f"The OpenAI API service reported a temporary issue with their service. Attempting to retry (attempt {retry_attempt} of {MAX_RETRIES}). Error details: {str(e)}")
                
                asyncio.sleep(retry_wait)
                transcript = await transcribe_audio(audio_buffer, retries=(retries - 1))
        except Exception as e:
            # Handle all other service errors.
            raise UnrecoverableAIServiceError({
                "message": "The OpenAI API service reported an issue that prevented it from fulfilling the request. Please report the issue so it can be resolved.",
                "errorDetails": str(e),
            })
        
        return transcript
        
    transcript = await transcribe_audio_with_retry(audio_buffer)
    return transcript.text