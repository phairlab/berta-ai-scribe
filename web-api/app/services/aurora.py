# app/services/aurora.py
from sqlalchemy import TIMESTAMP, text
from sqlalchemy import Engine as SQLAlchemyEngine
from sqlalchemy import create_engine as create_sqlalchemy_engine
from sqlalchemy.orm import Session as SqlAlchemySession
from sqlalchemy.types import TypeEngine
import time
import logging
from datetime import datetime, timezone

from app.config import settings
from app.services.adapters import DatabaseProvider

logger = logging.getLogger(__name__)

class AuroraPostgresProvider(DatabaseProvider):
    @property
    def datetime_type(self) -> type[TypeEngine]:
        return TIMESTAMP

    @staticmethod
    def create_engine() -> SQLAlchemyEngine:
        connection_params = {
            "host": settings.AURORA_WRITER_ENDPOINT,
            "port": settings.DB_PORT,
            "dbname": settings.DB_NAME or "postgres",
            "user": settings.DB_USER,
            "password": settings.DB_PASSWORD,
            "connect_timeout": 10,
            "options": "-c statement_timeout=300000"  # 5 minute query timeout
        }
        
        # Log the connection attempt (hide password)
        safe_params = connection_params.copy()
        if safe_params.get('password'):
            password = safe_params['password']
            if len(password) > 6:
                safe_params['password'] = password[0:3] + '*' * (len(password) - 6) + password[-3:]
            else:
                safe_params['password'] = '******'
        
        logger.info(f"Creating database connection to Aurora PostgreSQL with connection pooling:")
        logger.info(f"  Host: {safe_params.get('host')}")
        logger.info(f"  Port: {safe_params.get('port')}")
        logger.info(f"  Database: {safe_params.get('dbname')}")
        logger.info(f"  User: {safe_params.get('user')}")
        logger.info(f"  Pool size: 20 connections (+ 10 overflow)")
        
        try:
            database_engine = create_sqlalchemy_engine(
                f"postgresql://",
                connect_args=connection_params,
                
                # Connection pool configuration optimized for production
                pool_size=20,           # Base number of connections to maintain
                max_overflow=10,        # Additional connections when pool is exhausted
                pool_timeout=30,        # Seconds to wait for available connection
                pool_recycle=3600,      # Recycle connections after 1 hour (AWS Aurora timeout)
                pool_pre_ping=True,     # Test connections before using them
                
                # Additional performance optimizations
                echo_pool=False,        # Set to True only for debugging connection pool
            )
            
            
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    with database_engine.connect() as conn:
                        result = conn.execute(text("SELECT 1")).scalar_one()
                        if result == 1:
                            logger.info("Successfully connected to Aurora PostgreSQL")
                            
                            # Log connection pool status
                            pool = database_engine.pool
                            logger.info(f"Connection pool status - Size: {pool.size()}, "
                                      f"Checked out: {pool.checked_out_connections()}, "
                                      f"Overflow: {pool.overflow()}, "
                                      f"Total: {pool.size() + pool.overflow()}")
                            
                            AuroraPostgresProvider._ensure_database_initialized(database_engine)
                            
                            return database_engine
                except Exception as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"Connection attempt {attempt + 1} failed, retrying: {e}")
                        time.sleep(2 ** attempt)  
                    else:
                        raise
                        
        except Exception as e:
            logger.error(f"Error connecting to Aurora database at {connection_params['host']}: {e}")
            
            if "password authentication failed" in str(e):
                logger.error("Password authentication failed. Please check:")
                logger.error("1. The password is correct")
                logger.error("2. The database user has proper access rights")
                logger.error("3. The database security group allows connections")
                logger.error("4. The database cluster is available and not in maintenance")
            
            raise

    @staticmethod
    def _ensure_database_initialized(engine: SQLAlchemyEngine):
        logger.info("Checking database initialization...")
        
        try:
            with engine.connect() as conn:
                users_exists = conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'users'
                    )
                """)).scalar_one()
                
                if not users_exists:
                    logger.info("Database tables not found - initializing...")
                    AuroraPostgresProvider._create_all_tables(conn)
                    AuroraPostgresProvider._initialize_system_data(conn)
                    conn.commit()
                    logger.info("Database initialization complete")
                else:
                    system_user_exists = conn.execute(text("""
                        SELECT EXISTS (
                            SELECT 1 FROM users WHERE username = :username
                        )
                    """), {"username": settings.SYSTEM_USER}).scalar_one()
                    
                    if not system_user_exists:
                        logger.info("System user missing - creating...")
                        AuroraPostgresProvider._initialize_system_data(conn)
                        conn.commit()
                        logger.info("System user created")
                    
                    seq_count = conn.execute(text("SELECT COUNT(*) FROM sqid_sequence")).scalar_one()
                    if seq_count == 0:
                        logger.info("Initializing sqid_sequence...")
                        conn.execute(text("INSERT INTO sqid_sequence DEFAULT VALUES"))
                        conn.commit()
                        
                    logger.info("Database initialization check complete")
                    
        except Exception as e:
            logger.error(f"Error during database initialization: {e}")
            raise

    @staticmethod
    def _create_all_tables(conn):
        logger.info("Creating database tables...")
        
        # Users table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                username VARCHAR(255) PRIMARY KEY,
                registered TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                default_note VARCHAR(12),
                enabled_notes TEXT
            )
        """))
        
        # SQID sequence table for ID generation
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sqid_sequence (
                id SERIAL PRIMARY KEY
            )
        """))
        
        # Note definitions table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS note_definitions (
                id VARCHAR(12) NOT NULL,
                version VARCHAR(12) NOT NULL,
                username VARCHAR(255) NOT NULL REFERENCES users(username),
                created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                inactivated TIMESTAMP WITH TIME ZONE NULL,
                category VARCHAR(50),
                title VARCHAR(100) NOT NULL,
                instructions TEXT NOT NULL,
                model VARCHAR(50),
                output_type VARCHAR(50) DEFAULT 'Markdown',
                PRIMARY KEY (id, version)
            )
        """))
        
        # Encounters table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS encounters (
                id VARCHAR(12) PRIMARY KEY,
                username VARCHAR(255) NOT NULL REFERENCES users(username),
                created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                label VARCHAR(100),
                autolabel VARCHAR(100),
                context TEXT,
                inactivated TIMESTAMP WITH TIME ZONE NULL,
                purged TIMESTAMP WITH TIME ZONE NULL
            )
        """))
        
        # Recordings table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS recordings (
                id VARCHAR(12) PRIMARY KEY,
                encounter_id VARCHAR(12) NOT NULL REFERENCES encounters(id),
                media_type VARCHAR(255),
                file_size INTEGER,
                duration INTEGER NOT NULL,
                waveform_peaks TEXT,
                segments TEXT,
                transcript TEXT
            )
        """))
        
        # Draft notes table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS draft_notes (
                id VARCHAR(12) PRIMARY KEY,
                encounter_id VARCHAR(12) NOT NULL REFERENCES encounters(id),
                definition_id VARCHAR(12) NOT NULL,
                definition_version VARCHAR(12) NOT NULL,
                created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                title VARCHAR(100) NOT NULL,
                model VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                inactivated TIMESTAMP WITH TIME ZONE NULL,
                output_type VARCHAR(50) NOT NULL,
                is_flagged BOOLEAN DEFAULT FALSE,
                comments VARCHAR(500),
                FOREIGN KEY (definition_id, definition_version) REFERENCES note_definitions(id, version)
            )
        """))
        
        # Log tables
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS session_log (
                session_id CHAR(36) PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                started TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                user_agent TEXT NOT NULL
            )
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS error_log (
                error_id CHAR(36) PRIMARY KEY,
                occurred TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                name VARCHAR(500) NOT NULL,
                message TEXT NOT NULL,
                stack_trace TEXT NOT NULL,
                request_id CHAR(36),
                session_id CHAR(36)
            )
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS request_log (
                request_id CHAR(36) PRIMARY KEY,
                requested TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                url VARCHAR(500) NOT NULL,
                method VARCHAR(10) NOT NULL,
                status_code INTEGER NOT NULL,
                status_text VARCHAR(50),
                duration INTEGER NOT NULL,
                session_id CHAR(36)
            )
        """))
        
        # Additional log tables
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS audio_conversion_log (
                task_id CHAR(36) PRIMARY KEY,
                task_type VARCHAR(50) NOT NULL,
                recording_id VARCHAR(12) NOT NULL,
                started TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                time INTEGER NOT NULL,
                original_media_type VARCHAR(255) NOT NULL,
                original_file_size INTEGER NOT NULL,
                converted_media_type VARCHAR(255),
                converted_file_size INTEGER,
                error_id CHAR(36),
                session_id CHAR(36)
            )
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS transcription_log (
                task_id CHAR(36) PRIMARY KEY,
                recording_id VARCHAR(12) NOT NULL,
                started TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                time INTEGER NOT NULL,
                service VARCHAR(50) NOT NULL,
                error_id CHAR(36),
                session_id CHAR(36)
            )
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS generation_log (
                task_id CHAR(36) PRIMARY KEY,
                record_id VARCHAR(12) NOT NULL,
                task_type VARCHAR(255) NOT NULL,
                started TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                time INTEGER NOT NULL,
                service VARCHAR(50) NOT NULL,
                model VARCHAR(50) NOT NULL,
                completion_tokens INTEGER NOT NULL,
                prompt_tokens INTEGER NOT NULL,
                error_id CHAR(36),
                session_id CHAR(36)
            )
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_feedback (
                id CHAR(36) PRIMARY KEY,
                username VARCHAR(255) NOT NULL REFERENCES users(username),
                submitted TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                details TEXT NOT NULL,
                context TEXT DEFAULT '(NOT CAPTURED)',
                session_id CHAR(36)
            )
        """))
        
        conn.execute(text("""
            CREATE SEQUENCE IF NOT EXISTS data_change_ids START WITH 1
        """))
        
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS data_changes (
                id INTEGER PRIMARY KEY DEFAULT nextval('data_change_ids'),
                logged TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                changed TIMESTAMP WITH TIME ZONE NOT NULL,
                username VARCHAR(255) NOT NULL,
                session_id CHAR(36) NOT NULL,
                entity_type VARCHAR(255) NOT NULL,
                entity_id VARCHAR(12),
                change_type VARCHAR(50) NOT NULL,
                server_task BOOLEAN DEFAULT FALSE
            )
        """))
        
        logger.info("All database tables created successfully")

    @staticmethod
    def _initialize_system_data(conn):
        logger.info("Initializing system data...")
        
       
        conn.execute(text("""
            INSERT INTO users (username, registered, updated) 
            VALUES (:username, :timestamp, :timestamp) 
            ON CONFLICT (username) DO NOTHING
        """), {
            "username": settings.SYSTEM_USER,
            "timestamp": datetime.now(timezone.utc)
        })
        
        logger.info(f"System user '{settings.SYSTEM_USER}' created/verified")

    @staticmethod
    def next_guid(database: SqlAlchemySession) -> int:
        try:
            result = database.execute(
                text("INSERT INTO sqid_sequence DEFAULT VALUES RETURNING id;")
            ).scalar_one()
            database.commit()
            return result
                
        except Exception as e:
            logger.error(f"Error generating GUID: {e}")
            database.rollback()
            
            timestamp_id = int(time.time() * 1000) % 1000000
            logger.warning(f"Using fallback timestamp-based ID: {timestamp_id}")
            return timestamp_id