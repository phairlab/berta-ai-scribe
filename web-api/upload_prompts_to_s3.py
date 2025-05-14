#!/usr/bin/env python3
"""
Utility script to upload the local .prompts directory contents to S3.
Run this script when migrating to AWS to ensure all prompts are available in S3.

Usage:
    python upload_prompts_to_s3.py [--verify]

Options:
    --verify    Verify S3 uploads by checking if each file exists after upload
"""
import argparse
import os
import sys
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get AWS credentials and settings from environment variables
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_REGION', 'us-west-2')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')

# Local prompts directory
PROMPTS_DIR = Path('.prompts')

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Upload local prompts to S3 for AWS deployment."
    )
    parser.add_argument(
        "--verify", 
        action="store_true", 
        help="Verify uploads by checking if files exist in S3 after upload"
    )
    return parser.parse_args()

def verify_file_in_s3(s3_client, bucket, key):
    """Check if a file exists in S3."""
    try:
        s3_client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        else:
            raise

def upload_prompts_to_s3(verify=False):
    """
    Uploads all files from the local .prompts directory to S3.
    Maintains the same directory structure in S3 but uses 'prompts/' as the prefix.
    
    Args:
        verify: If True, verify each file exists in S3 after upload
    """
    # Check if required environment variables are set
    if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
        print("Error: Required AWS environment variables are not set.")
        print("Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME.")
        sys.exit(1)
    
    # Initialize S3 client
    s3_client = boto3.client(
        's3',
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )

    if not PROMPTS_DIR.exists():
        print(f"Error: Local prompts directory '{PROMPTS_DIR}' not found.")
        sys.exit(1)
    
    # Ensure bucket exists
    try:
        s3_client.head_bucket(Bucket=S3_BUCKET_NAME)
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            print(f"Creating S3 bucket '{S3_BUCKET_NAME}'...")
            try:
                s3_client.create_bucket(
                    Bucket=S3_BUCKET_NAME,
                    CreateBucketConfiguration={
                        'LocationConstraint': AWS_REGION
                    }
                )
                print(f"Bucket '{S3_BUCKET_NAME}' created successfully.")
            except Exception as create_error:
                print(f"Error creating bucket: {create_error}")
                sys.exit(1)
        else:
            print(f"Error accessing S3 bucket '{S3_BUCKET_NAME}': {e}")
            print("Please ensure the bucket exists and is accessible.")
            sys.exit(1)
    
    # Recursively upload all files in the prompts directory
    files_uploaded = 0
    files_verified = 0
    upload_errors = []
    
    print(f"Scanning for prompt files in {PROMPTS_DIR}...")
    all_files = list(PROMPTS_DIR.glob('**/*'))
    total_files = sum(1 for f in all_files if f.is_file())
    
    print(f"Found {total_files} files to upload:")
    
    # Print a summary of directories to be uploaded
    directories = set()
    for local_path in all_files:
        if local_path.is_file():
            parent_dir = local_path.parent.relative_to(PROMPTS_DIR)
            if parent_dir != Path('.'):  # Not in the root directory
                directories.add(str(parent_dir))
    
    print(f"Directories to upload: {', '.join(sorted(directories)) or 'root directory only'}")
    
    for local_path in all_files:
        if local_path.is_file():
            # Determine S3 key (convert '.prompts/path/file.txt' to 'prompts/path/file.txt')
            relative_path = local_path.relative_to(PROMPTS_DIR)
            s3_key = f"prompts/{relative_path}"
            
            try:
                print(f"Uploading {local_path} -> s3://{S3_BUCKET_NAME}/{s3_key}")
                s3_client.upload_file(str(local_path), S3_BUCKET_NAME, s3_key)
                files_uploaded += 1
                
                # Verify upload if requested
                if verify:
                    if verify_file_in_s3(s3_client, S3_BUCKET_NAME, s3_key):
                        files_verified += 1
                        print(f"✓ Verified: {s3_key}")
                    else:
                        print(f"✗ Failed to verify: {s3_key}")
                        upload_errors.append(s3_key)
                        
            except Exception as e:
                print(f"Error uploading {local_path}: {e}")
                upload_errors.append(str(local_path))
    
    # Print summary
    print("\nUpload Summary:")
    print(f"- Total files found: {total_files}")
    print(f"- Files uploaded: {files_uploaded}")
    if verify:
        print(f"- Files verified: {files_verified}")
    
    if upload_errors:
        print(f"\nWarning: {len(upload_errors)} files had upload issues:")
        for error in upload_errors[:5]:  # Show first 5 errors
            print(f"- {error}")
        if len(upload_errors) > 5:
            print(f"... and {len(upload_errors) - 5} more")
    else:
        print("\nSuccess! All files were uploaded successfully.")


if __name__ == "__main__":
    args = parse_args()
    print(f"Uploading prompts from {PROMPTS_DIR} to S3 bucket '{S3_BUCKET_NAME}'...")
    upload_prompts_to_s3(verify=args.verify) 