from typing import BinaryIO, Iterable

import openai
from openai import OpenAI, AsyncOpenAI, NotGiven
from openai.types.chat import ChatCompletionMessageParam
from sqlalchemy.orm import Session as SQLAlchemySession

from app.schemas import WebAPISession
from app.services.logging import log_transcription, log_generation
from app.services.audio_processing import get_duration
from app.services.measurement import ExecutionTimer
from app.services.error_handling import ExternalServiceTimeout, ExternalServiceError, ExternalServiceInterruption, AudioProcessingError

SERVICE_NAME = "OpenAI"

async def transcribe(database: SQLAlchemySession, userSession: WebAPISession, audio_file: BinaryIO, filename: str, content_type: str, prompt: str | None = None) -> str:
    try:
        audio_duration = get_duration(audio_file)
    except Exception as e:
        raise AudioProcessingError(str(e))
    
    try:
        with ExecutionTimer() as timer:
            openai_client = AsyncOpenAI(timeout=None, max_retries=0)
            response = await openai_client.audio.transcriptions.create(model="whisper-1", file=(filename, audio_file, content_type), prompt=prompt or NotGiven)
            transcript = response.text
    except openai.APITimeoutError as e:
        raise ExternalServiceTimeout(SERVICE_NAME, str(e))
    except (openai.ConflictError, openai.InternalServerError, openai.RateLimitError, openai.UnprocessableEntityError) as e:
        raise ExternalServiceInterruption(SERVICE_NAME, str(e))
    except Exception as e:
        raise ExternalServiceError(SERVICE_NAME, str(e))

    log_transcription(database, timer.started_at, SERVICE_NAME, audio_duration, timer.elapsed_ms, userSession)
    return transcript

def complete(database: SQLAlchemySession, userSession: WebAPISession, tag: str, model: str, messages: Iterable[ChatCompletionMessageParam]) -> str:
    try:
        with ExecutionTimer() as timer:
            openai_client = OpenAI(timeout=None, max_retries=0)
            response = openai_client.chat.completions.create(model=model, messages=messages, temperature=0)
            
            text = response.choices[0].message.content
            completion_tokens = response.usage.completion_tokens
            prompt_tokens = response.usage.prompt_tokens

    except openai.APITimeoutError as e:
        raise ExternalServiceTimeout(SERVICE_NAME, str(e))
    except (openai.ConflictError, openai.InternalServerError, openai.RateLimitError, openai.UnprocessableEntityError) as e:
        raise ExternalServiceInterruption(SERVICE_NAME, str(e))
    except Exception as e:
        raise ExternalServiceError(SERVICE_NAME, str(e))
    
    log_generation(database, timer.started_at, SERVICE_NAME, model, tag, completion_tokens, prompt_tokens, timer.elapsed_ms, userSession)
    return text
