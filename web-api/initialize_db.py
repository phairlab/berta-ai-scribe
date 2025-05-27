#!/usr/bin/env python3
"""
Script to initialize the SQLite database for development.
This creates all necessary tables and initializes the database with required data.
"""
import os
from app.config import db, settings

def initialize_database():
    """Initialize the SQLite database with required tables and data."""
    print("Initializing development database...")
    
    # Create data folders if they don't exist
    if not os.path.exists(settings.DATA_FOLDER):
        os.mkdir(settings.DATA_FOLDER)
    if not os.path.exists(settings.RECORDINGS_FOLDER):
        os.mkdir(settings.RECORDINGS_FOLDER)
    
    # Create database tables
    db.Base.metadata.create_all(db.engine)
    
    # Initialize with system user if needed
    with next(db.get_database_session()) as database:
        try:
            # Check if sqid_sequence table exists
            result = database.execute(db.text("SELECT name FROM sqlite_master WHERE type='table' AND name='sqid_sequence'"))
            if not result.scalar():
                database.execute(db.text("CREATE TABLE sqid_sequence (id INTEGER PRIMARY KEY);"))
                database.execute(db.text("INSERT INTO sqid_sequence (id) VALUES (42874);"))
            
            # Check if system user exists
            result = database.execute(db.text("SELECT username FROM users WHERE username = :username"), 
                                   {"username": settings.SYSTEM_USER})
            if not result.scalar():
                database.add(db.User(username=settings.SYSTEM_USER))
            
            database.commit()
            print("Database tables and initial data created successfully.")
        except Exception as e:
            print(f"Error during database initialization: {e}")
            database.rollback()
            raise
    
    print("Database initialization complete.")

if __name__ == "__main__":
    initialize_database() 