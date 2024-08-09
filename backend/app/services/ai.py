import os
import json
from typing import BinaryIO

import openai
import snowflake.connector
import snowflake.cortex
from snowflake.snowpark import Session
from openai import AsyncOpenAI, NotGiven

from app.services.error_handling import AIServiceTimeout, AIServiceError, TransientAIServiceError
from app.config import get_app_logger, settings

logger = get_app_logger(__name__)

def get_login_token() -> str | None:
    if os.path.exists(settings.SNOWFLAKE_TOKEN_PATH):
        with open(settings.SNOWFLAKE_TOKEN_PATH, "r") as f:
            return f.read()
    else:
        return None

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

async def summarize_transcript(transcript: str, prompt: str, timeout: int | None = None) -> str:
    messages = [
        {"role": "system", "content": "Format your responses plain text only, do not include any markdown syntax. Use asterisks before and after header text to indicate headers."},
        {"role": "system", "content": prompt},
        {"role": "user", "content": transcript}
    ]

    try:
        if settings.SUMMARIZATION_SERVICE == "OPENAI_API":
            openai_client = AsyncOpenAI(timeout=timeout, max_retries=0)
            response = await openai_client.chat.completions.create(model="gpt-4o", temperature=0, messages=messages)
            summary = response.choices[0].message.content
        else:
            login_token = get_login_token()

            if login_token is not None:
                connection_parameters = {
                    "host": settings.SNOWFLAKE_HOST,
                    "account": settings.SNOWFLAKE_ACCOUNT,
                    "authenticator": "oauth",
                    "token": login_token,
                    "database": settings.SNOWFLAKE_DATABASE,
                    "schema": settings.SNOWFLAKE_SCHEMA,
                    "warehouse": settings.SNOWFLAKE_WAREHOUSE,
                }
            else:
                connection_parameters = {
                    "account": settings.SNOWFLAKE_ACCOUNT,
                    "user": settings.SNOWFLAKE_USER,
                    "role": settings.SNOWFLAKE_ROLE,
                    "password": settings.SNOWFLAKE_PASSWORD,
                    "database": settings.SNOWFLAKE_DATABASE,
                    "schema": settings.SNOWFLAKE_SCHEMA,
                    "warehouse": settings.SNOWFLAKE_WAREHOUSE,
                }

            with snowflake.connector.connect(**connection_parameters) as connection:
                with Session.builder.configs({"connection": connection}).create():
                    response = snowflake.cortex.Complete(settings.SUMMARIZATION_MODEL, messages, options={ "temperature": 0 })
                    summary = json.loads(response)["choices"][0]["messages"]
    except openai.APITimeoutError as e:
        # Timeout errors.
        logger.error(e)
        raise AIServiceTimeout(f"{settings.SUMMARIZATION_SERVICE}: {str(e)}")
    except (openai.ConflictError, openai.InternalServerError, openai.RateLimitError, openai.UnprocessableEntityError) as e:
        # Errors that should be retried.
        logger.error(e)
        raise TransientAIServiceError(f"{settings.SUMMARIZATION_SERVICE}: {str(e)}")
    except Exception as e:
        # All other errors.
        logger.error(e)
        raise AIServiceError(f"{settings.SUMMARIZATION_SERVICE}: {str(e)}")

    return summary