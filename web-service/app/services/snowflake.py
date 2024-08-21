import os
import json
from typing import Annotated

import snowflake.connector
import snowflake.cortex
from fastapi import Depends, Header
from snowflake.connector import SnowflakeConnection
from snowflake.snowpark import Session

from app.config import settings, get_app_logger
from app.schemas import User, NoteInstructionsId
from app.services.error_handling import ExternalServiceError, Unauthorized

logger = get_app_logger(__name__)

def connect() -> SnowflakeConnection:
    def get_login_token() -> str | None:
        if os.path.exists(settings.SNOWFLAKE_TOKEN_PATH):
            with open(settings.SNOWFLAKE_TOKEN_PATH, "r") as f:
                return f.read()
        else:
            return None

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

    return snowflake.connector.connect(**connection_parameters)

def session(connection: SnowflakeConnection) -> Session:
    return Session.builder.configs({"connection": connection}).create()

def get_user_agent(sf_context_current_user: Annotated[str | None, Header()] = None) -> User:
    username = sf_context_current_user or settings.SIMULATE_USER

    if username is None:
        raise Unauthorized.as_http_exception()
    
    try:
        with connect() as connection:
            cursor = connection.cursor()

            # Fetch the user record.
            result = cursor.execute(
                "SELECT id, default_note FROM users WHERE username = %(username)s",
                { "username": username }
            )

            logger.info("First user query succeeded.")
            
            # If the user does not exist in the database yet, create it with default values.
            if result.rowcount == 0:
                cursor.execute(
                    """
                    INSERT INTO users (username, default_note)
                    SELECT %(username)s, { 
                        'is_builtin': TRUE,
                        'id': (SELECT id FROM builtin_note_instructions WHERE is_default = TRUE)
                    }
                    """,
                    { "username": username }
                )

                # Get the created user.
                result = cursor.execute(
                    "SELECT id, default_note FROM users WHERE username = %(username)s",
                    { "username": username }
                )

            (user_id, default_note) = result.fetchone()

            return User(id=user_id, username=username, default_note=NoteInstructionsId(**json.loads(default_note)))
    except Exception as e:
        raise ExternalServiceError("Snowflake", str(e)).as_http_exception()

UserAgent = Annotated[User, Depends(get_user_agent)]

def get_note_instructions() -> list[NoteInstructionsId]:
    pass