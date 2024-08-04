import logging
from typing import BinaryIO

import openai
from openai import AsyncOpenAI, NotGiven

from app.services.error_handling import AIServiceTimeout, AIServiceError, TransientAIServiceError

logger = logging.getLogger(__name__)

async def transcribe_audio(audio_file: BinaryIO, filename: str, content_type: str, prompt: str | NotGiven = NotGiven, timeout: int | None = None) -> str:
    openai_client = AsyncOpenAI(timeout=timeout, max_retries=0)
    
    try:
        transcript = await openai_client.audio.transcriptions.create(model="whisper-1", file=(filename, audio_file, content_type), prompt=prompt)
    except openai.APITimeoutError as e:
        # Timeout errors.
        logger.error(e)
        raise AIServiceTimeout(f"OpenAI: {str(e)}")
    except (openai.ConflictError, openai.InternalServerError, openai.RateLimitError, openai.UnprocessableEntityError) as e:
        # Errors that should be retried.
        logger.error(e)
        raise TransientAIServiceError(f"OpenAI: {str(e)}")
    except Exception as e:
        # All other errors.
        logger.error(e)
        raise AIServiceError(f"OpenAI: {str(e)}")
    
    return transcript.text