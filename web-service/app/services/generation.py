import os
import json

import openai
import snowflake.connector
import snowflake.cortex
from snowflake.snowpark.exceptions import SnowparkClientException
from snowflake.snowpark import Session
from openai import AsyncOpenAI

from app.services.error_handling import ExternalServiceTimeout, ExternalServiceError, ExternalServiceInterruption, WebServiceError
from app.config import get_app_logger, settings

logger = get_app_logger(__name__)

def get_login_token() -> str | None:
    if os.path.exists(settings.SNOWFLAKE_TOKEN_PATH):
        with open(settings.SNOWFLAKE_TOKEN_PATH, "r") as f:
            return f.read()
    else:
        return None

async def summarize_transcript(transcript: str, instructions: str, timeout: int | None = None) -> str:
    messages = [
        {"role": "system", "content": "Format your responses plain text only, do not include any markdown syntax. Use asterisks before and after header text to indicate headers."},
        {"role": "system", "content": f"You will be provided the text of a transcript as input, use those instructions to generate the response: : {instructions}"},
        {
            "role": "system",
            "content": 
                """
                Do not state any facts in the response that are not clearly supported by statements in the transcript.
                If the transcript does not contain enough information for a section, it can be left blank or omitted.
                If there is not enough information to generate the response as directed overall, or the transcript does not appear relevant to the instructions, you can reply to that effect instead.
                """
        },
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
                "connection_name": "AHSJENKINS",
                "role": settings.SNOWFLAKE_ROLE,
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
        except SnowparkClientException as e:
            raise ExternalServiceError(service, str(e))
    else:
        raise WebServiceError(f"Unknown note generation service '{settings.TRANSCRIPTION_SERVICE}'. Check and correct the server configuration.")
