import os
from typing import cast

from snowflake.snowpark import Session as SnowflakeSession
from snowflake.sqlalchemy import TIMESTAMP_LTZ, URL
from sqlalchemy import Engine as SQLAlchemyEngine
from sqlalchemy import create_engine as create_sqlalchemy_engine
from sqlalchemy import event as sqlalchemy_event
from sqlalchemy import text
from sqlalchemy.orm import Session as SqlAlchemySession
from sqlalchemy.types import TypeEngine

from app.config import settings
from app.services.adapters import DatabaseProvider


def _is_spcs_oauth() -> bool:
    return os.path.isfile(settings.SNOWFLAKE_TOKEN_PATH)


def _get_spcs_login_token() -> str:
    if not _is_spcs_oauth():
        raise Exception("Snowflake token is missing")

    with open(settings.SNOWFLAKE_TOKEN_PATH, "r") as f:
        return f.read()


def _get_connection_settings() -> dict[str, int | str]:
    connection_parameters: dict[str, str | None] = {
        "account": settings.SNOWFLAKE_ACCOUNT,
        "database": settings.SNOWFLAKE_DATABASE,
        "schema": settings.SNOWFLAKE_SCHEMA,
        "warehouse": settings.SNOWFLAKE_WAREHOUSE,
    }

    if _is_spcs_oauth():
        connection_parameters["authenticator"] = "oauth"
        connection_parameters["host"] = settings.SNOWFLAKE_HOST
    else:
        connection_parameters["authenticator"] = "externalbrowser"
        connection_parameters["user"] = settings.SNOWFLAKE_USERNAME
        connection_parameters["role"] = settings.SNOWFLAKE_ROLE

    if None in connection_parameters.values():
        raise Exception("Snowflake settings are not correctly configured")

    return cast(dict[str, int | str], connection_parameters)


class SnowflakeDatabaseProvider(DatabaseProvider):
    @property
    def datetime_type(self) -> type[TypeEngine]:
        return TIMESTAMP_LTZ

    @staticmethod
    def create_engine() -> SQLAlchemyEngine:
        connection_parameters = _get_connection_settings()

        engine_url = URL(**connection_parameters, cache_column_metadata=True)

        database_engine = create_sqlalchemy_engine(
            engine_url,
            pool_pre_ping=True,
            pool_size=(
                0 if settings.ENVIRONMENT != "development" else 1
            ),  # 0 -> unlimited
            pool_recycle=(
                45 * 60 if _is_spcs_oauth() else 4 * 60 * 60
            ),  # SPCS oauth: 45 min; else 4 hrs
            hide_parameters=(
                settings.ENVIRONMENT != "development"
            ),  # Prevent logging sensitive data in production
        )

        if _is_spcs_oauth():

            @sqlalchemy_event.listens_for(database_engine, "do_connect")
            def provide_token(dialect, conn_rec, cargs, cparams):
                cparams["token"] = _get_spcs_login_token()

        return database_engine

    @staticmethod
    def next_guid(database: SqlAlchemySession) -> int:
        return database.scalars(text("SELECT sqid_sequence.nextval")).one()


def start_session() -> SnowflakeSession:
    connection_settings = _get_connection_settings()

    if connection_settings["authenticator"] == "oauth":
        connection_settings["token"] = _get_spcs_login_token()

    session = SnowflakeSession.builder.configs({**connection_settings}).create()

    return session
