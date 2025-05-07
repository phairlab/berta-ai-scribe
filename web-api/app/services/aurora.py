# app/services/aurora.py
from sqlalchemy import TIMESTAMP, text
from sqlalchemy import Engine as SQLAlchemyEngine
from sqlalchemy import create_engine as create_sqlalchemy_engine
from sqlalchemy.orm import Session as SqlAlchemySession
from sqlalchemy.types import TypeEngine
import time

from app.config import settings
from app.services.adapters import DatabaseProvider


class AuroraPostgresProvider(DatabaseProvider):
    @property
    def datetime_type(self) -> type[TypeEngine]:
        return TIMESTAMP

    @staticmethod
    def create_engine() -> SQLAlchemyEngine:
        connection_string = (
            f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@"
            f"{settings.AURORA_WRITER_ENDPOINT}:{settings.DB_PORT}/{settings.DB_NAME}"
        )

        database_engine = create_sqlalchemy_engine(
            connection_string,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=1800,
        )
        return database_engine

    @staticmethod
    def next_guid(database: SqlAlchemySession) -> int:
        # Use a more PostgreSQL-specific approach for sequences
        try:
            # First try the sqid_sequence table approach (for compatibility)
            result = database.execute(
                text("INSERT INTO sqid_sequence DEFAULT VALUES RETURNING id;")
            ).scalar_one()
            database.commit()
            return result
        except Exception as db_error:
            # If that fails, try a proper sequence or create one
            database.rollback()  # Important: rollback the failed transaction

            try:
                # Check if the sequence exists
                seq_exists = database.execute(
                    text(
                        "SELECT EXISTS(SELECT 1 FROM pg_sequences WHERE schemaname = current_schema() AND sequencename = 'sqid_sequence')"
                    )
                ).scalar_one()

                if not seq_exists:
                    # Create sequence if it doesn't exist
                    database.execute(
                        text("CREATE SEQUENCE sqid_sequence START WITH 42874")
                    )
                    database.commit()

                # Get the next value
                result = database.execute(
                    text("SELECT nextval('sqid_sequence')")
                ).scalar_one()
                database.commit()
                return result
            except Exception as seq_error:
                # Rollback and use fallback
                database.rollback()
                print(f"Error with sequence: {seq_error}")
                # Fallback: use timestamp (will be consistent enough for development)
                return int(time.time() * 1000) % 1000000
