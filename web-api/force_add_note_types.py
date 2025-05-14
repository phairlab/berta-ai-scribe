#!/usr/bin/env python3
"""
Script to directly add note types to the database one by one.
This is a last resort approach when the regular initialization fails.
"""
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
import time  # For adding delays between operations

# Load environment variables
load_dotenv()

# Set up AWS credentials
os.environ["AWS_ACCESS_KEY_ID"] = os.getenv("AWS_ACCESS_KEY_ID", "")
os.environ["AWS_SECRET_ACCESS_KEY"] = os.getenv("AWS_SECRET_ACCESS_KEY", "")
os.environ["AWS_REGION"] = os.getenv("AWS_REGION", "us-west-2")
os.environ["S3_BUCKET_NAME"] = os.getenv("S3_BUCKET_NAME", "jenkins-ahs")

# Import after environment variables are set
from sqlalchemy import select
from app.config import db, settings
from app.config.storage import storage_provider
from app.config.db import User, NoteDefinition


def ensure_system_user():
    """Ensure the SYSTEM user exists."""
    with next(db.get_database_session()) as database:
        get_user = select(User).where(User.username == settings.SYSTEM_USER)
        user = database.execute(get_user).scalar_one_or_none()
        
        if not user:
            print(f"Creating system user '{settings.SYSTEM_USER}'...")
            user = User(
                username=settings.SYSTEM_USER,
                registered=datetime.now(timezone.utc).astimezone(),
                updated=datetime.now(timezone.utc).astimezone(),
            )
            database.add(user)
            database.commit()
            print("System user created")
        else:
            print("System user already exists")


def add_note_type(title, category, instructions):
    """Add a single note type to the database."""
    created = datetime.now(timezone.utc).astimezone()
    
    with next(db.get_database_session()) as database:
        # Generate a new ID
        try:
            note_id = db.next_sqid(database)
        except Exception as e:
            print(f"Error generating ID: {e}")
            # Use timestamp-based fallback ID
            timestamp = int(time.time() * 1000) % 1000000
            note_id = db.sqids.encode([timestamp])
        
        # Create the note definition record
        note = NoteDefinition(
            id=note_id,
            version=note_id,  # Same as ID for initial version
            username=settings.SYSTEM_USER,
            created=created,
            category=category,
            title=title,
            instructions=instructions,
            model=settings.DEFAULT_NOTE_GENERATION_MODEL,
            output_type="Markdown",
        )
        
        # Add and commit explicitly
        database.add(note)
        try:
            database.commit()
            print(f"Added note type: {title} (ID: {note_id})")
            return True
        except Exception as e:
            database.rollback()
            print(f"Error adding note type {title}: {e}")
            return False


def load_instructions(file_path):
    """Load instructions from a prompt file."""
    try:
        return storage_provider.read_prompt(file_path).strip()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return None


def add_default_note_types():
    """Add essential note types to the database."""
    # Ensure the system user exists
    ensure_system_user()
    
    # Define the essential note types
    note_types = [
        {
            "title": "Full Visit",
            "category": "Common",
            "file": ".prompts/builtin-note-types/Common/Full Visit.txt"
        },
        {
            "title": "Full Visit (Narrative)",
            "category": "Common",
            "file": ".prompts/builtin-note-types/Common/Full Visit (Narrative).txt"
        },
        {
            "title": "Handover Note",
            "category": "Common",
            "file": ".prompts/builtin-note-types/Common/Handover Note.txt"
        },
        {
            "title": "Psych",
            "category": "Other",
            "file": ".prompts/builtin-note-types/Other/Psych.txt"
        },
    ]
    
    # Add each note type
    successful = 0
    for note_type in note_types:
        print(f"\nProcessing {note_type['title']}...")
        instructions = load_instructions(note_type["file"])
        if instructions:
            if add_note_type(note_type["title"], note_type["category"], instructions):
                successful += 1
            # Add a small delay between operations
            time.sleep(0.5)
    
    print(f"\nAdded {successful} of {len(note_types)} note types")


if __name__ == "__main__":
    add_default_note_types() 