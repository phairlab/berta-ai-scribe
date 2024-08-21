import json

import openai
import snowflake.cortex
from openai import AsyncOpenAI

import app.services.snowflake as snowflake_service
from app.services.error_handling import ExternalServiceTimeout, ExternalServiceError, ExternalServiceInterruption, WebServiceError
from app.config import get_app_logger, settings

logger = get_app_logger(__name__)

async def summarize_transcript(transcript: str, instructions: str, timeout: int | None = None) -> str:
    messages = [
        {"role": "system", "content": "Format your responses plain text only, do not include any markdown syntax. Use asterisks before and after header text to indicate headers."},
        {"role": "user", "content": instructions},
        {"role": "user", "content": transcript}
    ]

    if settings.GENERATIVE_AI_SERVICE == "OPENAI":
        service = "OpenAI"
        model = settings.GENERATIVE_AI_MODEL

        logger.info(f"Summarizing transcript using OpenAI; model: {model}")

        try:
            openai_client = AsyncOpenAI(timeout=timeout, max_retries=0)
            response = await openai_client.chat.completions.create(model=model, temperature=0, messages=messages)
            summary = response.choices[0].message.content

            return summary
        except openai.APITimeoutError as e:
            raise ExternalServiceTimeout(service, str(e))
        except (openai.ConflictError, openai.InternalServerError, openai.RateLimitError, openai.UnprocessableEntityError) as e:
            raise ExternalServiceInterruption(service, str(e))
        except Exception as e:
            raise ExternalServiceError(service, str(e))
        
    elif settings.GENERATIVE_AI_SERVICE == "SNOWFLAKE_CORTEX":
        service = "Snowflake Cortex"
        model = settings.GENERATIVE_AI_MODEL

        logger.info(f"Summarizing transcript using Snowflake Cortex; model: {model}")

        try:
            with snowflake_service.connect() as connection:
                with snowflake_service.session(connection):
                    response = snowflake.cortex.Complete(model, messages, options={ "temperature": 0 })
                    summary = json.loads(response)["choices"][0]["messages"]
                    return summary

        except Exception as e:
            raise ExternalServiceError(service, str(e))
    else:
        raise WebServiceError(f"Unknown note generation service '{settings.TRANSCRIPTION_SERVICE}'. Check and correct the server configuration.")
