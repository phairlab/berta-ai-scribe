#!/usr/bin/env python3
"""
Script to check the database state and note types.
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import after environment variables are set
from sqlalchemy import select, text
from app.config import db, settings
from app.config.db import NoteDefinition, User

def check_database():
    """Check the database state and note types."""
    print("Checking database state...")
    
    # Check if data folder exists
    if not os.path.exists(settings.DATA_FOLDER):
        print(f"Data folder does not exist: {settings.DATA_FOLDER}")
        return
        
    # Check if database file exists
    db_path = os.path.join(settings.DATA_FOLDER, "database.db")
    if not os.path.exists(db_path):
        print(f"Database file does not exist: {db_path}")
        return
        
    with next(db.get_database_session()) as database:
        # Check if users table exists
        try:
            result = database.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
            ).scalar_one_or_none()
            print(f"Users table exists: {result is not None}")
        except Exception as e:
            print(f"Error checking users table: {e}")
            
        # Check if system user exists
        try:
            result = database.execute(
                text("SELECT username FROM users WHERE username = :username"),
                {"username": settings.SYSTEM_USER}
            ).scalar_one_or_none()
            print(f"System user exists: {result is not None}")
        except Exception as e:
            print(f"Error checking system user: {e}")
            
        # Check if note_definitions table exists
        try:
            result = database.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='note_definitions'")
            ).scalar_one_or_none()
            print(f"Note definitions table exists: {result is not None}")
        except Exception as e:
            print(f"Error checking note_definitions table: {e}")
            
        # Get all note types
        try:
            get_all_notetypes = (
                select(NoteDefinition)
                .where(
                    NoteDefinition.username == settings.SYSTEM_USER
                )
                .order_by(NoteDefinition.title)
            )
            
            all_notetypes = database.execute(get_all_notetypes).scalars().all()
            print(f"\nFound {len(all_notetypes)} note types:")
            for nt in all_notetypes:
                status = 'ACTIVE' if nt.inactivated is None else 'INACTIVE'
                print(f"  - {nt.title} (ID: {nt.id}, Version: {nt.version}, Status: {status})")
        except Exception as e:
            print(f"Error getting note types: {e}")
            
        # Get active note types
        try:
            get_active_notetypes = (
                select(NoteDefinition)
                .where(
                    NoteDefinition.inactivated.is_(None),
                    NoteDefinition.username == settings.SYSTEM_USER
                )
                .order_by(NoteDefinition.title)
            )
            
            active_notetypes = database.execute(get_active_notetypes).scalars().all()
            print(f"\nFound {len(active_notetypes)} active note types:")
            for nt in active_notetypes:
                print(f"  - {nt.title} (ID: {nt.id}, Version: {nt.version})")
        except Exception as e:
            print(f"Error getting active note types: {e}")

if __name__ == "__main__":
    check_database() 