import os
from pathlib import Path
from typing import Annotated, BinaryIO, Iterator
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import Depends
from sqlalchemy import ForeignKey, Sequence, text
from sqlalchemy.orm import Session as SQLAlchemySession, DeclarativeBase, MappedAsDataclass, Mapped, mapped_column, relationship
from snowflake.sqlalchemy import TIMESTAMP_LTZ, VARCHAR, CHAR, BOOLEAN
from snowflake.snowpark import Session as SnowflakeSession
from hashids import Hashids

import app.services.data as data
from app.config import settings

hashids = Hashids(min_length=8, alphabet='abcdefghijklmnopqrstuvwxyz1234567890')

def get_database_session() -> Iterator[SQLAlchemySession]:
    with SQLAlchemySession(data.db_engine) as database:
        yield database

useDatabase = Annotated[SQLAlchemySession, Depends(get_database_session)]

def get_tag(database: SQLAlchemySession) -> str:
    tag_id = database.execute(text("SELECT tag_sequence.nextval")).one()[0]
    return hashids.encode(tag_id)


def id_column(sequence: Sequence) -> Mapped[int]:
    return mapped_column(sequence, primary_key=True, init=False)

def uuid_column() -> Mapped[str]:
    return mapped_column(CHAR(36), unique=True, default_factory=lambda: str(uuid4()), init=False)

class JenkinsContext(MappedAsDataclass, DeclarativeBase):
    pass

class User(JenkinsContext):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(VARCHAR(100), primary_key=True)
    registered_at: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ, init=False, default=datetime.now(timezone.utc))
    default_note_type: Mapped[str] = mapped_column(CHAR(36), default=None)

    encounters: Mapped[list["Encounter"]] = relationship(init=False, back_populates="user", cascade="all, delete")
    note_definitions: Mapped[list["NoteDefinition"]] = relationship(init=False, back_populates="user", cascade="all, delete")

class Encounter(JenkinsContext):
    __tablename__ = "encounters"

    sequence = Sequence("encounter_sequence", order=True, metadata=JenkinsContext.metadata)

    id: Mapped[int] = id_column(sequence)
    uuid: Mapped[str] = uuid_column()
    username: Mapped[str] = mapped_column(ForeignKey("users.username"), init=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    title: Mapped[str | None] = mapped_column(VARCHAR(100), default=None)
    is_discarded: Mapped[bool] = mapped_column(BOOLEAN, init=False, default=False)

    user: Mapped["User"] = relationship(init=False, back_populates="encounters")
    recording: Mapped["Recording"] = relationship(init=False, back_populates="encounter", cascade="all, delete")
    draft_notes: Mapped[list["DraftNote"]] = relationship(init=False, back_populates="encounter", cascade="all, delete")

class Recording(JenkinsContext):
    __tablename__ = "recordings"

    sequence = Sequence("recording_sequence", order=True, metadata=JenkinsContext.metadata)

    id: Mapped[int] = id_column(sequence)
    encounter_id: Mapped[int] = mapped_column(ForeignKey("encounters.id"), init=False)
    filename: Mapped[str] = mapped_column(VARCHAR(255))
    media_type: Mapped[str] = mapped_column(VARCHAR(255))
    duration: Mapped[int]
    transcript: Mapped[str | None] = mapped_column(VARCHAR, default=None)
    transcription_service: Mapped[str | None] = mapped_column(VARCHAR(50), default=None)
    time_to_transcribe: Mapped[int | None] = mapped_column(default=None)

    encounter: Mapped["Encounter"] = relationship(init=False, back_populates="recording")

class DraftNote(JenkinsContext):
    __tablename__ = "draft_notes"

    sequence = Sequence("draft_note_sequence", order=True, metadata=JenkinsContext.metadata)

    id: Mapped[int] = id_column(sequence)
    uuid: Mapped[str] = uuid_column()
    encounter_id: Mapped[int] = mapped_column(ForeignKey("encounters.id"), init=False)
    note_definition_id: Mapped[int] = mapped_column(ForeignKey("note_definitions.id"), init=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    tag: Mapped[str] = mapped_column(VARCHAR(100))
    title: Mapped[str] = mapped_column(VARCHAR(50))
    text: Mapped[str] = mapped_column(VARCHAR)
    generation_service: Mapped[str] = mapped_column(VARCHAR(50))
    model: Mapped[str] = mapped_column(VARCHAR(50))
    time_to_generate: Mapped[str] = mapped_column()
    is_discarded: Mapped[bool] = mapped_column()

    encounter: Mapped["Encounter"] = relationship(init=False, back_populates="draft_notes")
    note_definition: Mapped["NoteDefinition"] = relationship()

class NoteDefinition(JenkinsContext):
    __tablename__ = "note_definitions"

    sequence = Sequence("note_definition_sequence", order=True, metadata=JenkinsContext.metadata)

    id: Mapped[int] = id_column(sequence)
    uuid: Mapped[str] = uuid_column()
    username: Mapped[str] = mapped_column(ForeignKey("users.username"), init=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP_LTZ)
    title: Mapped[str] = mapped_column(VARCHAR(100))
    instructions: Mapped[str] = mapped_column(VARCHAR)
    is_discarded: Mapped[bool] = mapped_column(BOOLEAN, init=False, default=False)

    user: Mapped["User"] = relationship(init=False, back_populates="note_definitions")

def save_recording(file: BinaryIO, username: str, filename: str) -> None:
    if not os.path.isdir(Path(settings.RECORDINGS_FOLDER, username)):
        os.mkdir(Path(settings.RECORDINGS_FOLDER, username))

    with open(Path(settings.RECORDINGS_FOLDER, username, filename), "wb") as recording_file:
        recording_file.write(file.read())

def stream_recording(username: str, filename: str) -> Iterator[bytes]:
    with open(Path(settings.RECORDINGS_FOLDER, username, filename), "rb") as recording_file:
        yield from recording_file

def delete_recording(username: str, filename: str) -> None:
    os.remove(Path(settings.RECORDINGS_FOLDER, username, filename))

@data.inject_snowflake_session
def persist_recording(file: BinaryIO, username: str, filename: str, *, snowflakeSession: SnowflakeSession = None) -> None:
    snowflakeSession.file.put_stream(file, f"@RECORDING_FILES/{username}/{filename}", auto_compress=False)

@data.inject_snowflake_session
def retrieve_recording(username: str, filename: str, *, snowflakeSession: SnowflakeSession = None) -> BinaryIO:
    return snowflakeSession.file.get_stream(f"@RECORDING_FILES/{username}/{filename}")

def purge_recording(username: str, filename: str) -> None:
    with SQLAlchemySession(data.db_engine) as session:
        session.execute(text("REMOVE :stage_path;"), { "stage_path": f"@RECORDING_FILES/{username}/{filename}" })

