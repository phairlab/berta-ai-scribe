import os
import json
from typing import BinaryIO

import aiohttp
import openai
import snowflake.connector
import snowflake.cortex
from snowflake.snowpark import Session
from openai import AsyncOpenAI, NotGiven

from app.services.error_handling import ExternalServiceTimeout, ExternalServiceError, ExternalServiceInterruption, WebServiceError
from app.config import get_app_logger, settings

logger = get_app_logger(__name__)

def get_login_token() -> str | None:
    if os.path.exists(settings.SNOWFLAKE_TOKEN_PATH):
        with open(settings.SNOWFLAKE_TOKEN_PATH, "r") as f:
            return f.read()
    else:
        return None

async def transcribe_audio(audio_file: BinaryIO, filename: str, content_type: str, prompt: str | None = None, timeout: int | None = None) -> str:
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
        logger.info(f"Generating transcript using local whisper service: {settings.WHISPER_SERVICE_URL}")
        service = "Transcription Service"

        async with aiohttp.ClientSession(settings.WHISPER_SERVICE_URL) as session:
            form_data = aiohttp.FormData()
            form_data.add_field("audio", audio_file.read(), filename=filename)

            async with session.post("/transcribe-audio", data=form_data) as response:
                if response.status == 200:
                    transcript = await response.json()
                    return transcript["text"]
                else:
                    error = await response.json()
                    error_message = error["detail"]
                    raise ExternalServiceError(service, error_message)

    else:
        raise WebServiceError(f"Unknown transcription service '{settings.TRANSCRIPTION_SERVICE}'. Check and correct the server configuration.")

async def summarize_transcript(transcript: str, prompt: str, timeout: int | None = None) -> str:
    messages = [
        {"role": "system", "content": "Format your responses plain text only, do not include any markdown syntax. Use asterisks before and after header text to indicate headers."},
        {"role": "system", "content": prompt},
        {"role": "user", "content": transcript}
    ]

    if settings.SUMMARIZATION_SERVICE == "OPENAI":
        logger.info("Generating note using OpenAI API")
        service = "OpenAI"

        try:
            openai_client = AsyncOpenAI(timeout=timeout, max_retries=0)
            response = await openai_client.chat.completions.create(model="gpt-4o", temperature=0, messages=messages)
            summary = response.choices[0].message.content

            return summary
        except openai.APITimeoutError as e:
            raise ExternalServiceTimeout(service, str(e))
        except (openai.ConflictError, openai.InternalServerError, openai.RateLimitError, openai.UnprocessableEntityError) as e:
            raise ExternalServiceInterruption(service, str(e))
        except Exception as e:
            raise ExternalServiceError(service, str(e))
        
    elif settings.SUMMARIZATION_SERVICE == "SNOWFLAKE_CORTEX":
        logger.info("Generating note using Snowflake Cortex")
        service = "Snowflake Cortex"

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

        try:
            with snowflake.connector.connect(**connection_parameters) as connection:
                with Session.builder.configs({"connection": connection}).create():
                    response = snowflake.cortex.Complete(settings.SUMMARIZATION_MODEL, messages, options={ "temperature": 0 })
                    summary = json.loads(response)["choices"][0]["messages"]

            return summary
        except Exception as e:
            logger.error(e)
            raise ExternalServiceError(service, str(e))
    else:
        raise WebServiceError(f"Unknown note generation service '{settings.TRANSCRIPTION_SERVICE}'. Check and correct the server configuration.")
