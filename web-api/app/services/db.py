import os
from pathlib import Path
from typing import Annotated, Any, BinaryIO, Generator, Iterator
from datetime import datetime, timezone

from fastapi import Depends
from sqlalchemy import ForeignKey, ForeignKeyConstraint, text
from sqlalchemy.orm import Session as SQLAlchemySession, DeclarativeBase, Mapped, mapped_column, relationship
from snowflake.sqlalchemy import TIMESTAMP_LTZ, VARCHAR, CHAR
from sqids import Sqids

import app.services.snowflake as snowflake
from app.config import settings

sqids = Sqids(alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890')

def get_database_session() -> Iterator[SQLAlchemySession]:
    with SQLAlchemySession(snowflake.db_engine) as database:
        yield database

useDatabase = Annotated[SQLAlchemySession, Depends(get_database_session)]

def new_sqid(database: SQLAlchemySession) -> str:
    id = database.scalars(text("SELECT sqid_sequence.nextval")).one()
    return sqids.encode([id])

def sqid_column(primary_key: bool = False):
    return mapped_column(VARCHAR(12), primary_key=primary_key)

def uuid_column(primary_key: bool = False):
    return mapped_column(CHAR(36), primary_key=primary_key)


class JenkinsDatabase(DeclarativeBase):
    pass

class SessionRecord(JenkinsDatabase):
    __tablename__ = "session_log"

    session_id: Mapped[str] = uuid_column(primary_key=True)
    username: Mapped[str] = mapped_column(VARCHAR(255))
    started: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    user_agent: Mapped[str]

class ErrorRecord(JenkinsDatabase):
    __tablename__ = "error_log"

    error_id: Mapped[str] = uuid_column(primary_key=True)
    occurred: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    name: Mapped[str] = mapped_column(VARCHAR(500))
    message: Mapped[str]
    stack_trace: Mapped[str]
    request_id: Mapped[str | None] = uuid_column()
    session_id: Mapped[str | None] = uuid_column()

class RequestRecord(JenkinsDatabase):
    __tablename__ = "request_log"

    request_id: Mapped[str] = uuid_column(primary_key=True)
    requested: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    url: Mapped[str] = mapped_column(VARCHAR(500))
    method: Mapped[str] = mapped_column(VARCHAR(10))
    status_code: Mapped[int]
    status_text: Mapped[str | None] = mapped_column(VARCHAR(50))
    duration: Mapped[int]
    session_id: Mapped[str | None] = uuid_column()

class AudioConversionTask(JenkinsDatabase):
    __tablename__ = "audio_conversion_log"

    task_id: Mapped[str] = uuid_column(primary_key=True)
    recording_id: Mapped[str] = sqid_column()
    started: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    time: Mapped[int]
    original_media_type: Mapped[str] = mapped_column(VARCHAR(255))
    original_file_size: Mapped[int]
    converted_media_type: Mapped[str | None] = mapped_column(VARCHAR(255))
    converted_file_size: Mapped[int | None]
    error_id: Mapped[str | None] = uuid_column()
    session_id: Mapped[str | None] = uuid_column()

class TranscriptionTask(JenkinsDatabase):
    __tablename__ = "transcription_log"

    task_id: Mapped[str] = uuid_column(primary_key=True)
    recording_id: Mapped[str] = sqid_column()
    started: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    time: Mapped[int]
    service: Mapped[str] = mapped_column(VARCHAR(50))
    error_id: Mapped[str | None] = uuid_column()
    session_id: Mapped[str | None] = uuid_column()

class GenerationTask(JenkinsDatabase):
    __tablename__ = "generation_log"

    task_id: Mapped[str] = uuid_column(primary_key=True)
    record_id: Mapped[str] = sqid_column()
    task_type: Mapped[str] = mapped_column(VARCHAR(255))    
    started: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    time: Mapped[int]
    service: Mapped[str] = mapped_column(VARCHAR(50))
    model: Mapped[str] = mapped_column(VARCHAR(50))
    completion_tokens: Mapped[int]
    prompt_tokens: Mapped[int]
    error_id: Mapped[str | None] = uuid_column()
    session_id: Mapped[str | None] = uuid_column()

class User(JenkinsDatabase):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(VARCHAR(255), primary_key=True)
    registered: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ, default=lambda: datetime.now(timezone.utc))
    updated: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ, default=lambda: datetime.now(timezone.utc))
    default_note: Mapped[str | None] = sqid_column()

    encounters: Mapped[list["Encounter"]] = relationship(back_populates="user")
    note_definitions: Mapped[list["NoteDefinition"]] = relationship(back_populates="user")

class UserFeedback(JenkinsDatabase):
    __tablename__ = "user_feedback"

    id: Mapped[str] = uuid_column(primary_key=True)
    username: Mapped[str] = mapped_column(ForeignKey("users.username"))
    submitted: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    details: Mapped[str]
    context: Mapped[str] = mapped_column(default="(NOT CAPTURED)")
    session_id: Mapped[str | None] = uuid_column()

class NoteDefinition(JenkinsDatabase):
    __tablename__ = "note_definitions"

    id: Mapped[str] = sqid_column(primary_key=True)
    version: Mapped[str] = sqid_column(primary_key=True)
    username: Mapped[str] = mapped_column(ForeignKey("users.username"))
    created: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    title: Mapped[str] = mapped_column(VARCHAR(100))
    instructions: Mapped[str]
    model: Mapped[str]
    inactivated: Mapped[datetime | None] = mapped_column(TIMESTAMP_LTZ)
    output_type: Mapped[str] = mapped_column(VARCHAR(50))

    user: Mapped["User"] = relationship(back_populates="note_definitions")

class Encounter(JenkinsDatabase):
    __tablename__ = "encounters"

    id: Mapped[str] = sqid_column(primary_key=True)
    username: Mapped[str] = mapped_column(ForeignKey("users.username"))
    created: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    modified: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    label: Mapped[str | None] = mapped_column(VARCHAR(100))
    summary: Mapped[str | None] = mapped_column(VARCHAR(500))
    inactivated: Mapped[datetime | None] = mapped_column(TIMESTAMP_LTZ)
    purged: Mapped[datetime | None] = mapped_column(TIMESTAMP_LTZ)

    user: Mapped["User"] = relationship(back_populates="encounters")
    recording: Mapped["Recording"] = relationship(back_populates="encounter", cascade="all, delete")
    draft_notes: Mapped[list["DraftNote"]] = relationship(back_populates="encounter")

class Recording(JenkinsDatabase):
    __tablename__ = "recordings"

    id: Mapped[str] = sqid_column(primary_key=True)
    encounter_id: Mapped[str] = mapped_column(ForeignKey("encounters.id"))
    media_type: Mapped[str | None] = mapped_column(VARCHAR(255))
    file_size: Mapped[int | None]
    duration: Mapped[int | None]
    waveform_peaks: Mapped[str | None]
    transcript: Mapped[str | None]

    encounter: Mapped["Encounter"] = relationship(back_populates="recording")

class DraftNote(JenkinsDatabase):
    __tablename__ = "draft_notes"

    id: Mapped[str] = sqid_column(primary_key=True)
    encounter_id: Mapped[str] = mapped_column(ForeignKey("encounters.id"))
    definition_id: Mapped[str] = sqid_column()
    definition_version: Mapped[str] = sqid_column()
    created: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    title: Mapped[str] = mapped_column(VARCHAR(100))
    content: Mapped[str]
    inactivated: Mapped[datetime | None] = mapped_column(TIMESTAMP_LTZ)
    output_type: Mapped[str] = mapped_column(VARCHAR(50))

    __table_args__ = (
        ForeignKeyConstraint(
            ["definition_id", "definition_version"], ["note_definitions.id", "note_definitions.version"]
        ),
    )

    encounter: Mapped["Encounter"] = relationship(back_populates="draft_notes")
    note_definition: Mapped["NoteDefinition"] = relationship()

def save_recording(file: BinaryIO, username: str, filename: str) -> None:
    """Writes a file to a user's recordings folder."""

    # Create the user's recordings directory if it does not yet exist.
    user_folder = Path(settings.RECORDINGS_FOLDER, username)
    if not os.path.isdir(user_folder):
        os.mkdir(user_folder)

    # Write the file.
    with open(Path(user_folder, filename), "wb") as recording_file:
        recording_file.write(file.read())

def stream_recording(username: str, filename: str) -> Generator[bytes, Any, None]:
    """Streams a file from the user's recordings folder."""

    user_folder = Path(settings.RECORDINGS_FOLDER, username)
    with open(Path(user_folder, filename), "rb") as recording_file:
        yield from recording_file

def delete_recording(username: str, filename: str) -> None:
    """Removes a file from the user's recordings folder."""

    user_folder = Path(settings.RECORDINGS_FOLDER, username)
    os.remove(Path(user_folder, filename))

def persist_recording(file: BinaryIO, username: str, filename: str) -> None:
    """Saves a user's recording file directly to the Snowflake stage."""

    try:
        with snowflake.start_session() as snowflakeSession:
            snowflakeSession.file.put_stream(file, f"@RECORDING_FILES/{username}/{filename}", auto_compress=False)
    finally:
        file.close()

def retrieve_recording(username: str, filename: str) -> BinaryIO:
    """Retrieves a user's recording file directly from the Snowflake stage."""

    with snowflake.start_session() as snowflakeSession:
        return snowflakeSession.file.get_stream(f"@RECORDING_FILES/{username}/{filename}")

def purge_recording(username: str, filename: str) -> None:
    """Deletes a user's recording file directly from the Snowflake stage."""

    with SQLAlchemySession(snowflake.db_engine) as session:
        session.execute(text("REMOVE :stage_path;"), { "stage_path": f"@RECORDING_FILES/{username}/{filename}" })
