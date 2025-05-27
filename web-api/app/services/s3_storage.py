import io
from typing import BinaryIO, Generator, Any

import boto3
from botocore.exceptions import ClientError

from app.config import settings
from app.services.adapters import StorageProvider


class S3StorageProvider(StorageProvider):
    """Implementation of StorageProvider using AWS S3."""

    def __init__(self):
        """Initialize the S3 client."""
        if settings.ENVIRONMENT == "development":
            print("Development mode: S3 client will be initialized lazily when needed")
            self.s3_client = None
            self.bucket_name = settings.S3_BUCKET_NAME
            return

        print(f"Initializing S3 client with region: {settings.AWS_REGION}")
        print(f"Using AWS Access Key ID: {settings.AWS_ACCESS_KEY_ID}")
        print(f"Using S3 bucket: {settings.S3_BUCKET_NAME}")
        
        self.s3_client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        self.bucket_name = settings.S3_BUCKET_NAME

    def _ensure_client(self):
        """Ensure S3 client is initialized."""
        if self.s3_client is None:
            print("Initializing S3 client for development mode")
            self.s3_client = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )

    def save_recording(self, file: BinaryIO, username: str, filename: str) -> None:
        """Uploads a file to the user's recordings folder in S3."""
        if settings.ENVIRONMENT == "development":
            print("Development mode: Using local storage instead of S3")
            from app.services.local_storage import local_storage
            local_storage.save_recording(file, username, filename)
            return

        self._ensure_client()
        s3_key = f"recordings/{username}/{filename}"
        try:
            self.s3_client.upload_fileobj(file, self.bucket_name, s3_key)
        except ClientError as e:
            raise IOError(f"Error uploading file to S3: {str(e)}")

    def stream_recording(self, username: str, filename: str) -> Generator[bytes, Any, None]:
        """Streams a file from the user's recordings folder in S3."""
        s3_key = f"recordings/{username}/{filename}"
        try:
            # Download the file to a BytesIO object
            file_obj = io.BytesIO()
            self.s3_client.download_fileobj(self.bucket_name, s3_key, file_obj)
            file_obj.seek(0)  # Reset the file pointer to the beginning
            
            # Yield chunks of the file
            chunk_size = 4096  # 4KB chunks
            data = file_obj.read(chunk_size)
            while data:
                yield data
                data = file_obj.read(chunk_size)
        except ClientError as e:
            raise IOError(f"Error streaming file from S3: {str(e)}")

    def delete_recording(self, username: str, filename: str) -> None:
        """Removes a file from the user's recordings folder in S3."""
        s3_key = f"recordings/{username}/{filename}"
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
        except ClientError as e:
            raise IOError(f"Error deleting file from S3: {str(e)}")

    def get_sample_recording(self, filename: str) -> Generator[bytes, Any, None]:
        """Streams a sample recording file from S3."""
        s3_key = f"sample-recordings/{filename}"
        try:
            # Download the file to a BytesIO object
            file_obj = io.BytesIO()
            self.s3_client.download_fileobj(self.bucket_name, s3_key, file_obj)
            file_obj.seek(0)  # Reset the file pointer to the beginning
            
            # Yield chunks of the file
            chunk_size = 4096  # 4KB chunks
            data = file_obj.read(chunk_size)
            while data:
                yield data
                data = file_obj.read(chunk_size)
        except ClientError as e:
            # If the file doesn't exist in S3, try local file system as fallback
            try:
                sample_path = Path(".sample-recordings", filename)
                if sample_path.exists():
                    with open(sample_path, "rb") as f:
                        yield from f
                    return
            except Exception:
                pass  # Fallback failed, raise the original error
                
            raise IOError(f"Error streaming sample recording from S3: {str(e)}")
    
    def list_sample_recordings(self) -> list[str]:
        """Lists all sample recordings in S3."""
        s3_prefix = "sample-recordings/"
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=s3_prefix
            )
            
            sample_files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    key = obj['Key']
                    if key.endswith('.mp3'):
                        filename = key.replace(s3_prefix, '', 1)
                        sample_files.append(filename)
            
            # If no files are found in S3, fall back to local directory
            if not sample_files:
                return self._list_local_sample_recordings()
                
            return sample_files
        except ClientError as e:
            # Fall back to local directory listing if S3 operation fails
            print(f"Error listing sample recordings from S3 ({str(e)}), using local directory as fallback")
            return self._list_local_sample_recordings()
    
    def _list_local_sample_recordings(self) -> list[str]:
        """List sample recordings from the local file system as fallback."""
        import os
        from pathlib import Path
        
        sample_dir = Path(".sample-recordings")
        if not sample_dir.exists():
            return []
        
        sample_files = []
        for file in os.listdir(sample_dir):
            if file.endswith('.mp3'):
                sample_files.append(file)
        
        return sample_files

    def read_prompt(self, prompt_path: str) -> str:
        """Reads a prompt file from S3 and returns its contents as a string."""
        # Convert local path (.prompts/file.txt) to S3 key (prompts/file.txt)
        if prompt_path.startswith('.prompts/'):
            s3_key = 'prompts/' + prompt_path[9:]  # Remove the '.prompts/' prefix
        elif prompt_path.startswith('prompts/'):
            s3_key = prompt_path  # Already in correct format
        else:
            s3_key = f'prompts/{prompt_path}'  # Add prompts/ prefix if missing
            
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            return response['Body'].read().decode('utf-8')
        except ClientError as e:
            # If the file doesn't exist in S3, try to read it locally as a fallback
            if e.response['Error']['Code'] == 'NoSuchKey':
                try:
                    # Try reading from local file system
                    with open(prompt_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    # Log that we're using local file as fallback
                    print(f"Note: Using local file as fallback for S3: {prompt_path}")
                    return content
                except FileNotFoundError:
                    raise IOError(f"Prompt file not found in S3 or locally: {prompt_path}")
            
            raise IOError(f"Error reading prompt from S3: {str(e)}")
    
    def list_prompts(self, directory_path: str) -> list[str]:
        """Lists all prompt files in the specified S3 directory."""
        # Convert local path (.prompts/directory) to S3 prefix (prompts/directory)
        if directory_path.startswith('.prompts/'):
            s3_prefix = 'prompts/' + directory_path[9:]  # Remove the '.prompts/' prefix
        elif directory_path.startswith('prompts/'):
            s3_prefix = directory_path  # Already in correct format
        else:
            s3_prefix = f'prompts/{directory_path}'  # Add prompts/ prefix if missing
            
        # Ensure the prefix ends with a slash for directory-like behavior
        if not s3_prefix.endswith('/'):
            s3_prefix += '/'
            
        try:
            # Use recursive listing to get all files, including in subdirectories
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=s3_prefix
            )
            
            prompt_files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    key = obj['Key']
                    if key.endswith('.txt'):
                        # Convert S3 key back to local path format for consistency
                        local_path = key.replace('prompts/', '.prompts/', 1)
                        prompt_files.append(local_path)
            
            # If no files are found in S3, fall back to local directory
            if not prompt_files:
                import os
                print(f"No files found in S3 at {s3_prefix}, falling back to local directory: {directory_path}")
                return self._list_local_prompts(directory_path)
                
            return prompt_files
        except Exception as e:
            # Fall back to local directory listing if S3 operation fails
            import os
            print(f"Error listing from S3 ({str(e)}), using local directory as fallback: {directory_path}")
            return self._list_local_prompts(directory_path)
            
    def _list_local_prompts(self, directory_path: str) -> list[str]:
        """Helper method to list prompt files from a local directory as fallback."""
        import os
        from pathlib import Path
        
        if not os.path.isdir(directory_path):
            print(f"Warning: Directory not found locally: {directory_path}")
            return []
        
        prompt_files = []
        # Recursively walk through the directory
        for root, _, files in os.walk(directory_path):
            for file in files:
                file_path = os.path.join(root, file)
                if file.endswith('.txt'):
                    prompt_files.append(file_path)
                    
        print(f"Found {len(prompt_files)} files in local directory {directory_path}")
        return prompt_files

    def ensure_storage_exists(self) -> None:
        """Ensures that the S3 bucket exists, creating it if necessary."""
        if settings.ENVIRONMENT == "development":
            print("Development mode: Skipping S3 bucket check")
            return

        self._ensure_client()
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            print(f"Successfully connected to S3 bucket: {self.bucket_name}")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                print(f"Bucket {self.bucket_name} does not exist, attempting to create it...")
                self.s3_client.create_bucket(
                    Bucket=self.bucket_name,
                    CreateBucketConfiguration={
                        'LocationConstraint': settings.AWS_REGION
                    }
                )
            elif error_code == '403':
                print(f"Warning: Got 403 Forbidden when accessing bucket {self.bucket_name}. This might be a permissions issue.")
                print("Continuing anyway, but S3 operations might fail.")
            else:
                print(f"Error accessing S3 bucket: {str(e)}")
                raise

# Create a global instance of the S3 storage provider
s3_storage = S3StorageProvider() 