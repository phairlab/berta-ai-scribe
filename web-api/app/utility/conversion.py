import json
import math
from typing import BinaryIO

import app.config.db as db
import app.schemas as sch
from app.config import settings
from app.config.ai import generative_ai_services


def get_file_size(file: BinaryIO) -> int:
    "Returns the size of the file in bytes."
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)

    return size


def bytes_to_MB(bytes: int) -> float:
    "Converts the given number of bytes into MB."
    return bytes / 1024 / 1024


def MB_to_bytes(MB: int) -> int:
    "Converts the given number of MB into bytes."
    return MB * 1024 * 1024


def minutes_to_ms(minutes: int) -> int:
    "Converts the given number of minutes into milliseconds."
    return math.floor(minutes * 60 * 1000)


class ConvertToSchema:
    @staticmethod
    def draft_note(db_record: db.DraftNote):
        return sch.DraftNote(
            id=db_record.id,
            definitionId=db_record.definition_id,
            created=db_record.created,
            title=db_record.title,
            model=db_record.model,
            content=db_record.content,
            outputType=(
                "Markdown" if db_record.output_type == "Markdown" else "Plain Text"
            ),
            isFlagged=db_record.is_flagged,
            comments=db_record.comments,
        )

    @staticmethod
    def encounter(db_record: db.Encounter):
        return sch.Encounter(
            id=db_record.id,
            created=db_record.created,
            modified=db_record.modified,
            label=db_record.label,
            autolabel=db_record.autolabel,
            context=db_record.context,
            recording=ConvertToSchema.recording(db_record.recording),
            draftNotes=[
                ConvertToSchema.draft_note(d)
                for d in db_record.draft_notes
                if d.inactivated is None
            ],
        )

    @staticmethod
    def note_definition(db_record: db.NoteDefinition):
        # Each db record is a version of the definition,
        # so its created datetime represents a modification.
        return sch.NoteDefinition(
            id=db_record.id,
            modified=db_record.created,
            category=db_record.category,
            title=db_record.title,
            instructions=db_record.instructions,
            model=db_record.model,
            isBuiltin=db_record.username == settings.SYSTEM_USER,
            isSystemDefault=db_record.username == settings.SYSTEM_USER
            and db_record.title == settings.DEFAULT_NOTE_DEFINITION,
            outputType=(
                "Markdown" if db_record.output_type == "Markdown" else "Plain Text"
            ),
        )

    @staticmethod
    def recording(db_record: db.Recording):
        return sch.Recording(
            id=db_record.id,
            mediaType=db_record.media_type,
            fileSize=db_record.file_size,
            duration=db_record.duration,
            waveformPeaks=(
                json.loads(db_record.waveform_peaks)
                if db_record.waveform_peaks is not None
                else None
            ),
            transcript=db_record.transcript,
        )

    @staticmethod
    def user_info(db_record: db.User):
        return sch.UserInfo(
            username=db_record.username,
            updated=db_record.updated,
            defaultNoteType=db_record.default_note,
            enabledNoteTypes=(
                json.loads(db_record.enabled_notes)
                if db_record.enabled_notes is not None
                else None
            ),
            availableLlms=sch.LlmManifest(
                recommended=settings.DEFAULT_NOTE_GENERATION_MODEL,
                models=[m for s in generative_ai_services for m in s.models],
            ),
        )
