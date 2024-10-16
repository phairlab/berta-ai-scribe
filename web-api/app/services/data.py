import os
from typing import Callable

import snowflake.connector
from snowflake.snowpark import Session as SnowflakeSession
from snowflake.sqlalchemy import URL
from sqlalchemy import Engine as SQLAlchemyEngine, event, create_engine

from app.config import settings

def is_spcs_oauth() -> bool:
    return os.path.isfile(settings.SNOWFLAKE_TOKEN_PATH)

def get_spcs_login_token() -> str | None:
    if os.path.isfile(settings.SNOWFLAKE_TOKEN_PATH):
        with open(settings.SNOWFLAKE_TOKEN_PATH, "r") as f:
            return f.read()
    else:
        return None

def create_snowflake_engine() -> SQLAlchemyEngine:
    if is_spcs_oauth():
        engine_url = URL(
            host=settings.SNOWFLAKE_HOST,
            account=settings.SNOWFLAKE_ACCOUNT,
            authenticator="oauth",
            database=settings.SNOWFLAKE_DATABASE,
            schema=settings.SNOWFLAKE_SCHEMA,
            warehouse=settings.SNOWFLAKE_WAREHOUSE,
            cache_column_metadata=True,
        )
    else:
        engine_url = URL(
            account=settings.SNOWFLAKE_ACCOUNT,
            user=settings.SNOWFLAKE_USERNAME,
            authenticator="externalbrowser",
            role=settings.SNOWFLAKE_ROLE,
            database=settings.SNOWFLAKE_DATABASE,
            schema=settings.SNOWFLAKE_SCHEMA,
            warehouse=settings.SNOWFLAKE_WAREHOUSE,
            cache_column_metadata=True,
        )

    return create_engine(
        engine_url,
        pool_pre_ping=(settings.ENVIRONMENT != "development"), 
        max_overflow=(0 if settings.ENVIRONMENT == "development" else 10), 
        pool_size=(1 if settings.ENVIRONMENT == "development" else 5),
        pool_recycle=45*60, # 45 min
        hide_parameters=(settings.ENVIRONMENT != "development")
    )

db_engine: SQLAlchemyEngine = create_snowflake_engine()

@event.listens_for(db_engine, "do_connect")
def provide_token(dialect, conn_rec, cargs, cparams):
    if is_spcs_oauth():
        cparams["token"] = get_spcs_login_token()

def create_snowflake_session() -> SnowflakeSession:
    if is_spcs_oauth():
        connection_parameters = {
            "host": settings.SNOWFLAKE_HOST,
            "account": settings.SNOWFLAKE_ACCOUNT,
            "authenticator": "oauth",
            "token": get_spcs_login_token(),
            "database": settings.SNOWFLAKE_DATABASE,
            "schema": settings.SNOWFLAKE_SCHEMA,
            "warehouse": settings.SNOWFLAKE_WAREHOUSE,
        }
    else:
        connection_parameters = {
            "account": settings.SNOWFLAKE_ACCOUNT,
            "user": settings.SNOWFLAKE_USERNAME,
            "authenticator": "externalbrowser",
            "role": settings.SNOWFLAKE_ROLE,
            "database": settings.SNOWFLAKE_DATABASE,
            "schema": settings.SNOWFLAKE_SCHEMA,
            "warehouse": settings.SNOWFLAKE_WAREHOUSE,
        }

    snowflake_connection = snowflake.connector.connect(**connection_parameters, autocommit=False)

    return SnowflakeSession.builder.configs({"connection": snowflake_connection}).create()

def inject_snowflake_session(func: Callable):
    def inner(*args, **kwargs):
        if settings.ENVIRONMENT == "development":
            result = func(*args, **kwargs)
            return result
        else:
            with create_snowflake_session() as session:
                kwargs["snowflakeSession"] = session

                result = func(*args, **kwargs)
                return result

    return inner
