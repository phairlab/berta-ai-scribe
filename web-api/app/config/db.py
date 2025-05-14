import os
from collections.abc import Generator, Iterator
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any, BinaryIO, Literal

from fastapi import Depends
from sqids.sqids import Sqids
from sqlalchemy import (
    CHAR,
    INTEGER,
    VARCHAR,
    Engine,
    ForeignKey,
    ForeignKeyConstraint,
    Sequence,
    func,
    select,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped
from sqlalchemy.orm import Session as DatabaseSession
from sqlalchemy.orm import mapped_column, relationship, sessionmaker

from app.config import settings
from app.services.adapters import DatabaseProvider
from app.services.snowflake import SnowflakeDatabaseProvider
from app.services.sqlite import SqliteDatabaseProvider
from app.services.aurora import AuroraPostgresProvider
from app.config.storage import save_recording, stream_recording, delete_recording

sqids = Sqids(alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")

def get_database_provider() -> DatabaseProvider:
    """Get the appropriate database provider based on settings."""
    if settings.USE_AURORA and settings.AURORA_WRITER_ENDPOINT and settings.DB_USER and settings.DB_PASSWORD:
        print("Using Aurora PostgreSQL database")
        return AuroraPostgresProvider()
    elif settings.ENVIRONMENT == "development" and not settings.USE_AURORA:
        print("Using SQLite database for development")
        return SqliteDatabaseProvider()
    else:
        print("Using Snowflake database")
        return SnowflakeDatabaseProvider()

# Initialize database provider and engine
database_provider = get_database_provider()
engine: Engine = database_provider.create_engine()
DatabaseSessionMaker = sessionmaker(engine)

DATETIME_TYPE = database_provider.datetime_type


def get_database_session() -> Iterator[DatabaseSession]:
    with DatabaseSessionMaker() as database:
        yield database


useDatabase = Annotated[DatabaseSession, Depends(get_database_session)]


def next_sqid(database: DatabaseSession) -> str:
    guid = database_provider.next_guid(database)
    return sqids.encode([guid])


def autoid_column(sequence_name: str):
    return mapped_column(INTEGER, Sequence(sequence_name), primary_key=True)


def sqid_column(primary_key: bool = False):
    return mapped_column(VARCHAR(12), primary_key=primary_key)


def uuid_column(primary_key: bool = False):
    return mapped_column(CHAR(36), primary_key=primary_key)


class Base(DeclarativeBase):
    pass


# ----------------------------------
# LOG TABLES


class SessionRecord(Base):
    __tablename__ = "session_log"

    session_id: Mapped[str] = uuid_column(primary_key=True)
    username: Mapped[str] = mapped_column(VARCHAR(255))
    started: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    user_agent: Mapped[str]


class ErrorRecord(Base):
    __tablename__ = "error_log"

    error_id: Mapped[str] = uuid_column(primary_key=True)
    occurred: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    name: Mapped[str] = mapped_column(VARCHAR(500))
    message: Mapped[str]
    stack_trace: Mapped[str]
    request_id: Mapped[str | None] = uuid_column()
    session_id: Mapped[str | None] = uuid_column()


class RequestRecord(Base):
    __tablename__ = "request_log"

    request_id: Mapped[str] = uuid_column(primary_key=True)
    requested: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    url: Mapped[str] = mapped_column(VARCHAR(500))
    method: Mapped[str] = mapped_column(VARCHAR(10))
    status_code: Mapped[int]
    status_text: Mapped[str | None] = mapped_column(VARCHAR(50))
    duration: Mapped[int]
    session_id: Mapped[str | None] = uuid_column()


class AudioConversionTask(Base):
    __tablename__ = "audio_conversion_log"

    task_id: Mapped[str] = uuid_column(primary_key=True)
    task_type: Mapped[str] = mapped_column(VARCHAR(50))
    recording_id: Mapped[str] = sqid_column()
    started: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    time: Mapped[int]
    original_media_type: Mapped[str] = mapped_column(VARCHAR(255))
    original_file_size: Mapped[int]
    converted_media_type: Mapped[str | None] = mapped_column(VARCHAR(255))
    converted_file_size: Mapped[int | None]
    error_id: Mapped[str | None] = uuid_column()
    session_id: Mapped[str | None] = uuid_column()


class TranscriptionTask(Base):
    __tablename__ = "transcription_log"

    task_id: Mapped[str] = uuid_column(primary_key=True)
    recording_id: Mapped[str] = sqid_column()
    started: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    time: Mapped[int]
    service: Mapped[str] = mapped_column(VARCHAR(50))
    error_id: Mapped[str | None] = uuid_column()
    session_id: Mapped[str | None] = uuid_column()


class GenerationTask(Base):
    __tablename__ = "generation_log"

    task_id: Mapped[str] = uuid_column(primary_key=True)
    record_id: Mapped[str] = sqid_column()
    task_type: Mapped[str] = mapped_column(VARCHAR(255))
    started: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    time: Mapped[int]
    service: Mapped[str] = mapped_column(VARCHAR(50))
    model: Mapped[str] = mapped_column(VARCHAR(50))
    completion_tokens: Mapped[int]
    prompt_tokens: Mapped[int]
    error_id: Mapped[str | None] = uuid_column()
    session_id: Mapped[str | None] = uuid_column()


# ----------------------------------
# ENTITY TABLES


class User(Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(VARCHAR(255), primary_key=True)
    registered: Mapped[datetime] = mapped_column(
        DATETIME_TYPE, default=lambda: datetime.now(timezone.utc).astimezone()
    )
    updated: Mapped[datetime] = mapped_column(
        DATETIME_TYPE, default=lambda: datetime.now(timezone.utc).astimezone()
    )
    default_note: Mapped[str | None] = sqid_column()
    enabled_notes: Mapped[str | None]

    encounters: Mapped[list["Encounter"]] = relationship(back_populates="user")
    note_definitions: Mapped[list["NoteDefinition"]] = relationship(
        back_populates="user"
    )


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id: Mapped[str] = uuid_column(primary_key=True)
    username: Mapped[str] = mapped_column(ForeignKey("users.username"))
    submitted: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    details: Mapped[str]
    context: Mapped[str] = mapped_column(default="(NOT CAPTURED)")
    session_id: Mapped[str | None] = uuid_column()


class NoteDefinition(Base):
    __tablename__ = "note_definitions"

    id: Mapped[str] = sqid_column(primary_key=True)
    version: Mapped[str] = sqid_column(primary_key=True)
    username: Mapped[str] = mapped_column(ForeignKey("users.username"))
    created: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    category: Mapped[str] = mapped_column(VARCHAR(50))
    title: Mapped[str] = mapped_column(VARCHAR(100))
    instructions: Mapped[str]
    model: Mapped[str] = mapped_column(VARCHAR(50))
    inactivated: Mapped[datetime | None] = mapped_column(DATETIME_TYPE)
    output_type: Mapped[str] = mapped_column(VARCHAR(50))

    user: Mapped["User"] = relationship(back_populates="note_definitions")


class Encounter(Base):
    __tablename__ = "encounters"

    id: Mapped[str] = sqid_column(primary_key=True)
    username: Mapped[str] = mapped_column(ForeignKey("users.username"))
    created: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    modified: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    label: Mapped[str | None] = mapped_column(VARCHAR(100))
    autolabel: Mapped[str | None] = mapped_column(VARCHAR(100))
    context: Mapped[str | None]
    inactivated: Mapped[datetime | None] = mapped_column(DATETIME_TYPE)
    purged: Mapped[datetime | None] = mapped_column(DATETIME_TYPE)

    user: Mapped["User"] = relationship(back_populates="encounters")
    recording: Mapped["Recording"] = relationship(
        back_populates="encounter", cascade="all, delete"
    )
    draft_notes: Mapped[list["DraftNote"]] = relationship(back_populates="encounter")


class Recording(Base):
    __tablename__ = "recordings"

    id: Mapped[str] = sqid_column(primary_key=True)
    encounter_id: Mapped[str] = mapped_column(ForeignKey("encounters.id"))
    media_type: Mapped[str | None] = mapped_column(VARCHAR(255))
    file_size: Mapped[int | None]
    duration: Mapped[int]
    waveform_peaks: Mapped[str | None]
    segments: Mapped[str | None]
    transcript: Mapped[str | None]

    encounter: Mapped["Encounter"] = relationship(back_populates="recording")


class DraftNote(Base):
    __tablename__ = "draft_notes"

    id: Mapped[str] = sqid_column(primary_key=True)
    encounter_id: Mapped[str] = mapped_column(ForeignKey("encounters.id"))
    definition_id: Mapped[str] = sqid_column()
    definition_version: Mapped[str] = sqid_column()
    created: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    title: Mapped[str] = mapped_column(VARCHAR(100))
    model: Mapped[str] = mapped_column(VARCHAR(50))
    content: Mapped[str]
    inactivated: Mapped[datetime | None] = mapped_column(DATETIME_TYPE)
    output_type: Mapped[str] = mapped_column(VARCHAR(50))
    is_flagged: Mapped[bool] = mapped_column(default=False)
    comments: Mapped[str | None] = mapped_column(VARCHAR(500))

    __table_args__ = (
        ForeignKeyConstraint(
            ["definition_id", "definition_version"],
            ["note_definitions.id", "note_definitions.version"],
        ),
    )

    encounter: Mapped["Encounter"] = relationship(back_populates="draft_notes")
    note_definition: Mapped["NoteDefinition"] = relationship()


# ----------------------------------
# CHANGE TRACKING

DataEntityType = Literal["USER", "NOTE DEFINITION", "ENCOUNTER"]
DataChangeType = Literal["CREATED", "MODIFIED", "REMOVED"]


class DataChangeRecord(Base):
    __tablename__ = "data_changes"

    id: Mapped[int] = autoid_column("data_change_ids")
    logged: Mapped[datetime] = mapped_column(
        DATETIME_TYPE, default=func.current_timestamp()
    )
    changed: Mapped[datetime] = mapped_column(DATETIME_TYPE)
    username: Mapped[str] = mapped_column(VARCHAR(255))
    session_id: Mapped[str] = uuid_column()
    entity_type: Mapped[DataEntityType] = mapped_column(VARCHAR(255))
    entity_id: Mapped[str | None] = sqid_column()
    change_type: Mapped[DataChangeType] = mapped_column(VARCHAR(50))
    server_task: Mapped[bool] = mapped_column(default=False)


# ---------------------------------
# CONFIG UPDATES


def is_datafolder_initialized() -> bool:
    """Check if the data folder and database are properly initialized."""
    if not os.path.exists(settings.DATA_FOLDER):
        return False
    
    if not os.path.exists(settings.RECORDINGS_FOLDER):
        return False
        
    db_path = os.path.join(settings.DATA_FOLDER, "database.db")
    if not os.path.exists(db_path):
        return False
        
    # Check if the database has the required tables
    try:
        with next(get_database_session()) as database:
            # Check if users table exists and has the system user
            result = database.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
            ).scalar_one_or_none()
            if not result:
                return False
                
            # Check if system user exists
            result = database.execute(
                text("SELECT username FROM users WHERE username = :username"),
                {"username": settings.SYSTEM_USER}
            ).scalar_one_or_none()
            if not result:
                return False
                
            # Check if sqid_sequence table exists and has initial value
            result = database.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='sqid_sequence'")
            ).scalar_one_or_none()
            if not result:
                return False
                
            result = database.execute(
                text("SELECT id FROM sqid_sequence LIMIT 1")
            ).scalar_one_or_none()
            if not result:
                return False
                
            return True
    except Exception as e:
        print(f"Error checking database initialization: {e}")
        return False


def initialize_dev_datafolder():
    """Initialize the development data folder and database."""
    try:
        print("Initializing development environment...")
        
        # Create data folders if they don't exist
        os.makedirs(settings.DATA_FOLDER, exist_ok=True)
        os.makedirs(settings.RECORDINGS_FOLDER, exist_ok=True)
        
        # Create all database tables
        print("Creating database tables...")
        Base.metadata.create_all(engine)
        
        # Initialize the database with required data
        with next(get_database_session()) as database:
            # Check if system user exists
            system_user = database.execute(
                select(User).where(User.username == settings.SYSTEM_USER)
            ).scalar_one_or_none()
            
            if not system_user:
                print("Creating system user...")
                database.add(User(username=settings.SYSTEM_USER))
            
            # Check if sqid_sequence table exists and has initial value
            try:
                database.execute(text("SELECT id FROM sqid_sequence LIMIT 1")).scalar_one()
            except Exception:
                print("Initializing sqid_sequence table...")
                database.execute(text("CREATE TABLE IF NOT EXISTS sqid_sequence (id INTEGER PRIMARY KEY);"))
                database.execute(text("INSERT INTO sqid_sequence (id) VALUES (42874);"))
            
            database.commit()
            print("Database initialization complete.")
            
            # Verify initialization
            if not is_datafolder_initialized():
                raise Exception("Database initialization verification failed")
                
    except Exception as e:
        print(f"Error initializing development environment: {e}")
        import traceback
        traceback.print_exc()
        raise


def update_builtin_notetypes():
    """Update the built-in note types in the database."""
    updated = datetime.now(timezone.utc).astimezone()
    
    # Get all note type files from the built-in note types directory
    categories = [
        (f.name, f.path)
        for f in os.scandir(settings.BUILTIN_NOTETYPES_FOLDER)
        if f.is_dir()
    ]

    filepaths = [
        (category, Path(f.path))
        for (category, folder) in categories
        for f in os.scandir(folder)
        if f.is_file() and Path(f.name).suffix == ".txt"
    ]

    note_titles = {path.stem for (_, path) in filepaths}
    print(f"Found {len(note_titles)} note types in filesystem")

    with next(get_database_session()) as database:
        # Get the current built-in note types
        get_builtin_notetypes = (
            select(NoteDefinition)
            .where(
                NoteDefinition.inactivated.is_(None),
                NoteDefinition.username == settings.SYSTEM_USER,
            )
            .order_by(NoteDefinition.title)
        )

        saved_notetypes = {
            nt.title: nt for nt in database.execute(get_builtin_notetypes).scalars()
        }
        print(f"Found {len(saved_notetypes)} note types in database")

        for category, path in filepaths:
            title = path.stem
            print(f"Processing note type: {title}")

            try:
                with open(path, "r", encoding="utf8") as f:
                    instructions = f.read().strip()
                print(f"  Read {len(instructions)} characters from file")

                if title in saved_notetypes:
                    if (
                        saved_notetypes[title].instructions != instructions
                        or saved_notetypes[title].category != category
                    ):
                        print(f"  Updating existing note type")
                        current_version = saved_notetypes[title]
                        sqid = next_sqid(database)

                        new_version = NoteDefinition(
                            id=current_version.id,
                            version=sqid,
                            username=current_version.username,
                            created=updated,
                            category=category,
                            title=current_version.title,
                            instructions=instructions,
                            model=settings.DEFAULT_NOTE_GENERATION_MODEL,
                            output_type="Markdown",
                        )

                        database.add(new_version)
                        current_version.inactivated = updated
                    else:
                        print(f"  No changes needed")
                else:
                    print(f"  Creating new note type")
                    sqid = next_sqid(database)

                    new_record = NoteDefinition(
                        id=sqid,
                        version=sqid,
                        username=settings.SYSTEM_USER,
                        created=updated,
                        category=category,
                        title=title,
                        instructions=instructions,
                        model=settings.DEFAULT_NOTE_GENERATION_MODEL,
                        output_type="Markdown",
                    )

                    database.add(new_record)

            except Exception as e:
                print(f"  Error processing {title}: {e}")
                continue

        # Inactivate any note types that no longer exist
        for nt in saved_notetypes.values():
            if nt.title not in note_titles:
                print(f"Inactivating removed note type: {nt.title}")
                nt.inactivated = updated

        try:
            database.commit()
            print("Successfully updated note types in database")
        except Exception as e:
            print(f"Error committing changes: {e}")
            database.rollback()
