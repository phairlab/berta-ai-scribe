import io
from pathlib import Path
from typing import BinaryIO, Generator, Any

import boto3
from botocore.exceptions import ClientError

from app.config import settings
from app.services.adapters import StorageProvider


class S3StorageProvider(StorageProvider):

    def __init__(self):
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
        if self.s3_client is None:
            print("Initializing S3 client for development mode")
            self.s3_client = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )

    def save_recording(self, file: BinaryIO, username: str, filename: str) -> None:
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
        s3_key = f"recordings/{username}/{filename}"
        print(f"[S3StorageProvider] Attempting to stream S3 key: {s3_key}")
        try:
            file_obj = io.BytesIO()
            self.s3_client.download_fileobj(self.bucket_name, s3_key, file_obj)
            file_obj.seek(0)  
            print(f"[S3StorageProvider] Successfully downloaded S3 key: {s3_key}, size: {file_obj.getbuffer().nbytes} bytes")
            chunk_size = 4096  
            data = file_obj.read(chunk_size)
            while data:
                yield data
                data = file_obj.read(chunk_size)
        except ClientError as e:
            print(f"[S3StorageProvider] Error streaming file from S3 key: {s3_key} - {e}")
            raise IOError(f"Error streaming file from S3: {str(e)}")

    def delete_recording(self, username: str, filename: str) -> None:
        s3_key = f"recordings/{username}/{filename}"
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
        except ClientError as e:
            raise IOError(f"Error deleting file from S3: {str(e)}")

    def get_sample_recording(self, filename: str) -> Generator[bytes, Any, None]:
        s3_key = f"sample-recordings/{filename}"
        try:
            file_obj = io.BytesIO()
            self.s3_client.download_fileobj(self.bucket_name, s3_key, file_obj)
            file_obj.seek(0)  
            
            chunk_size = 4096  
            data = file_obj.read(chunk_size)
            while data:
                yield data
                data = file_obj.read(chunk_size)
        except ClientError as e:
           
            try:
                sample_path = Path(".sample-recordings", filename)
                if sample_path.exists():
                    with open(sample_path, "rb") as f:
                        yield from f
                    return
            except Exception:
                pass 
                
            raise IOError(f"Error streaming sample recording from S3: {str(e)}")
    
    def list_sample_recordings(self) -> list[str]:
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
            
            if not sample_files:
                return self._list_local_sample_recordings()
                
            return sample_files
        except ClientError as e:
            print(f"Error listing sample recordings from S3 ({str(e)}), using local directory as fallback")
            return self._list_local_sample_recordings()
    
    def _list_local_sample_recordings(self) -> list[str]:
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
        if prompt_path.startswith('.prompts/'):
            s3_key = 'prompts/' + prompt_path[9:] 
        elif prompt_path.startswith('prompts/'):
            s3_key = prompt_path  
        else:
            s3_key = f'prompts/{prompt_path}'  
            
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            return response['Body'].read().decode('utf-8')
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                try:
                    
                    with open(prompt_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    print(f"Note: Using local file as fallback for S3: {prompt_path}")
                    return content
                except FileNotFoundError:
                    raise IOError(f"Prompt file not found in S3 or locally: {prompt_path}")
            
            raise IOError(f"Error reading prompt from S3: {str(e)}")
    
    def list_prompts(self, directory_path: str) -> list[str]:
        if directory_path.startswith('.prompts/'):
            s3_prefix = 'prompts/' + directory_path[9:]  
        elif directory_path.startswith('prompts/'):
            s3_prefix = directory_path  
        else:
            s3_prefix = f'prompts/{directory_path}'  
            
        if not s3_prefix.endswith('/'):
            s3_prefix += '/'
            
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=s3_prefix
            )
            
            prompt_files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    key = obj['Key']
                    if key.endswith('.txt'):
                        local_path = key.replace('prompts/', '.prompts/', 1)
                        prompt_files.append(local_path)
            
            if not prompt_files:
                import os
                print(f"No files found in S3 at {s3_prefix}, falling back to local directory: {directory_path}")
                return self._list_local_prompts(directory_path)
                
            return prompt_files
        except Exception as e:
            import os
            print(f"Error listing from S3 ({str(e)}), using local directory as fallback: {directory_path}")
            return self._list_local_prompts(directory_path)
            
    def _list_local_prompts(self, directory_path: str) -> list[str]:
        import os
        from pathlib import Path
        
        if not os.path.isdir(directory_path):
            print(f"Warning: Directory not found locally: {directory_path}")
            return []
        
        prompt_files = []
        for root, _, files in os.walk(directory_path):
            for file in files:
                file_path = os.path.join(root, file)
                if file.endswith('.txt'):
                    prompt_files.append(file_path)
                    
        print(f"Found {len(prompt_files)} files in local directory {directory_path}")
        return prompt_files

    def ensure_storage_exists(self) -> None:
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

s3_storage = S3StorageProvider() 