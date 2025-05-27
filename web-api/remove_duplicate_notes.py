#!/usr/bin/env python3
"""
Script to remove duplicate note types from the database.
"""
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from collections import defaultdict

# Load environment variables
load_dotenv()

# Import after environment variables are set
from sqlalchemy import select, update
from app.config import db, settings
from app.config.db import NoteDefinition


def remove_duplicate_note_types():
    """Find and remove duplicate note types, keeping the newest version."""
    with next(db.get_database_session()) as database:
        # Get all note types
        get_all_notetypes = (
            select(NoteDefinition)
            .where(
                NoteDefinition.username == settings.SYSTEM_USER,
                NoteDefinition.inactivated.is_(None)  # Only active notes
            )
            .order_by(NoteDefinition.title, NoteDefinition.created.desc())
        )
        
        all_notetypes = database.execute(get_all_notetypes).scalars().all()
        
        # Group by title
        title_groups = defaultdict(list)
        for note in all_notetypes:
            title_groups[note.title].append(note)
        
        # Find duplicates
        duplicate_count = 0
        for title, notes in title_groups.items():
            if len(notes) > 1:
                print(f"Found {len(notes)} duplicates for '{title}':")
                # Keep the newest one, mark others as inactive
                for i, note in enumerate(notes):
                    if i == 0:
                        print(f"  - Keeping: {note.id} (created {note.created})")
                    else:
                        print(f"  - Inactivating: {note.id} (created {note.created})")
                        note.inactivated = datetime.now(timezone.utc).astimezone()
                        duplicate_count += 1
        
        # Commit changes
        if duplicate_count > 0:
            database.commit()
            print(f"\nInactivated {duplicate_count} duplicate note types")
        else:
            print("No duplicates found")


if __name__ == "__main__":
    remove_duplicate_note_types() 