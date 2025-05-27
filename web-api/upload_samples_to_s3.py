#!/usr/bin/env python3
"""
Utility script to upload sample recordings to S3.
This ensures that sample recordings are available when using AWS.

Usage:
    python upload_samples_to_s3.py
"""
import os
import sys
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get AWS credentials and settings from environment variables
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-west-2")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# Check if required environment variables are set
if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
    print("Error: Required AWS environment variables are not set.")
    print("Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME.")
    sys.exit(1)

# Initialize S3 client
s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)

# Path to sample recordings
SAMPLES_DIR = Path(".sample-recordings")


def upload_sample_recordings():
    """
    Uploads all sample recordings to S3.
    """
    if not SAMPLES_DIR.exists():
        print(f"Error: Sample recordings directory '{SAMPLES_DIR}' not found.")
        sys.exit(1)
    
    # Ensure S3 bucket exists
    try:
        s3_client.head_bucket(Bucket=S3_BUCKET_NAME)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            print(f"Creating S3 bucket '{S3_BUCKET_NAME}'...")
            s3_client.create_bucket(
                Bucket=S3_BUCKET_NAME,
                CreateBucketConfiguration={"LocationConstraint": AWS_REGION},
            )
        else:
            print(f"Error accessing S3 bucket '{S3_BUCKET_NAME}': {e}")
            print("Please ensure the bucket exists and is accessible.")
            sys.exit(1)
    
    # Get list of all files in the samples directory
    sample_files = [
        f for f in SAMPLES_DIR.glob("*") 
        if f.is_file() and (f.suffix.lower() == ".mp3" or f.name == "transcripts.json")
    ]
    
    print(f"Found {len(sample_files)} sample files to upload:")
    for file in sample_files:
        print(f"  - {file.name}")
    
    # Upload each file
    files_uploaded = 0
    for file_path in sample_files:
        # Use the same path structure in S3
        s3_key = f"sample-recordings/{file_path.name}"
        
        try:
            print(f"Uploading {file_path} -> s3://{S3_BUCKET_NAME}/{s3_key}")
            s3_client.upload_file(str(file_path), S3_BUCKET_NAME, s3_key)
            files_uploaded += 1
            
            # Verify the upload
            try:
                s3_client.head_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
                print(f"✓ Verified: {s3_key}")
            except ClientError:
                print(f"⚠️ Warning: Could not verify upload of {s3_key}")
        except Exception as e:
            print(f"Error uploading {file_path}: {e}")
    
    print(f"\nUpload complete. {files_uploaded} sample files uploaded to S3.")


if __name__ == "__main__":
    print(f"Uploading sample recordings from {SAMPLES_DIR} to S3 bucket '{S3_BUCKET_NAME}'...")
    upload_sample_recordings() 