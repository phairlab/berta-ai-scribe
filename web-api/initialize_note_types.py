#!/usr/bin/env python3
"""
Script to reinitialize all built-in note types in the database.
This ensures that all note types stored in the .prompts/builtin-note-types directory
(or the equivalent S3 location) are properly loaded into the database.

Usage:
    python initialize_note_types.py [--repair]

Options:
    --repair    Repair database state by removing all existing note types before reinitializing
"""
import argparse
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up AWS credentials
os.environ["AWS_ACCESS_KEY_ID"] = os.getenv("AWS_ACCESS_KEY_ID", "")
os.environ["AWS_SECRET_ACCESS_KEY"] = os.getenv("AWS_SECRET_ACCESS_KEY", "")
os.environ["AWS_REGION"] = os.getenv("AWS_REGION", "us-west-2")
os.environ["S3_BUCKET_NAME"] = os.getenv("S3_BUCKET_NAME", "jenkins-ahs")

# Import after environment variables are set
from sqlalchemy import delete, select
from app.config import db, settings
from app.config.storage import USE_S3_STORAGE
from app.config.db import User, NoteDefinition


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Initialize built-in note types in the database."
    )
    parser.add_argument(
        "--repair", 
        action="store_true", 
        help="Repair database state by removing all existing note types before reinitializing"
    )
    return parser.parse_args()


def ensure_system_user_exists():
    """Ensure the SYSTEM/BUILTIN user exists in the database."""
    print(f"Ensuring system user '{settings.SYSTEM_USER}' exists...")
    with next(db.get_database_session()) as database:
        # Check if SYSTEM_USER exists
        try:
            get_system_user = select(User).where(User.username == settings.SYSTEM_USER)
            system_user = database.execute(get_system_user).scalar_one_or_none()
            
            if system_user is None:
                print(f"Creating system user '{settings.SYSTEM_USER}'...")
                # Create the system user
                system_user = User(
                    username=settings.SYSTEM_USER,
                    registered=datetime.now(timezone.utc).astimezone(),
                    updated=datetime.now(timezone.utc).astimezone(),
                )
                database.add(system_user)
                database.commit()
                print(f"System user created successfully")
            else:
                print(f"System user already exists")
                
            return True
        except Exception as e:
            print(f"Error ensuring system user exists: {e}")
            return False


def repair_database():
    """Remove all existing built-in note types to ensure a clean state."""
    print("Repairing database by removing all existing built-in note types...")
    try:
        with next(db.get_database_session()) as database:
            # Delete all note definitions by the system user
            stmt = delete(NoteDefinition).where(
                NoteDefinition.username == settings.SYSTEM_USER
            )
            result = database.execute(stmt)
            database.commit()
            print(f"Removed {result.rowcount} built-in note definitions from the database")
            return True
    except Exception as e:
        print(f"Error repairing database: {e}")
        return False


def initialize_note_types(repair=False):
    """Reinitialize all built-in note types in the database."""
    print(f"Storage location: {'S3' if USE_S3_STORAGE else 'Local'}")
    print(f"Built-in note types folder: {settings.BUILTIN_NOTETYPES_FOLDER}")
    
    # First ensure system user exists
    if not ensure_system_user_exists():
        print("Cannot continue without system user")
        return
    
    # Repair database if requested
    if repair:
        if not repair_database():
            print("Cannot continue with database repair")
            return
    
    print("Starting initialization of built-in note types...")
    db.update_builtin_notetypes()
    print("Initialization complete.")
    
    # Print currently active note types
    print("\nCurrently active built-in note types:")
    try:
        with next(db.get_database_session()) as database:
            get_active_notetypes = (
                select(NoteDefinition)
                .where(
                    NoteDefinition.inactivated.is_(None),
                    NoteDefinition.username == settings.SYSTEM_USER,
                )
                .order_by(NoteDefinition.title)
            )
            
            active_notetypes = database.execute(get_active_notetypes).scalars().all()
            for nt in active_notetypes:
                print(f"  - {nt.title} (ID: {nt.id}, Version: {nt.version})")
    except Exception as e:
        print(f"Error listing active note types: {e}")


if __name__ == "__main__":
    args = parse_args()
    initialize_note_types(repair=args.repair) 