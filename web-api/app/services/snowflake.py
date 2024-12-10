import os

from snowflake.snowpark import Session as SnowflakeSession
from snowflake.sqlalchemy import URL
from sqlalchemy import Engine as SQLAlchemyEngine, event as sqlalchemy_event, create_engine as create_sqlalchemy_engine

from app.config import settings

def is_spcs_oauth() -> bool:
    return os.path.isfile(settings.SNOWFLAKE_TOKEN_PATH)

def get_spcs_login_token() -> str | None:
    if os.path.isfile(settings.SNOWFLAKE_TOKEN_PATH):
        with open(settings.SNOWFLAKE_TOKEN_PATH, "r") as f:
            return f.read()
    else:
        return None

def create_engine() -> SQLAlchemyEngine:
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

    return create_sqlalchemy_engine(
        engine_url,
        pool_pre_ping=True,
        pool_size=0 if settings.ENVIRONMENT != "development" else 1, # 0 -> unlimited
        pool_recycle=45*60 if is_spcs_oauth() else 4*60*60, # SPCS oauth: 45 min; else 4 hrs
        hide_parameters=(settings.ENVIRONMENT != "development") # Prevent logging sensitive data in production
    )

db_engine: SQLAlchemyEngine = create_engine()

@sqlalchemy_event.listens_for(db_engine, "do_connect")
def provide_token(dialect, conn_rec, cargs, cparams):
    if is_spcs_oauth():
        cparams["token"] = get_spcs_login_token()

def start_session() -> SnowflakeSession:
    return SnowflakeSession.builder.configs({"connection": db_engine.raw_connection()}).create()

