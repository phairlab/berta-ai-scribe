#!/usr/bin/env python3
"""
Script to list all note types in the database.
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import after environment variables are set
from sqlalchemy import select
from app.config import db, settings
from app.config.db import NoteDefinition


def list_note_types():
    """List all note types in the database."""
    with next(db.get_database_session()) as database:
        # Get all note types
        get_all_notetypes = (
            select(NoteDefinition)
            .where(
                NoteDefinition.username == settings.SYSTEM_USER
            )
            .order_by(NoteDefinition.title)
        )
        
        all_notetypes = database.execute(get_all_notetypes).scalars().all()
        print(f'Found {len(all_notetypes)} note types:')
        for nt in all_notetypes:
            status = 'ACTIVE' if nt.inactivated is None else 'INACTIVE'
            print(f'  - {nt.title} (ID: {nt.id}, Version: {nt.version}, Status: {status})')
        
        # Get active note types
        get_active_notetypes = (
            select(NoteDefinition)
            .where(
                NoteDefinition.inactivated.is_(None),
                NoteDefinition.username == settings.SYSTEM_USER
            )
            .order_by(NoteDefinition.title)
        )
        
        active_notetypes = database.execute(get_active_notetypes).scalars().all()
        print(f'\nFound {len(active_notetypes)} active note types:')
        for nt in active_notetypes:
            print(f'  - {nt.title} (ID: {nt.id}, Version: {nt.version})')


if __name__ == "__main__":
    list_note_types() 