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
  - [Local Development Options](#local-development-options)
  - [Option 1: Basic Local Setup (Recommended)](#option-1-basic-local-setup-recommended)
  - [Option 2: OpenAI Setup](#option-2-openai-setup)
  - [Option 3: Local GPU Setup (VLLM)](#option-3-local-gpu-setup-vllm)
  - [Start the Backend](#start-the-backend)
  - [Frontend Setup](#frontend-setup)
  - [Verification](#verification)
- [AWS Deployment](#aws-deployment)
  - [Step 1: AWS Account Setup](#step-1-aws-account-setup)
  - [Step 2: Domain Setup](#step-2-domain-setup)
  - [Step 3: Create VPC Infrastructure (AWS Console)](#step-3-create-vpc-infrastructure-aws-console)
  - [Step 4: Deploy the Application](#step-4-deploy-the-application)
  - [Step 5: Post-Deployment Configuration](#step-5-post-deployment-configuration)
- [Available Services Reference](#available-services-reference)
- [Security](#security)
- [Contributors](#contributors)
- [License](#license)
  - [Third-Party Licenses](#third-party-licenses)
  - [Llama 3.3 License Notice](#llama-33-license-notice)
  - [Attribution Notices](#attribution-notices)
- [Medical Disclaimer](#medical-disclaimer)

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

OS Jenkins Scribe supports four transcription services:

1. **Parakeet MLX** (Default): Local, fast transcription using Apple's MLX framework
2. **OpenAI Whisper**: State-of-the-art speech recognition via OpenAI API
3. **WhisperX**: Enhanced local Whisper with better accuracy and speed
4. **AWS Transcribe**: Cloud-based transcription with medical terminology support

The transcription service is configurable via the `TRANSCRIPTION_SERVICE` environment variable.

### Language Model Services

The application supports four language model providers:

1. **Ollama** (Default): Local open-source models (any models available in `ollama list`)
2. **OpenAI**: GPT-4o via OpenAI API
3. **AWS Bedrock**: Meta Llama 3.3 70B, Llama 3.1 405B/70B, Claude 3.7 Sonnet
4. **VLLM**: Self-hosted inference server for large models

The system will automatically use the best available model based on your configuration. For the local deployment we will be using gpt-4o via OpenAI API and for the AWS deployment we will be using Llama3.3 70b.

> [!NOTE]
> The main note generation uses the model specified in your environment configuration. Additionally, the application provides custom settings where you can test different note instructions against various models:
> - **Local Development**: All models from your `ollama list` appear as testing options in custom settings
> - **AWS Deployment**: A fixed set of Bedrock models (Meta Llama 3.3 70B, Llama 3.1 405B/70B, Claude 3.7 Sonnet) are available for testing custom note instructions

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
- **audiowaveform v1.10+** (for audio visualization)
- **Google OAuth credentials** (for local authentication)

#### Installing FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
# Using Homebrew
brew install ffmpeg
```

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
# Should show FFmpeg version information
```

#### Installing audiowaveform

**Ubuntu/Debian:**
```bash
sudo add-apt-repository ppa:chris-needham/ppa
sudo apt-get update
sudo apt-get install audiowaveform
```

**macOS:**
```bash
brew install audiowaveform
```

**Windows:**
Download from [BBC audiowaveform releases](https://github.com/bbc/audiowaveform/releases) or use WSL with Ubuntu instructions.

**Verify installation:**
```bash
audiowaveform --version
# Should show version 1.10 or higher
```

#### Setting up Google OAuth

For local development, you'll need Google OAuth credentials:

1. **Go to the [Google Cloud Console](https://console.cloud.google.com/)**

2. **Create a new project** (or select existing one):
   - Click "Select a project" → "New Project"
   - Enter project name (e.g., "Jenkins Scribe Local")
   - Click "Create"

3. **Navigate to "APIs & Services" → "Credentials"**

4. **Configure OAuth consent screen**:
   - Click "OAuth consent screen"
   - Select "External" user type (for testing)
   - Fill in required fields:
     - App name: "Jenkins Scribe"
     - User support email: Your email
     - Developer contact information: Your email
   - Click "Save and Continue"
   - Skip scopes (click "Save and Continue")
   - Add test users if needed, or skip
   - Click "Back to Dashboard"

5. **Create OAuth credentials**:
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Name: "Jenkins Scribe Local"
   - **Authorized JavaScript origins**:
     - `http://localhost:4000`
   - **Authorized redirect URIs**:
     - `http://localhost:4000/login`
   - Click "Create"

6. **Note your credentials**:
   - Copy the **Client ID** and **Client Secret**
   - You'll need these for your environment files

> [!IMPORTANT]
> The redirect URIs must match exactly. If you change the frontend port, update the redirect URIs accordingly.

### Local Development Options

All local setups use **SQLite database**, **local file storage**, and **Google OAuth authentication**. Create the below .env in web-api directory. Choose based on your AI service preference:

> [!IMPORTANT]
> If you're switching between different AI models or services, delete the `.data` folder in the `web-api` directory to clear any cached model data and ensure a clean start with your new configuration.

#### Option 1: Basic Local Setup (Recommended)

**Best for**: First-time users, completely offline setup
**Uses**: Parakeet MLX transcription + Ollama models

**Requirements**:
- No external API keys needed
- Works completely offline
- Google OAuth credentials (setup below)

**Setup Steps**:

1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows - Download from https://ollama.ai/download
   ```

2. **Pull Ollama models**:
   ```bash
   ollama pull llama3.1:8b
   # Optional: For better quality (requires more RAM)
   # ollama pull llama3.3:70b
   ```

> [!NOTE]
> Any models you have already downloaded with Ollama (visible in `ollama list`) will automatically appear as options in the application's custom settings, allowing you to test different note instructions with various models.

3. **Create backend environment file** (`web-api/.env`):
   ```env
   # Core Settings
   ENVIRONMENT=development
   COOKIE_SECURE=false
   LOGGING_LEVEL=DEBUG
   
   # JWT Configuration
   ACCESS_TOKEN_SECRET=your_secure_random_string_here
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   
   # Authentication (Google OAuth)
   USE_COGNITO=false
   USE_GOOGLE_AUTH=true
   GOOGLE_CLIENT_ID=your_google_client_id_from_oauth_setup
   GOOGLE_CLIENT_SECRET=your_google_client_secret_from_oauth_setup
   GOOGLE_REDIRECT_URI=http://localhost:4000/login
   
   # AI Services (Local)
   TRANSCRIPTION_SERVICE=Parakeet MLX
   GENERATIVE_AI_SERVICE=Ollama
   DEFAULT_NOTE_GENERATION_MODEL=llama3.1:8b
   LABEL_MODEL=llama3.1:8b
   
   # Database (Local SQLite)
   USE_AURORA=false
   ```

#### Option 2: OpenAI Setup

**Best for**: Users who want highest quality AI models
**Uses**: OpenAI Whisper transcription + GPT-4o models

**Requirements**:
- OpenAI API key
- Google OAuth credentials

**Environment file** (`web-api/.env`):
```env
# Core Settings
ENVIRONMENT=development
COOKIE_SECURE=false
LOGGING_LEVEL=DEBUG

# JWT Configuration
ACCESS_TOKEN_SECRET=your_secure_random_string_here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Authentication (Google OAuth)
USE_COGNITO=false
USE_GOOGLE_AUTH=true
GOOGLE_CLIENT_ID=your_google_client_id_from_oauth_setup
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_oauth_setup
GOOGLE_REDIRECT_URI=http://localhost:4000/login

# AI Services (OpenAI)
TRANSCRIPTION_SERVICE=OpenAI Whisper
GENERATIVE_AI_SERVICE=OpenAI
DEFAULT_NOTE_GENERATION_MODEL=gpt-4o
LABEL_MODEL=gpt-4o

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Database (Local SQLite)
USE_AURORA=false
```

#### Option 3: Local GPU Setup (VLLM)

**Best for**: Users with powerful GPUs, maximum performance and privacy
**Uses**: VLLM inference + Parakeet MLX or WhisperX transcription

**Requirements**:
- NVIDIA GPU with 8GB+ VRAM
- CUDA toolkit installed
- Google OAuth credentials
- Hugging Face token

**Setup Steps**:

1. **Install CUDA toolkit** (if not installed):
   ```bash
   # Check if CUDA is installed
   nvidia-smi
   
   # Ubuntu/Debian installation
   wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
   sudo dpkg -i cuda-keyring_1.1-1_all.deb
   sudo apt-get update
   sudo apt-get install cuda-toolkit-12-4
   ```

2. **Install VLLM**:
   ```bash
   cd web-api
   pip install vllm[cuda] huggingface_hub transformers torch
   ```

3. **Environment file** (`web-api/.env`):
   ```env
   # Core Settings
   ENVIRONMENT=development
   COOKIE_SECURE=false
   LOGGING_LEVEL=DEBUG
   
   # JWT Configuration
   ACCESS_TOKEN_SECRET=your_secure_random_string_here
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   
   # Authentication (Google OAuth)
   USE_COGNITO=false
   USE_GOOGLE_AUTH=true
   GOOGLE_CLIENT_ID=your_google_client_id_from_oauth_setup
   GOOGLE_CLIENT_SECRET=your_google_client_secret_from_oauth_setup
   GOOGLE_REDIRECT_URI=http://localhost:4000/login
   
   # AI Services (Local GPU)
   TRANSCRIPTION_SERVICE=Parakeet MLX
   # Alternative: TRANSCRIPTION_SERVICE=WhisperX
   GENERATIVE_AI_SERVICE=VLLM
   
   # VLLM Configuration
   VLLM_ENABLED=true
   VLLM_SERVER_NAME=localhost
   VLLM_SERVER_PORT=8080
   
   # Model Selection (choose based on GPU memory)
   # For 24GB+ VRAM:
   VLLM_MODEL_NAME=meta-llama/Meta-Llama-3.1-70B-Instruct
   DEFAULT_NOTE_GENERATION_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
   LABEL_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
   
   # For 8-16GB VRAM:
   # VLLM_MODEL_NAME=meta-llama/Meta-Llama-3.1-8B-Instruct
   # DEFAULT_NOTE_GENERATION_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
   # LABEL_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
   
   # Hugging Face token (required for model downloads)
   HUGGINGFACE_TOKEN=your_huggingface_token
   
   # Database (Local SQLite)
   USE_AURORA=false
   ```

4. **Get Hugging Face token**:
   - Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   - Create a new token with "Read" permissions
   - Accept the Llama model license at [huggingface.co/meta-llama](https://huggingface.co/meta-llama)

5. **Start VLLM server**:
   ```bash
   # Start VLLM server in separate terminal
   python -m vllm.entrypoints.openai.api_server \
     --model meta-llama/Meta-Llama-3.1-70B-Instruct \
     --host localhost \
     --port 8080 \
     --gpu-memory-utilization 0.95
   ```

### Start the Backend

For all options:
```bash
cd web-api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. **Create frontend environment file** (`ai-scribe-app/.env`):
   ```env
   # Backend API URL
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   
   # Authentication Configuration
   NEXT_PUBLIC_USE_COGNITO=false
   NEXT_PUBLIC_USE_GOOGLE_AUTH=true
   
   # Google OAuth Configuration (use same Client ID from backend setup)
   GOOGLE_CLIENT_ID=your_google_client_id_from_step_above
   GOOGLE_REDIRECT_URI=http://localhost:4000/login
   ```

2. **Install dependencies and start**:
   ```bash
   cd ai-scribe-app
   npm install
   npm run dev
   ```

> [!NOTE]
> The `GOOGLE_CLIENT_ID` should be the same in both frontend and backend environment files.

### Verification

1. Navigate to `http://localhost:4000`
2. Click the login button
3. Complete authentication flow
4. Test audio recording or file upload
5. Verify note generation works

## AWS Deployment

### Architecture
![AWS Architecture](https://github.com/user-attachments/assets/02cece57-7e3c-44d3-8488-ecd078026c35)

### Step 1: AWS Account Setup

1. **Create AWS Account**: If you don't have one, sign up at [aws.amazon.com](https://aws.amazon.com)

2. **Install AWS CLI**:
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Windows - Download from AWS website
   ```

3. **Configure AWS CLI**:
   ```bash
   aws configure
   # Enter your Access Key ID
   # Enter your Secret Access Key
   # Default region: us-west-2 (recommended)
   # Default output format: json
   ```

4. **Enable Bedrock Model Access**:
   - Go to AWS Bedrock Console
   - Navigate to "Model access" in the left sidebar
   - Request access to:
     - **Meta Llama 3.3 70B Instruct** (`us.meta.llama3-3-70b-instruct-v1:0`)
     - **Meta Llama 3.1 405B Instruct** (`meta.llama3-1-405b-instruct-v1:0`) 
     - **Meta Llama 3.1 70B Instruct** (`meta.llama3-1-70b-instruct-v1:0`)
     - **Anthropic Claude 3.7 Sonnet** (`anthropic.claude-3-7-sonnet-20250219-v1:0`)

### Step 2: Domain Setup

1. **Register a Domain**:

   **Option 1: Register through Route53 Console (Recommended)**:
   - Go to [Route53 Console](https://us-east-1.console.aws.amazon.com/route53/v2/home#Dashboard)
   - Click "Register Domain"
   - Search for your desired domain name
   - Follow the registration process (requires contact information and payment)
   - Domain registration can take up to 48 hours to complete

   **Option 2: Use existing domain with Route53**:
   ```bash
   # If you have a domain registered elsewhere, create a hosted zone
   aws route53 create-hosted-zone \
     --name yourdomain.com \
     --caller-reference $(date +%s) \
     --hosted-zone-config Comment="Jenkins Scribe hosted zone"
   
   # Note: You'll need to update your domain's nameservers to point to Route53
   ```

2. **Note your Hosted Zone ID**:
   ```bash
   aws route53 list-hosted-zones --query "HostedZones[?Name=='yourdomain.com.'].Id" --output text
   ```

### Step 3: Create VPC Infrastructure (AWS Console)

#### Option A: Use Existing VPC (If You Have One)

If you already have a VPC set up like in your screenshots:

1. **Note Your VPC Details**:
   - **VPC ID**: `vpc-01e9a055781f7820` (your actual ID)
   - **Public Subnets**: Copy the subnet IDs from your public subnets
   - **Private Subnets**: Copy the subnet IDs from your private subnets

2. **Skip to Step 4** and use these values in the deployment form

#### Option B: Create New VPC (Recommended for New Users)

**Use AWS VPC Wizard**

1. **Go to VPC Console**:
   - Open [VPC Console](https://console.aws.amazon.com/vpc/)
   - Click "Create VPC"

2. **VPC Settings - Choose "VPC and more"**:

   **Basic Settings:**
   - **Resources to create**: Select `VPC and more` (not "VPC only")
   - **Name tag auto-generation**: Check the box

   - **Auto-generate**: `jenkins` (or your preferred name)

   **Network Configuration:**
   - **IPv4 CIDR block**: `10.0.0.0/16`
   - **IPv6 CIDR block**: Select `No IPv6 CIDR block`
   - **Tenancy**: `Default`

   **Availability Zones & Subnets:**
   - **Number of Availability Zones (AZs)**: `2` (recommended)
   - **Number of public subnets**: `2`
   - **Number of private subnets**: `2`

   **NAT Gateway Configuration:**
   - **NAT gateways**: `In 1 AZ` (saves costs vs "1 per AZ")

   **VPC Endpoints:**
   - **VPC endpoints**: `S3 Gateway` (helps reduce data transfer costs)

   **DNS Options:**
   - **Enable DNS hostnames**: (checked)
   - **Enable DNS resolution**: (checked)

3. **Review the Preview** - You should see:
   - 4 subnets (2 public, 2 private)
   - 3 route tables
   - 3 network connections (IGW, NAT Gateway, VPC-S3)

4. **Click "Create VPC"** - AWS creates everything automatically!

5. **Note Your Resource IDs** (you'll need these for deployment):

   After VPC creation, go to your VPC dashboard and collect these values:

   **From VPC Details Tab:**
   - **VPC ID**: `vpc-01e9a055781f7820` (copy your actual VPC ID)

   **From Subnets Section:**
   - **Public Subnet IDs**: Look for subnets with "public" in the name
     - Example: `subnet-xxxxx, subnet-yyyyy`
   - **Private Subnet IDs**: Look for subnets with "private" in the name  
     - Example: `subnet-aaaaa, subnet-bbbbb`

   **Write these down - you'll need them in Step 4!**

### Step 4: Deploy the Application

Use the one-click deployment link:
   
**One-click Deployment**
| Service | Button |
|---------|--------|
| AWS     | [![AWS CloudFormation Launch Stack SVG Button](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://us-west-2.console.aws.amazon.com/cloudformation/home?region=us-west-2#/stacks/quickcreate?stackName=os-jenkins-ai-scribe&templateURL=https://cf-templates-14rwubwevbsfc-us-west-2.s3.us-west-2.amazonaws.com/2025-06-01T072716.376Zklu-template.yaml)

**Custom Deployment**: If you need to modify the CloudFormation template (e.g., change instance sizes, add custom configurations), you can use the `template.yaml` file included in this repository. Download the template, make your modifications, and deploy it manually through the AWS CloudFormation console or AWS CLI instead of using the one-click deployment above.

> [!IMPORTANT]
> If you modify the `template.yaml` file and deploy it manually, you cannot use the one-click deployment button. You must deploy your custom template through the AWS CloudFormation console or CLI.

**Fill in the required parameters**:

   | Parameter | Description | Example |
   |-----------|-------------|---------|
   | **Environment** | Deployment environment | `production` |
   | **HostedZoneId** | Route53 Hosted Zone ID | `Z1D633PJN98FT9` |
   | **VpcId** | VPC ID from Step 3 | `vpc-12345678` |
   | **PublicSubnets** | Public subnet IDs (comma-separated) | `subnet-12345,subnet-67890` |
   | **PrivateSubnets** | Private subnet IDs (comma-separated) | `subnet-abcde,subnet-fghij` |
   | **DomainName** | Your domain name | `yourdomain.com` |
   | **AuthDomainPrefix** | Cognito auth subdomain | `auth-jenkins` |
   | **AccessTokenSecret** | JWT signing secret | Generate with `openssl rand -base64 32` |
   | **DBName** | Database name | `os_jenkins` |
   | **DBUser** | Database username | `jenkins_admin` |
   | **DBPassword** | Database password | Generate secure password |

### Step 5: Post-Deployment Configuration

**Test the application**:
- Navigate to the Frontend URL
- Complete Cognito authentication
- Test audio recording and note generation

**Docker Images**: The CloudFormation template uses pre-built Docker images hosted on AWS Public ECR:
- **Frontend**: `public.ecr.aws/s9f8j1d3/jenkins-os-frontend:latest`
- **Backend**: `public.ecr.aws/s9f8j1d3/jenkins-os-backend:latest`

These images are automatically pulled during deployment and contain the latest stable versions of the application components.

**Updates**: When new releases are available, we update the images at the same URLs. To get the latest version, simply restart your ECS services:
```bash
aws ecs update-service --cluster jenkins-os-cluster-production --service jenkins-os-frontend-production --force-new-deployment
aws ecs update-service --cluster jenkins-os-cluster-production --service jenkins-os-backend-production --force-new-deployment
```

## Available Services Reference

You can view all available services and models by running:

```bash
cd web-api
python -m app.cli.list_services
```

This will show:
- **Transcription Services**: Parakeet MLX, OpenAI Whisper, WhisperX, AWS Transcribe
- **AI Services**: Ollama (with your installed models), OpenAI, AWS Bedrock, VLLM
- **Available Models**: 
  - **Ollama**: All models from your `ollama list` output
  - **AWS Bedrock**: `us.meta.llama3-3-70b-instruct-v1:0`, `meta.llama3-1-405b-instruct-v1:0`, `meta.llama3-1-70b-instruct-v1:0`, `anthropic.claude-3-7-sonnet-20250219-v1:0`
  - **OpenAI**: `gpt-4o`, `gpt-3.5-turbo`
  - **VLLM**: Custom models you've configured

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
- **Ollama**: Licensed under the MIT License.
- **vLLM**: Licensed under the Apache License 2.0.
- **Parakeet Models**: Licensed under the Creative Commons Attribution 4.0 International License (CC-BY-4.0).

For the full text of these licenses, please see the [THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES) file in this repository.

### Llama 3.3 License Notice

This project uses Meta Llama 3.3. As per the Llama 3.3 license requirements:

- This project is "Built with Meta Llama 3.3".
- Any AI models created, trained, or fine-tuned using Llama 3.3 as part of this project will include "Llama 3.3" at the beginning of the model name.
- Use of Llama 3.3 in this project complies with the [Meta Llama 3.3 Acceptable Use Policy](https://www.llama.com/llama3_3/use-policy/).

For the complete Meta Llama 3.3 Community License Agreement, refer to the [THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES) file.

### Attribution Notices

- **Built with Meta Llama 3.3** (as required by Meta's license)
- **Parakeet models by NVIDIA Corporation** (as required by CC-BY-4.0)

## Medical Disclaimer

> [!IMPORTANT]
> The Licensed Work is provided as a support tool only and is not intended as a substitute for the guidance or care of a health professional.

> [!CAUTION]
> The authors disclaim all warranties, expressed or implied. In particular, but without limitation, the Licensed Work is provided WITHOUT WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE, EITHER EXPRESSED OR IMPLIED. The user assumes all responsibility for losses, costs, claims, damages or liability of any kind whatsoever which may arise from use of the Licensed Work.
