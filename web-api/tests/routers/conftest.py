import json
from datetime import datetime, timezone

import pytest

from app.config.db import (
    Base,
    DraftNote,
    Encounter,
    NoteDefinition,
    Recording,
    User,
)
from tests.conftest import TEST_SESSION, TestSessionMaker


@pytest.fixture()
def seed_data(db_session):
    """Seed the test database with a user, encounter, recording,
    note definition, and draft note. Returns a dict of the created IDs."""

    now = datetime.now(timezone.utc).astimezone()

    user = User(
        username=TEST_SESSION.username,
        registered=now,
        updated=now,
    )
    db_session.add(user)
    db_session.flush()

    note_def = NoteDefinition(
        id="NOTEDEF1",
        version="NOTEDEF1",
        username=TEST_SESSION.username,
        created=now,
        category="Common",
        title="Full Visit",
        instructions="Generate a full visit note.",
        model="llama3.1:8b",
        output_type="Markdown",
    )
    db_session.add(note_def)
    db_session.flush()

    encounter = Encounter(
        id="ENC001",
        username=TEST_SESSION.username,
        created=now,
        modified=now,
        label="Test Encounter",
        autolabel=None,
        context="Test context",
    )
    db_session.add(encounter)
    db_session.flush()

    recording = Recording(
        id="REC001",
        encounter_id="ENC001",
        media_type="audio/mpeg",
        file_size=1024,
        duration=60000,
        waveform_peaks=json.dumps([0.1, 0.5, 0.3]),
        segments=json.dumps([0]),
        transcript="This is a test transcript.",
    )
    db_session.add(recording)
    db_session.flush()

    draft_note = DraftNote(
        id="NOTE001",
        encounter_id="ENC001",
        definition_id="NOTEDEF1",
        definition_version="NOTEDEF1",
        created=now,
        title="Full Visit",
        model="llama3.1:8b",
        content="Draft note content.",
        output_type="Markdown",
    )
    db_session.add(draft_note)
    db_session.commit()

    return {
        "user": user.username,
        "encounter_id": encounter.id,
        "recording_id": recording.id,
        "note_definition_id": note_def.id,
        "draft_note_id": draft_note.id,
    }
