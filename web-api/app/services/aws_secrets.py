import json
import boto3
from botocore.exceptions import ClientError
from app.config import settings

def get_secret(secret_name=None):
    """
    Get a secret from AWS Secrets Manager
    """
    if not secret_name:
        # Use the secret name from settings or default
        secret_name = settings.AWS_SECRET_NAME or "rds-db-credentials/cluster-5EQ6MFXUTZZPEDTDF6U7MZ7Z6A/app_admin/1746048966003"
    
    region_name = settings.AWS_REGION or "us-west-2"

    # Create a Secrets Manager client
    session = boto3.session.Session(
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=region_name
    )
    
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
        
        # Parse the secret string into a dictionary
        secret_string = get_secret_value_response['SecretString']
        return json.loads(secret_string)
        
    except ClientError as e:
        print(f"Error getting secret: {e}")
        raise e

def get_db_credentials():
    """
    Get database credentials based on environment
    Returns a dictionary with database configuration
    """
    try:
        if settings.ENVIRONMENT == "development":
            # For development, use SQLite
            return {
                'database': settings.DEV_DATABASE_FILE
            }
        else:
            # For production, use PostgreSQL/Aurora
            credentials = {
                'host': settings.AURORA_WRITER_ENDPOINT,  # Use Aurora endpoint instead of DB_HOST
                'port': settings.DB_PORT or 5432,
                'dbname': settings.DB_NAME or 'postgres',
                'username': settings.DB_USER or 'postgres',
                'password': settings.DB_PASSWORD
            }
            
            # Print masked credentials for debugging
            masked_credentials = credentials.copy()
            if masked_credentials.get('password'):
                password = masked_credentials['password']
                masked_credentials['password'] = password[0:3] + '*' * (len(password) - 6) + password[-3:]
                
            print(f"Using database credentials: {masked_credentials}")
            
            return credentials
    except Exception as e:
        print(f"Failed to get database credentials: {e}")
        return None 