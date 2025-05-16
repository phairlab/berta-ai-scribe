#!/bin/bash

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-west-2"  # Change if you're using a different region
S3_BUCKET_NAME="jenkins-ahs-${AWS_ACCOUNT_ID}"

echo "Starting file upload to S3 bucket: $S3_BUCKET_NAME"

# Check if bucket exists, if not, we need to create the stack first
aws s3api head-bucket --bucket $S3_BUCKET_NAME 2>/dev/null
if [ $? -ne 0 ]; then
  echo "Error: S3 bucket $S3_BUCKET_NAME does not exist."
  echo "Please deploy the CloudFormation stack first to create the bucket."
  exit 1
fi

# Upload prompt files
if [ -d ".prompts" ]; then
  echo "Uploading prompt files..."
  aws s3 cp .prompts/ s3://$S3_BUCKET_NAME/prompts/ --recursive --region $AWS_REGION
  if [ $? -eq 0 ]; then
    echo "Successfully uploaded prompt files."
  else
    echo "Failed to upload prompt files."
    exit 1
  fi
else
  echo "No .prompts directory found."
fi

# Upload sample recordings
if [ -d ".sample-recordings" ]; then
  echo "Uploading sample recordings..."
  aws s3 cp .sample-recordings/ s3://$S3_BUCKET_NAME/sample-recordings/ --recursive --region $AWS_REGION
  if [ $? -eq 0 ]; then
    echo "Successfully uploaded sample recordings."
  else
    echo "Failed to upload sample recordings."
    exit 1
  fi
else
  echo "No .sample-recordings directory found."
fi

echo "File upload completed successfully."