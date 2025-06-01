# OS Jenkins AI Scribe v0.9.0-beta

OS Jenkins AI Scribe is an advanced medical documentation assistant designed to help healthcare providers efficiently create clinical notes from audio recordings of patient encounters. The system uses state-of-the-art AI transcription services and language models to transform medical conversations into well-structured clinical documentation.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technical Components](#technical-components)
  - [Transcription Services](#transcription-services)
  - [Language Model Services](#language-model-services)
- [Storage Configuration](#storage-configuration)
- [Database Configuration](#database-configuration)
- [Local Development Setup](#local-development-setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Verification](#verification)
- [AWS Deployment](#aws-deployment)
  - [AWS Prerequisites](#aws-prerequisites)
  - [Infrastructure Overview](#infrastructure-overview)
  - [Deployment Steps](#deployment-steps)
  - [Post-Deployment Setup](#post-deployment-setup)
  - [Environment Variables Automatically Configured](#environment-variables-automatically-configured)
  - [Customization Options](#customization-options)
  - [Cost Considerations](#cost-considerations)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
  - [Logs and Diagnostics](#logs-and-diagnostics)
- [Contributors](#contributors)
- [License](#license)

## Overview

OS Jenkins AI Scribe aims to reduce the documentation burden on healthcare providers by:
- Automatically transcribing patient encounters
- Generating structured clinical notes based on transcriptions
- Supporting various note templates for different clinical scenarios
- Providing a user-friendly interface for review and editing

## Features

- **Audio Recording & Transcription**: Record patient encounters or upload existing audio files
- **AI-Powered Note Generation**: Generate comprehensive clinical notes from transcripts
- **Multiple Note Templates**: Support for various note formats (Full Visit, Narrative, Handover Notes, etc.)
- **Custom Note Types**: Create and save your own note templates
- **Multi-Environment Support**: Runs on AWS or local development environments
- **Secure Authentication**: Google OAuth or AWS Cognito context-based authentication

## Architecture

The project consists of two main components:

1. **Backend (web-api)**: A FastAPI-based service that handles:
   - Authentication
   - Audio processing and transcription
   - Note generation via LLMs
   - Database operations
   - File storage

2. **Frontend (ai-scribe-app)**: A Next.js-based web application that provides:
   - User interface for recording or uploading audio
   - Note type selection and configuration
   - Review and editing of generated notes
   - User authentication flows

### Basic Architecture

The system follows a modern web application architecture with several layers:

![Jenkins Architecture 002](https://github.com/user-attachments/assets/e4c96a82-1d2b-41e7-81ca-051c8de7a803)


- **Web Browser**: The client interface accessed by users
- **Next.js Frontend**: Server-side rendered React application
- **Load Balancer**: Distributes traffic across backend instances
- **Python FastAPI Backend**: Handles API requests and business logic
- **Virtualization Layer**: Contains:
  - **vLLM Inference Engine**: For AI model inference
  - **Speech-to-text (ASR)**: For audio transcription
- **Hardware Layer**: GPU Cluster for high-performance computing
- **Virtual Private Cloud**: Secure network environment

## Technical Components

### Transcription Services

OS Jenkins Scribe supports three transcription services:

1. **AWS Transcribe**: High-accuracy transcription service from AWS with medical terminology support
2. **OpenAI Whisper**: State-of-the-art speech recognition model with high accuracy and multilingual support
3. **WhisperX**: Enhanced version of Whisper optimized for medical terminology and faster processing

The transcription service is configurable via the `TRANSCRIPTION_SERVICE` environment variable.

### Language Model Services

The application can work with multiple language model providers:

1. **OpenAI Models**: Integration with GPT models via OpenAI API
2. **Azure Cognitive Services**: Microsoft's AI services for text processing
3. **AWS Bedrock**: Access to foundation models via AWS Bedrock including Llama 3 and Claude 3
4. **Cortex Models**: Integration with specialized models for medical text generation

The system will automatically use the best available model based on your configuration. For the local deployment we will be using gpt-4o via OpenAI API and for the AWS deployment we will be using Llama3.3 70b.

## Storage Configuration

OS Jenkins Scribe supports two storage options:

1. **Local Storage** (Development):
   - Files stored in `.data/recordings`
   - Automatically configured for local development

2. **S3 Storage** (AWS Production):
   - Files stored in configured S3 bucket
   - Requires AWS credentials and bucket configuration

The storage provider is automatically selected based on environment variables.

## Database Configuration

The application supports three database options:

1. **SQLite** (Development):
   - Automatically configured for local development
   - Database file stored in `.data/database.db`

2. **Aurora PostgreSQL** (AWS Production):
   - Configure using `USE_AURORA=true`
   - Requires Aurora writer endpoint and credentials

## Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- FFmpeg (for audio processing)
- Docker (optional, for container-based deployment)
- AWS Account (optional, for AWS-based services)

### Backend Setup

1. Create a `.env` file in the root of the web-api directory:

```env
# Core Settings
ENVIRONMENT=development
COOKIE_SECURE=false
LOGGING_LEVEL=DEBUG

# JWT Configuration
ACCESS_TOKEN_SECRET=your_secure_random_string
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Authentication Configuration
USE_COGNITO=false
USE_GOOGLE_AUTH=true  # If using Google auth

# Google OAuth Configuration (if using Google auth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/login

# LLM Configuration
DEFAULT_NOTE_GENERATION_MODEL=gpt-4o
LABEL_MODEL=gpt-4o

# OpenAI API Key (required for GPT models)
OPENAI_API_KEY=your_openai_api_key

# Database Configuration
USE_AURORA=false
# SQLite database will be used automatically in development mode

# Transcription Service - Choose one
TRANSCRIPTION_SERVICE=OpenAI Whisper
# TRANSCRIPTION_SERVICE=WhisperX
# TRANSCRIPTION_SERVICE=AWS Transcribe
```

2. Start the backend server:
```bash
cd web-api
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. Create a `.env.local` file in the root of the ai-scribe-app directory:

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Authentication Configuration
NEXT_PUBLIC_USE_COGNITO=false
NEXT_PUBLIC_USE_GOOGLE_AUTH=true  # If using Google auth

# Google OAuth Configuration (if using Google auth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_REDIRECT_URI=http://localhost:4000/login
```

2. Generate runtime configuration:
```bash
node write-runtime-config.js
```

3. Start the frontend development server:
```bash
cd ai-scribe-app
npm run dev
```

### Verification

To verify your configuration is working:

1. Navigate to `http://localhost:4000` (or whatever port your frontend is using)
2. Click the login button
3. You should be redirected to the authentication page (Google or dev auth)
4. After successful authentication, you should be redirected back to the application

If you encounter any issues, check the console logs for both the frontend and backend services for error messages.

## AWS Deployment

## Architecture
![AWS Architecture](https://github.com/user-attachments/assets/2dd32f5a-d89a-4119-8cc0-baaa9f5a8190)

### One-click Deployment
| Service | Button |
|---------|--------|
| AWS | [![AWS CloudFormation Launch Stack SVG Button](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?stackName=os-jenkins-ai-scribe&templateURL=https://cf-templates-14rwubwevbsfc-us-west-2.s3.us-west-2.amazonaws.com/2025-06-01T072716.376Zklu-template.yaml) |

### AWS Prerequisites

Before you begin the deployment, ensure you have:

- AWS Account with administrative access
- AWS CLI installed and configured
- Domain name registered in Route53 (optional, for custom domain)
- Docker installed for building container images

### Infrastructure Overview

The CloudFormation template creates a complete AWS infrastructure including:

- S3 bucket for storing recordings and prompt files
- Amazon Cognito for user authentication
- Aurora PostgreSQL database for data storage
- ECS Fargate clusters for running containerized applications
- Application Load Balancers (ALB) for both frontend and backend
- ACM certificates for HTTPS/TLS
- Route53 DNS configuration (if using a custom domain)
- Security groups and IAM roles

### Deployment Steps

#### 1. Prepare Your Domain and DNS (Optional)

1. Ensure your domain is registered and managed by Route53
2. Note your Route53 Hosted Zone ID (found in the Route53 console under "Hosted Zones")

#### 2. Set Up Your VPC and Subnets

You need an existing VPC with both public and private subnets:

1. Navigate to the VPC console in AWS
2. Note your VPC ID
3. Identify at least 2 public subnets (for the load balancers)
4. Identify at least 2 private subnets (for the Fargate tasks)

#### 3. Click the "Deploy to AWS" button below to launch the CloudFormation stack creation wizard: [Deploy to AWS](https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?stackName=os-jenkins-ai-scribe&templateURL=https://cf-templates-14rwubwevbsfc-us-west-2.s3.us-west-2.amazonaws.com/2025-06-01T072716.376Zklu-template.yaml) 

#### 4. Enter the following required parameters:

   | Parameter | Description | Example |
   |-----------|-------------|---------|
   | **EnvironmentName** | Name for your environment | `Production` |
   | **DatabaseUsername** | Username for the Aurora database | `admin` |
   | **DatabasePassword** | Password for the Aurora database | `(Create a secure password)` |
   | **CognitoEmailDomain** | Email domain to use for admin accounts | `yourdomain.com` |
   | **AdminEmailAddress** | Email address for the admin user | `admin@yourdomain.com` |

#### 5. Click "Next" to proceed to the stack options page
#### 6. (Optional) Add any tags or configure advanced options
#### 7. Click "Next" to review your configuration
#### 8. Check the acknowledgment box for IAM resource creation
#### 9. Click "Create stack"

The deployment will take approximately 15-20 minutes.

### Post-Deployment Setup

After the stack is created:

1. Check your email for a temporary password from AWS Cognito
2. Navigate to the FrontendURL provided in the stack outputs
3. Log in with your admin email address and the temporary password
4. You'll be prompted to create a new password on first login
5. The application is now ready to use!

## Environment Variables Automatically Configured

The CloudFormation template automatically configures all necessary environment variables for both the frontend and backend, including:

- Authentication settings
- Database connection details
- Storage configuration
- Service endpoints

No manual environment configuration is required.

## Customization Options

Advanced users can customize the deployment by:

1. Downloading the CloudFormation template
2. Modifying parameters or resources as needed
3. Deploying the modified template through the AWS Console or CLI

## Cost Considerations

This deployment creates several AWS resources that will incur charges:

- Aurora PostgreSQL database (db.t4g.medium instance)
- ECS Fargate containers
- Application Load Balancers
- S3 storage
- Amazon Cognito user pool

Estimated monthly cost: $150-$300 USD depending on usage patterns.

To minimize costs:
- Consider using a smaller database instance for non-production environments
- Delete the stack when not in use for extended periods

## Troubleshooting

If you encounter issues during deployment:

1. Check the CloudFormation events tab for specific error messages
2. Verify your AWS account has sufficient permissions to create all resources
3. Ensure you've entered valid parameter values
4. Check that your AWS account limits can accommodate the resources being created

For application-specific issues after deployment, refer to CloudWatch logs for the ECS tasks.



## Security

OS Jenkins Scribe implements robust security measures:

- Secure authentication through Cognito or Google OAuth
- HTTPS for all external communication
- JWT tokens for API security
- Secure cookie handling
- Database encryption at rest
- S3 bucket encryption and private access
- Proper IAM roles and security groups in AWS

## Contributors

* [Mike Weldon MD MSc](https://github.com/majweldon)
* [Ross Mitchell PhD](https://sites.google.com/view/j-ross-mitchell/)
* [Jesse Dunn](https://github.com/dataxuf)
* [Samridhi Vaid MSc](https://github.com/SamridhiVaid)
* [Jake Hayward MD MPH](https://www.linkedin.com/in/jake-hayward-b37846128/?originalSubdomain=ca)
* [Kevin Lonergan](https://github.com/lonergan123)
* [Henry Li](https://github.com/lih34525)
* [Jeffrey Franc](https://apps.ualberta.ca/directory/person/jfranc)

## License

[Apache License](/LICENSE)

### Third-Party Licenses

   This project uses third-party libraries and models, including:
   
   - **WhisperX**: Licensed under the BSD 2-Clause License.
   - **Meta Llama 3.3**: Licensed under the Meta Llama 3.3 Community License Agreement.
   
   For the full text of these licenses, please see the [THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES) file in this repository.
   
   ### Llama 3.3 License Notice
   
   This project uses Meta Llama 3.3 As per the Llama 3.3 license requirements:
   
   - This project is "Built with Meta Llama 3.3".
   - Any AI models created, trained, or fine-tuned using Llama 3.3 as part of this project will include "Llama 3.3" at the beginning of the model name.
   - Use of Llama 3.3 in this project complies with the [Meta Llama 3.3 Acceptable Use Policy](https://www.llama.com/llama3_3/use-policy/).
   
   For the complete Meta Llama 3.3 Community License Agreement, refer to the [THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES) file.

## Medical Disclaimer

> [!IMPORTANT]
> The Licensed Work is provided as a support tool only and is not intended as a substitute for the guidance or care of a health professional.

> [!CAUTION]
> The authors disclaim all warranties, expressed or implied. In particular, but without limitation, the Licensed Work is provided WITHOUT WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE, EITHER EXPRESSED OR IMPLIED. The user assumes all responsibility for losses, costs, claims, damages or liability of any kind whatsoever which may arise from use of the Licensed Work.
