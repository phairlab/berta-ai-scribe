# app/services/aurora.py
from sqlalchemy import TIMESTAMP, text
from sqlalchemy import Engine as SQLAlchemyEngine
from sqlalchemy import create_engine as create_sqlalchemy_engine
from sqlalchemy.orm import Session as SqlAlchemySession
from sqlalchemy.types import TypeEngine
import time
import logging
from urllib.parse import quote_plus

from app.config import settings
from app.services.adapters import DatabaseProvider
from app.services.aws_secrets import get_db_credentials

# Set up logging
logger = logging.getLogger(__name__)

class AuroraPostgresProvider(DatabaseProvider):
    @property
    def datetime_type(self) -> type[TypeEngine]:
        return TIMESTAMP

    @staticmethod
    def create_engine() -> SQLAlchemyEngine:
        """
        Create an SQLAlchemy engine for Aurora PostgreSQL
        
        First tries to get credentials from AWS Secrets Manager, falls back to environment variables.
        Handles connection strings carefully to avoid issues with special characters.
        """
        connection_params = {}
        connection_source = "environment variables"
        
        # First try AWS Secrets Manager
        try:
            aws_credentials = get_db_credentials()
            if aws_credentials and aws_credentials.get('host') and aws_credentials.get('username') and aws_credentials.get('password'):
                connection_params = {
                    "host": aws_credentials.get('host'),
                    "port": aws_credentials.get('port', 5432),
                    "dbname": aws_credentials.get('dbname', 'postgres'),
                    "user": aws_credentials.get('username'),
                    "password": aws_credentials.get('password')
                }
                connection_source = "AWS Secrets Manager"
                logger.info(f"Using database credentials from AWS Secrets Manager for {connection_params['host']}")
        except Exception as e:
            logger.warning(f"Could not retrieve credentials from AWS Secrets Manager: {e}")
        
        # Fall back to environment variables if needed
        if not connection_params:
            connection_params = {
                "host": settings.AURORA_WRITER_ENDPOINT,
                "port": settings.DB_PORT,
                "dbname": settings.DB_NAME or "postgres",
                "user": settings.DB_USER,
                "password": settings.DB_PASSWORD
            }
            logger.info(f"Using database credentials from environment variables for {settings.AURORA_WRITER_ENDPOINT}")
        
        # Log the connection attempt (hide password)
        safe_params = connection_params.copy()
        if safe_params.get('password'):
            password = safe_params['password']
            if len(password) > 6:
                safe_params['password'] = password[0:3] + '*' * (len(password) - 6) + password[-3:]
            else:
                safe_params['password'] = '******'
        
        logger.info(f"Creating database connection using {connection_source}:")
        logger.info(f"  Host: {safe_params.get('host')}")
        logger.info(f"  Port: {safe_params.get('port')}")
        logger.info(f"  Database: {safe_params.get('dbname')}")
        logger.info(f"  User: {safe_params.get('user')}")
        
        # Create the connection string first (for logging if needed)
        # We'll use connect_args instead for the actual connection
        connection_string = (
            f"postgresql://{connection_params['user']}:***@"
            f"{connection_params['host']}:{connection_params['port']}/"
            f"{connection_params['dbname']}"
        )
        
        try:
            # Create engine with explicit parameters to avoid URL encoding issues
            database_engine = create_sqlalchemy_engine(
                f"postgresql://",
                connect_args=connection_params,
                pool_pre_ping=True,
                pool_size=10, 
                max_overflow=20,
                pool_timeout=30,
                pool_recycle=1800,
            )
            
            # Test the connection
            with database_engine.connect() as conn:
                result = conn.execute(text("SELECT 1")).scalar_one()
                if result == 1:
                    logger.info("Successfully connected to the database")
                    
            return database_engine
            
        except Exception as e:
            logger.error(f"Error connecting to database at {connection_params['host']}: {e}")
            logger.error(f"Connection string used: {connection_string}")
            
            # If this is password authentication failure, log additional info
            if "password authentication failed" in str(e):
                logger.error("Password authentication failed. Please check:")
                logger.error("1. The password is correct")
                logger.error("2. The database user has proper access rights")
                logger.error("3. The database security group allows connections from your IP")
                logger.error("4. You may need to connect through VPN or SSH tunnel")
            
            # Re-raise the exception
            raise

    @staticmethod
    def next_guid(database: SqlAlchemySession) -> int:
        """Generate a unique ID for use in the database"""
        try:
            # First try using sqid_sequence table approach
            try:
                result = database.execute(
                    text("INSERT INTO sqid_sequence DEFAULT VALUES RETURNING id;")
                ).scalar_one()
                database.commit()
                return result
            except Exception:
                # If that fails, rollback and try using a sequence
                database.rollback()
                
                # Check if sequence exists
                seq_exists = database.execute(
                    text("SELECT EXISTS(SELECT 1 FROM pg_sequences WHERE schemaname = current_schema() AND sequencename = 'sqid_sequence')")
                ).scalar_one()
                
                if not seq_exists:
                    # Create sequence if needed
                    database.execute(text("CREATE SEQUENCE sqid_sequence START WITH 42874"))
                    database.commit()
                
                # Get next value from sequence
                result = database.execute(text("SELECT nextval('sqid_sequence')")).scalar_one()
                database.commit()
                return result
                
        except Exception as e:
            logger.error(f"Error generating GUID: {e}")
            database.rollback()
            
            # Fall back to timestamp-based ID as last resort
            timestamp_id = int(time.time() * 1000) % 1000000
            logger.warning(f"Using fallback timestamp-based ID: {timestamp_id}")
            return timestamp_id
