from sqlalchemy import DATETIME
from sqlalchemy import Engine as SQLAlchemyEngine
from sqlalchemy import create_engine as create_sqlalchemy_engine
from sqlalchemy import text
from sqlalchemy.orm import Session as SqlAlchemySession
from sqlalchemy.types import TypeEngine

from app.config import settings
from app.services.adapters import DatabaseProvider


class SqliteDatabaseProvider(DatabaseProvider):
    @property
    def datetime_type(self) -> type[TypeEngine]:
        return DATETIME

    @staticmethod
    def create_engine() -> SQLAlchemyEngine:
        engine_url = f"sqlite+pysqlite:///{settings.DEV_DATABASE_FILE}"
        database_engine = create_sqlalchemy_engine(engine_url)
        return database_engine

    @staticmethod
    def next_guid(database: SqlAlchemySession) -> int:
        id = database.execute(
            text("INSERT INTO sqid_sequence DEFAULT VALUES RETURNING id;")
        ).scalar_one()

        database.commit()

        return id