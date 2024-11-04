from typing import BinaryIO, Iterable

import openai
from openai import OpenAI, AsyncOpenAI, NotGiven
from openai.types.chat import ChatCompletionMessageParam

from app.schemas import TranscriptionOutput, GenerationOutput
from app.services.measurement import ExecutionTimer
from app.services.error_handling import ExternalServiceTimeout, ExternalServiceError, ExternalServiceInterruption

SERVICE_NAME = "OpenAI"

async def transcribe(audio_file: BinaryIO, filename: str, content_type: str, prompt: str | None = None) -> TranscriptionOutput:
    try:
        openai_client = AsyncOpenAI(timeout=None, max_retries=0)
        response = await openai_client.audio.transcriptions.create(model="whisper-1", file=(filename, audio_file, content_type), prompt=prompt or NotGiven)
        transcript = response.text
    except openai.APITimeoutError as e:
        raise ExternalServiceTimeout(SERVICE_NAME, str(e))
    except (openai.ConflictError, openai.InternalServerError, openai.RateLimitError, openai.UnprocessableEntityError) as e:
        raise ExternalServiceInterruption(SERVICE_NAME, str(e))
    except Exception as e:
        raise ExternalServiceError(SERVICE_NAME, str(e))

    return TranscriptionOutput(
        transcript=transcript,
        service=SERVICE_NAME,
    )

def complete(model: str, messages: Iterable[ChatCompletionMessageParam]) -> GenerationOutput:
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
    
    return GenerationOutput(
        text=text,
        generatedAt=timer.started_at,
        service=SERVICE_NAME,
        model=model,
        completionTokens=completion_tokens,
        promptTokens=prompt_tokens,
        timeToGenerate=timer.elapsed_ms,
    )
