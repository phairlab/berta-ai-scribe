"""
Direct RDS Connection Test

This script attempts to connect directly to the RDS instance using psycopg2
without any additional abstractions.
"""
import os
import boto3
import json
import psycopg2
from botocore.exceptions import ClientError

# Secret name and region
SECRET_NAME = "rds-db-credentials/cluster-5EQ6MFXUTZZPEDTDF6U7MZ7Z6A/mainuser/1746048966003"
REGION_NAME = "us-west-2"  # Change if your region is different

# Get credentials from environment variables or update directly here if needed
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")

def get_secret():
    """Get the secret directly from AWS Secrets Manager."""
    # Create a Secrets Manager client
    session = boto3.session.Session(
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=REGION_NAME
    )
    
    client = session.client(
        service_name='secretsmanager',
        region_name=REGION_NAME
    )
    
    try:
        response = client.get_secret_value(
            SecretId=SECRET_NAME
        )
        
        # Parse the secret string into a dictionary
        secret_data = json.loads(response['SecretString'])
        
        # Print keys (for debugging)
        print(f"Secret contains these keys: {', '.join(secret_data.keys())}")
        
        return secret_data
    
    except ClientError as e:
        print(f"Error retrieving secret: {e}")
        raise e

def test_connection():
    """Test connecting to the RDS instance."""
    try:
        # Get credentials from Secrets Manager
        print("Retrieving credentials from AWS Secrets Manager...")
        credentials = get_secret()
        
        # Extract connection parameters
        host = credentials.get('host')
        port = int(credentials.get('port', 5432))
        user = credentials.get('username')
        password = credentials.get('password')
        
        # Try both 'postgres' and the instance identifier as database names
        potential_dbnames = ['postgres']
        if 'dbInstanceIdentifier' in credentials:
            potential_dbnames.append(credentials['dbInstanceIdentifier'])
            
        # Also try 'scribe-ai-prod' based on the cluster name
        potential_dbnames.append('scribe-ai-prod')
        
        # Try each potential database name
        connection_error = None
        for dbname in potential_dbnames:
            try:
                print(f"\nAttempting to connect to database: {dbname}")
                print(f"  Host:     {host}")
                print(f"  Port:     {port}")
                print(f"  User:     {user}")
                if password:
                    masked = password[0:3] + '*' * (len(password) - 6) + password[-3:]
                    print(f"  Password: {masked}")
                
                # Connect to database
                conn = psycopg2.connect(
                    host=host,
                    port=port,
                    dbname=dbname,
                    user=user,
                    password=password,
                    # Add a short timeout for faster failure
                    connect_timeout=5
                )
                
                # If connection is successful, test it
                with conn.cursor() as cursor:
                    cursor.execute("SELECT current_database(), version();")
                    db_name, version = cursor.fetchone()
                    print("\nConnection successful!")
                    print(f"Connected to database: {db_name}")
                    print(f"PostgreSQL version: {version}")
                
                conn.close()
                print("Test completed successfully.")
                return True
                
            except Exception as e:
                print(f"Error connecting to {dbname}: {e}")
                connection_error = e
        
        # If all attempts failed, raise the last error
        if connection_error:
            print("\nAll connection attempts failed.")
            raise connection_error
            
    except Exception as e:
        print(f"\nFinal error: {e}")
        if "password authentication failed" in str(e):
            print("\nPassword authentication failed. Possible reasons:")
            print("1. The password is incorrect")
            print("2. The database user doesn't have access from your IP")
            print("3. The database security group doesn't allow external connections")
            print("4. Check if you need to connect through a VPN or SSH tunnel")
        
        return False

if __name__ == "__main__":
    test_connection() 