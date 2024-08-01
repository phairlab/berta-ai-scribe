from typing import BinaryIO

import openai
from openai import AsyncOpenAI, NotGiven

from app.services.error_handling import AIServiceTimeout, AIServiceError, TransientAIServiceError

async def transcribe_audio(audio_file: BinaryIO, filename: str, content_type: str, prompt: str | None | NotGiven = NotGiven, timeout: int | NotGiven = NotGiven) -> str:
    openai_client = AsyncOpenAI(timeout=timeout, max_retries=0)
    
    try:
        transcript = await openai_client.audio.transcriptions.create(model="whisper-1", file=(filename, audio_file, content_type), prompt=(prompt | NotGiven))
    except openai.APITimeoutError as e:
        # Timeout errors.
        raise AIServiceTimeout(str(e))
    except (openai.ConflictError, openai.InternalServerError, openai.RateLimitError) as e:
        # Errors that should be retried.
        raise TransientAIServiceError(str(e))
    except Exception as e:
        # All other errors.
        raise AIServiceError(str(e))
    
    return transcript.text