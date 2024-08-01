import logging

import openai
from openai import AsyncOpenAI, NotGiven

from app.services.error_handling import AIServiceTimeout, AIServiceError, TransientAIServiceError

logger = logging.getLogger(__name__)

async def summarize_transcript(transcript: str, prompt: str, timeout: int | NotGiven = NotGiven) -> str:
    openai_client = AsyncOpenAI(timeout=timeout, max_retries=0)
    messages = [
        {"role": "system", "content": "Format your responses plain text only, do not include any markdown syntax. Use asterisks before and after header text to indicate headers."},
        {"role": "system", "content": prompt},
        {"role": "user", "content": transcript}
    ]

    try:        
        response = await openai_client.chat.completions.create(model="gpt-4o", temperature=0, messages=messages)
        summary = response.choices[0].message.content
    except openai.APITimeoutError as e:
        # Timeout errors.
        raise AIServiceTimeout(str(e))
    except (openai.ConflictError, openai.InternalServerError, openai.RateLimitError) as e:
        # Errors that should be retried.
        raise TransientAIServiceError(str(e))
    except Exception as e:
        # All other errors.
        raise AIServiceError(str(e))

    return summary