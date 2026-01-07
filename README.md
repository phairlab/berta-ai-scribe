# Berta AI Scribe v0.9.0-beta

Berta AI Scribe is an advanced medical documentation assistant designed to help healthcare providers efficiently create clinical notes from audio recordings of patient encounters. The system uses state-of-the-art AI transcription services and language models to transform medical conversations into well-structured clinical documentation.

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
  - [Backend Environment Setup](#backend-environment-setup)
  - [Local Development Options](#local-development-options)
  - [Option 1: OpenAI Setup (Easiest)](#option-1-openai-setup-easiest)
  - [Option 2: Basic Local Setup (Offline)](#option-2-basic-local-setup-offline)
  - [Option 3: Local GPU Setup (VLLM)](#option-3-local-gpu-setup-vllm)
  - [Option 4: LM Studio Setup](#option-4-lm-studio-setup)
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

Berta AI Scribe aims to reduce the documentation burden on healthcare providers by:
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

![Berta_Arch](https://github.com/user-attachments/assets/ecb3cf72-24e9-478a-99ec-75e8bb82f426)

- **Web Browser**: The client interface accessed by users
- **Next.js Frontend**: Server-side rendered React application
- **Python FastAPI Backend**: Handles API requests and business logic
- **Virtualization Layer**: Contains:
  - **vLLM Inference Engine**: For AI model inference
  - **Speech-to-text (ASR)**: For audio transcription
- **Hardware Layer**: GPU Cluster for high-performance computing
- **Virtual Private Cloud**: Secure network environment

## Technical Components

### Transcription Services

Berta Scribe supports four transcription services:

1. **Parakeet MLX** (Default): Local, fast transcription using Apple's MLX framework
2. **OpenAI Whisper**: State-of-the-art speech recognition via OpenAI API
3. **WhisperX**: Enhanced local Whisper with better accuracy and speed
4. **AWS Transcribe**: Cloud-based transcription with medical terminology support

The transcription service is configurable via the `TRANSCRIPTION_SERVICE` environment variable.

### Language Model Services

The application supports five language model providers:

1. **Ollama** (Default): Local open-source models (any models available in `ollama list`)
2. **OpenAI**: GPT-4o via OpenAI API
3. **AWS Bedrock**: Meta Llama 3.3 70B, Llama 3.1 405B/70B, Claude 3.7 Sonnet
4. **VLLM**: Self-hosted inference server for large models
5. **LM Studio**: Local inference with user-friendly GUI and model management

The system will automatically use the best available model based on your configuration. For the local deployment we will be using gpt-4o via OpenAI API and for the AWS deployment we will be using Llama3.3 70b.

> [!NOTE]
> The main note generation uses the model specified in your environment configuration. Additionally, the application provides custom settings where you can test different note instructions against various models:
> - **Local Development**: 
>   - **Ollama**: All models from your `ollama list` appear as testing options in custom settings
>   - **LM Studio**: Only currently loaded models in LM Studio appear as testing options (unlike Ollama which shows all downloaded models)
> - **AWS Deployment**: A fixed set of Bedrock models (Meta Llama 3.3 70B, Llama 3.1 405B/70B, Claude 3.7 Sonnet) are available for testing custom note instructions

## Storage Configuration

Berta Scribe supports two storage options:

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

# Local Development Setup

## Prerequisites

- **Python 3.11+** (managed with uv)
- **uv** (modern Python package and project manager)
- **Node.js 18+** and npm
- **FFmpeg** (for audio processing)
- **audiowaveform v1.10+** (for audio visualization)
- **Google OAuth credentials** (for local authentication)

### Installing uv (Python Package Manager)

**macOS/Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Windows:**
```bash
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Alternative (using pip):**
```bash
pip install uv
```

**Verify installation:**
```bash
uv --version
# Should show uv version information
```

### Installing FFmpeg

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

### Installing audiowaveform

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

### Setting up Google OAuth

For local development, you'll need Google OAuth credentials:

1. **Go to the [Google Cloud Console](https://console.cloud.google.com/)**

2. **Create a new project** (or select existing one):
   - Click "Select a project" → "New Project"
   - Enter project name (e.g., "Berta Scribe Local")
   - Click "Create"

3. **Navigate to "APIs & Services" → "Credentials"**

4. **Configure OAuth consent screen**:
   - Click "OAuth consent screen"
   - Select "External" user type (for testing)
   - Fill in required fields:
     - App name: "Berta Scribe"
     - User support email: Your email
     - Developer contact information: Your email
   - Click "Save and Continue"
   - Skip scopes (click "Save and Continue")
   - Add test users if needed, or skip
   - Click "Back to Dashboard"

5. **Create OAuth credentials**:
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Name: "Berta Scribe Local"
   - **Authorized JavaScript origins**:
     - `http://localhost:4000`
   - **Authorized redirect URIs**:
     - `http://localhost:4000/login`
   - Click "Create"

6. **Note your credentials**:
   - Copy the **Client ID** and **Client Secret**
   - **Where to find them**: After clicking "Create", a popup will show both credentials. If you miss this popup, go to "APIs & Services" → "Credentials" → click on your OAuth client name → the Client ID and Client Secret will be displayed on the details page
   - You'll need these for your environment files

> [!IMPORTANT]
> The redirect URIs must match exactly. If you change the frontend port, update the redirect URIs accordingly.

## Backend Environment Setup

Before configuring specific AI services, set up the Python backend environment:

1. **Navigate to backend directory**:
   ```bash
   cd web-api
   ```

2. **Create Python virtual environment with uv**:
   ```bash
   uv venv --python 3.11
   ```

3. **Activate the virtual environment**:
   ```bash
   # macOS/Linux
   source .venv/bin/activate
   
   # Windows
   .venv\Scripts\activate
   ```

4. **Install dependencies**:
   ```bash
   # BEFORE installing, check if you need to uncomment any dependencies:
   # - VLLM users: Uncomment vllm, torch, torchaudio lines
   # - Apple Silicon users: Uncomment mlx, parakeet-mlx lines
   # - Everyone else: No changes needed

   uv pip install -r requirements.txt
   ```
5. **For WhisperX with GPU Support (Optional)**:
   If you plan to use WhisperX with an NVIDIA GPU (Option 2 or 3), upgrade PyTorch to CUDA version for faster transcription:
   ```bash
   # Only if you have NVIDIA GPU and want faster WhisperX transcription
   uv pip install torch==2.5.0 torchaudio==2.5.0 --index-url https://download.pytorch.org/whl/cu121 --reinstall --no-deps
   
   # Install cuDNN libraries (Ubuntu/Debian)
   wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
   sudo dpkg -i cuda-keyring_1.1-1_all.deb
   sudo apt-get update
   sudo apt-get install -y libcudnn8=8.9.7.29-1+cuda12.2
   
   # Set environment variable
   export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH

Then set `WHISPERX_DEVICE=cuda` in your `.env` file when configuring WhisperX.

**Note**: Skip this step if you're using OpenAI (Option 1), Apple Silicon with Parakeet MLX, or don't have an NVIDIA GPU.

> [!NOTE]
> Keep this terminal open with the virtual environment activated for the remaining setup steps.

## Local Development Options

All local setups use **SQLite database**, **local file storage**, and **Google OAuth authentication**. Choose based on your AI service preference:

> [!IMPORTANT]
> If you're switching between different AI models or services, delete the `.data` folder in the `web-api` directory to clear any cached model data and ensure a clean start with your new configuration.

### Common Environment Variables

**Create the environment file**:
1. Navigate to the `web-api` directory
2. Create a new file called `.env` (note the dot at the beginning)
3. Copy and paste the following settings into your new `.env` file:

```env
# Core Settings
ENVIRONMENT=development
COOKIE_SECURE=false
LOGGING_LEVEL=DEBUG

# JWT Configuration
# ACCESS_TOKEN_SECRET: A random string used to sign JWT tokens for security
# Generate one with: openssl rand -base64 32
ACCESS_TOKEN_SECRET=your_secure_random_string_here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Authentication (Google OAuth)
USE_COGNITO=false
USE_GOOGLE_AUTH=true
GOOGLE_CLIENT_ID=your_google_client_id_from_oauth_setup
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_oauth_setup
GOOGLE_REDIRECT_URI=http://localhost:4000/login

# Database (Local SQLite)
USE_AURORA=false
```

Then, add the AI service-specific variables based on your chosen option below:

### Option 1: OpenAI Setup (Easiest)

**Best for**: Quick start, highest quality AI models, minimal setup
**Uses**: OpenAI Whisper transcription + GPT-4o models

**Requirements**:
- OpenAI API key (get one at [platform.openai.com](https://platform.openai.com))
- Google OAuth credentials
- No local AI software needed!

**Setup Steps**:

1. **Get OpenAI API Key**:
   - **Sign up/Login**: Go to [platform.openai.com](https://platform.openai.com) and create an account or log in
   - **Navigate to API Keys**: Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **Create new key**: Click "Create new secret key"
   - **Name your key**: Give it a descriptive name like "Berta Scribe Local"
   - **Set permissions**: Choose "All" or ensure it has access to the models you need
   - **Copy the key**: After creation, copy the API key immediately (it starts with `sk-...`)
   - **Save securely**: Store it in a safe place - you won't be able to see it again
   - **Add billing**: Make sure you have billing set up at [platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing)

2. **Add OpenAI settings to your `.env` file**:
   - Open the `web-api/.env` file you created earlier
   - Append these lines at the bottom (below the common settings):
   ```env
   # AI Services (OpenAI)
   TRANSCRIPTION_SERVICE=OpenAI Whisper
   GENERATIVE_AI_SERVICE=OpenAI
   DEFAULT_NOTE_GENERATION_MODEL=gpt-4o
   LABEL_MODEL=gpt-4o

   # OpenAI API Key (replace with your actual API key from step 1)
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **That's it!** No additional software to install or configure.

> [!NOTE]
> **Costs**: OpenAI charges approximately $0.36 per hour of audio transcribed. GPT-4o usage is additional but typically minimal for note generation.


### Option 2: Basic Local Setup (Offline)

**Best for**: First-time users, completely offline setup
**Uses**: Parakeet MLX transcription + Ollama models

> [!WARNING]
> **Parakeet MLX requires Apple Silicon (M1/M2/M3 Macs)**. If you're on Intel Mac, Linux, or Windows, you must change the transcription service in step 5 below.

**Requirements**:
- No external API keys needed
- Works completely offline
- Google OAuth credentials

**Setup Steps**:

1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows - Download from https://ollama.ai/download
   ```

2. **Start Ollama service**:
   ```bash
   # Start Ollama service (required for the application to work)
   ollama serve
   
   # The service will run on http://localhost:11434
   # Keep this terminal open or run as a background service
   ```

3. **Pull Ollama models** (in a new terminal):
   ```bash
   ollama pull llama3.1:8b
   # Optional: For better quality (requires more RAM)
   # ollama pull llama3.3:70b
   ```

4. **Verify Ollama is working**:
   ```bash
   ollama list
   # Should show your downloaded models
   
   curl http://localhost:11434/api/tags
   # Should return JSON with available models
   ```
> [!IMPORTANT]
> **Apple Silicon users**: Make sure you uncommented the `mlx` and `parakeet-mlx` lines in `requirements.txt` before installing dependencies (as mentioned in Backend Environment Setup step 4).

> [!NOTE]
> Any models you have already downloaded with Ollama (visible in `ollama list`) will automatically appear as options in the application's custom settings, allowing you to test different note instructions with various models.

5. **Append these lines to your `web-api/.env` file** (below the common settings):
  **For Apple Silicon Mac:**
   ```env
   # AI Services (Ollama)
   TRANSCRIPTION_SERVICE=Parakeet MLX
   GENERATIVE_AI_SERVICE=Ollama
   DEFAULT_NOTE_GENERATION_MODEL=llama3.1:8b
   LABEL_MODEL=llama3.1:8b
   ```

   **For Intel/Linux/Windows with NVIDIA GPU:**
   ```env
   # AI Services (Ollama + WhisperX GPU)
   TRANSCRIPTION_SERVICE=WhisperX
   WHISPERX_DEVICE=cuda  # Fast GPU transcription
   GENERATIVE_AI_SERVICE=Ollama
   DEFAULT_NOTE_GENERATION_MODEL=llama3.1:8b
   LABEL_MODEL=llama3.1:8b
   ```

   **For Intel/Linux/Windows CPU-only:**
   ```env
   # AI Services (Ollama + WhisperX CPU)
   TRANSCRIPTION_SERVICE=WhisperX
   WHISPERX_DEVICE=cpu  # Warning: Slow transcription (consider Option 1 instead)
   GENERATIVE_AI_SERVICE=Ollama
   DEFAULT_NOTE_GENERATION_MODEL=llama3.1:8b
   LABEL_MODEL=llama3.1:8b
   ```

> [!WARNING]
> **Performance Notes:**
> - **Parakeet MLX** (Apple Silicon): Fast, efficient transcription
> - **WhisperX GPU** (NVIDIA): Fast transcription, comparable to Parakeet
> - **WhisperX CPU**: Very slow (5-20x slower than real-time). Consider using Option 1 (OpenAI) for better performance if you don't have Apple Silicon or NVIDIA GPU.

> [!NOTE]
> Any models you have already downloaded with Ollama (visible in `ollama list`) will automatically appear as options in the application's custom settings, allowing you to test different note instructions with various models.

### Option 3: Local GPU Setup (VLLM)

**Best for**: Users with powerful GPUs, maximum performance and privacy
**Uses**: VLLM inference + WhisperX transcription

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

2. **Modify requirements.txt and install VLLM** (in the Python virtual environment):
   ```bash
   cd web-api
   # First, uncomment these lines in requirements.txt:
   # vllm>=0.3.0
   # torch>=2.5.0,<3.0.0
   # torchaudio>=2.5.0,<3.0.0
   # nvidia-cudnn-cu12>=9.0.0  # Optional but recommended
   
   # Then install:
   uv pip install -r requirements.txt

3. **Get Hugging Face token**:
   - Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   - Create a new token with "Read" permissions
   - Accept the Llama model license at [huggingface.co/meta-llama](https://huggingface.co/meta-llama)

4. **Append these lines to your `web-api/.env` file** (below the common settings):
   ```env
   # AI Services (VLLM)
   TRANSCRIPTION_SERVICE=WhisperX
   GENERATIVE_AI_SERVICE=VLLM
   
   # VLLM Configuration
   VLLM_SERVER_NAME=localhost
   VLLM_SERVER_PORT=8080
   
   VLLM_MODEL_NAME=meta-llama/Meta-Llama-3.1-70B-Instruct
   DEFAULT_NOTE_GENERATION_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
   LABEL_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
   
   # Hugging Face token (required for model downloads)
   HUGGINGFACE_TOKEN=your_huggingface_token

   # WhisperX device (if using WhisperX): cuda, cpu, or cuda:0
   WHISPERX_DEVICE=cuda
   ```

> [!IMPORTANT]
> **All three model variables must have the same value:**
> - `VLLM_MODEL_NAME` - Specifies which model to download from Hugging Face
> - `DEFAULT_NOTE_GENERATION_MODEL` - Model used for generating clinical notes
> - `LABEL_MODEL` - Model used for note labeling and classification
> These must match exactly for VLLM to work properly.

5. **Start VLLM server**:
   ```bash
   # Start VLLM server in separate terminal
   python -m vllm.entrypoints.openai.api_server \
     --model meta-llama/Meta-Llama-3.1-70B-Instruct \
     --host localhost \
     --port 8080 \
     --gpu-memory-utilization 0.95
   ```

### Option 4: LM Studio Setup

**Best for**: Users who want a GUI for model management and high-quality local inference
**Uses**: Parakeet MLX transcription + LM Studio models

**Requirements**:
- LM Studio installed
- Google OAuth credentials
- No external API keys needed

> [!IMPORTANT]
> **Apple Silicon users**: Make sure you uncommented the `mlx` and `parakeet-mlx` lines in `requirements.txt` before installing dependencies.
> **Non-Apple Silicon users**: Change `TRANSCRIPTION_SERVICE` to `WhisperX` or `OpenAI Whisper` in step 5, as Parakeet MLX only works on Apple Silicon.


**Setup Steps**:

1. **Install LM Studio**:
   - Download from [lmstudio.ai](https://lmstudio.ai/)
   - Install and launch LM Studio

2. **Download models in LM Studio**:
   - Open LM Studio
   - Go to "Search" tab
   - Download models like:
     - `llama-3.1-8b-instruct` (faster, 8GB RAM)
     - `llama-3.3-70b-instruct` (higher quality, 64GB+ RAM)
     - `mistral-7b-instruct-v0.3` (good balance)

3. **Load a model**:
   - Go to "Chat" tab in LM Studio
   - Click "Select a model to load"
   - Choose your preferred model and click "Load Model"
   - Wait for the model to load completely

4. **Start LM Studio server**:
   - In LM Studio, go to "Local Server" tab
   - Click "Start Server"
   - Note the server URL (usually `http://localhost:1234`)

> [!NOTE]
> Unlike Ollama which shows all downloaded models in custom settings, LM Studio only shows the currently loaded model as an option for testing different note instructions. You must load the desired model in LM Studio's interface before it becomes available in the application.

5. **Append these lines to your `web-api/.env` file** (below the common settings):
   ```env
   # AI Services (LM Studio)
   TRANSCRIPTION_SERVICE=Parakeet MLX
   GENERATIVE_AI_SERVICE=LM Studio

   # Model Selection (use the name of the loaded model in LM Studio)
   DEFAULT_NOTE_GENERATION_MODEL=llama-3.1-8b-instruct
   LABEL_MODEL=llama-3.1-8b-instruct
   ```

> [!IMPORTANT]
> Make sure LM Studio server is running and a model is loaded before starting the backend. The model name in your environment file should match the loaded model in LM Studio.

## Start the Backend

### For ALL Users
- Add Google OAuth Client ID and Secret to `web-api/.env` (backend) file
- **If switching AI services**: 
  - Delete the `.data` folder in `web-api` directory
  - Clear browser cache and storage for `localhost:4000` (F12 → Application tab → Clear storage)


### For Ollama Users (Option 2)
**Start Ollama service FIRST**:
```bash
ollama serve
# Keep this terminal open, then start backend in new terminal
```

### For LM Studio Users (Option 4)
**Before starting backend**:
1. Open LM Studio
2. Load your model (from Chat tab)
3. Start server (from Local Server tab, use default settings)
4. Model name in `.env` must match exactly what's loaded in LM Studio

### Startup Order
1. Start AI service (Ollama/LM Studio)
2. Start backend (`uvicorn app.main:app --reload --port 8000`)
3. Start frontend (`npm run dev`)

After completing your chosen AI service setup above:

1. **Ensure your virtual environment is activated**:
   ```bash
   # If not already activated from the Backend Environment Setup
   cd web-api
   source .venv/bin/activate  # macOS/Linux
   # or .venv\Scripts\activate  # Windows
   ```

2. **Start the backend server**:

   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## Frontend Setup

1. **Create frontend environment file**:
   - Navigate to the `ai-scribe-app` directory
   - Create a new file called `.env` (note the dot at the beginning)
   - Copy and paste the following settings into your new `.env` file:
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

2. **Navigate to frontend directory**:
   ```bash
   cd ai-scribe-app
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the frontend development server**:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:4000`

> [!NOTE]
> The `GOOGLE_CLIENT_ID` should be the same in both frontend and backend environment files.


## Verification

1. Navigate to `http://localhost:4000`
2. Click the login button
3. Complete authentication flow
4. Test audio recording or file upload
5. Verify note generation works

## Troubleshooting

### Common Issues

**Ollama Connection Issues**:
- Ensure `ollama serve` is running in a separate terminal
- Check that Ollama is accessible at `http://localhost:11434`
- Verify models are downloaded with `ollama list`

**Python Environment Issues**:
- Make sure you're using Python 3.11+ with `python --version`
- Activate the virtual environment before installing dependencies
- If uv installation fails, try the pip alternative: `pip install uv`

**Authentication Issues**:
- Verify Google OAuth redirect URIs match exactly
- Check that both frontend and backend have the same Google Client ID
- Ensure the frontend is running on the port specified in OAuth settings (default: 4000)

## AWS Deployment

### Architecture
![AWS Architecture](https://github.com/user-attachments/assets/02cece57-7e3c-44d3-8488-ecd078026c35)

### Step 1: AWS Account Setup

1. **Create AWS Account**: If you don't have one, sign up at [aws.amazon.com](https://aws.amazon.com)

2. **Log into AWS Console**: After creating your account, log into the [AWS Management Console](https://console.aws.amazon.com)

3. **Enable Bedrock Model Access**:
   - **Go to AWS Bedrock Console**: In the AWS search bar at the top, type "Bedrock" and click on "Amazon Bedrock"
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
     --hosted-zone-config Comment="Berta Scribe hosted zone"
   
   # Note: You'll need to update your domain's nameservers to point to Route53
   ```

2. **Find your Hosted Zone ID**:
   
   **Method 1 (AWS Console - Recommended)**:
   - Go to [Route53 Console](https://us-east-1.console.aws.amazon.com/route53/v2/home#Dashboard)
   - Click "Hosted zones" in the left sidebar
   - Find your domain in the list
   - Copy the **Hosted zone ID** (looks like `Z1D633PJN98FT9`) - you'll need this for deployment
   
   **Method 2 (AWS CLI)**:
   ```bash
   aws route53 list-hosted-zones --query "HostedZones[?Name=='yourdomain.com.'].Id" --output text
   ```

### Step 3: Create VPC Infrastructure (AWS Console)

#### Option A: Use Existing VPC (If You Have One)

If you already have a VPC set up:

1. **Note Your VPC Details**:
   - **VPC ID**: Copy your VPC ID from the VPC console
   - **Public Subnets**: Copy the subnet IDs from your public subnets
   - **Private Subnets**: Copy the subnet IDs from your private subnets

2. **Verify your subnets** (run this command to check):
   ```bash
   aws ec2 describe-subnets --filters "Name=vpc-id,Values=<YOUR_VPC_ID>" --region us-west-2 \
     --query 'Subnets[*].{ID:SubnetId,AZ:AvailabilityZone,CIDR:CidrBlock,Public:MapPublicIpOnLaunch}' --output table
   ```

3. **Verify you have a NAT Gateway**:
   ```bash
   aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=<YOUR_VPC_ID>" --region us-west-2 \
     --query 'NatGateways[*].{ID:NatGatewayId,State:State,SubnetId:SubnetId}' --output table
   ```

4. **Skip to Step 3b** to add security hardening, then proceed to Step 4

#### Option B: Create New VPC (Recommended for New Users)

**Use AWS VPC Wizard**

1. **Go to VPC Console**:
   - Open [VPC Console](https://console.aws.amazon.com/vpc/)
   - Click "Create VPC"

2. **VPC Settings - Choose "VPC and more"**:

   | Setting | Value |
   |---------|-------|
   | Resources to create | `VPC and more` |
   | Name tag auto-generation | `berta` |
   | IPv4 CIDR block | `10.0.0.0/16` |
   | IPv6 CIDR block | `No IPv6 CIDR block` |
   | Tenancy | `Default` |
   | Number of AZs | `2` |
   | Number of public subnets | `2` |
   | Number of private subnets | `2` |
   | NAT gateways | `In 1 AZ` |
   | VPC endpoints | `S3 Gateway` |
   | DNS hostnames | Enabled |
   | DNS resolution | Enabled |

3. **Review the Preview** - You should see:
   - 4 subnets (2 public, 2 private)
   - 3 route tables
   - 3 network connections (IGW, NAT Gateway, VPC-S3)

4. **Click "Create VPC"** - AWS creates everything automatically!

5. **Note Your Resource IDs** (you'll need these for deployment):

   | Resource | Where to Find |
   |----------|---------------|
   | VPC ID | VPC Details tab |
   | Public Subnets | Subnets with "public" in name (typically `10.0.0.0/20`, `10.0.16.0/20`) |
   | Private Subnets | Subnets with "private" in name (typically `10.0.128.0/20`, `10.0.144.0/20`) |

#### Step 3b: Security Hardening (Recommended)

After creating your VPC, add these security measures:

##### Enable VPC Flow Logs (for monitoring)

VPC Flow Logs help you monitor network traffic and detect suspicious activity:

```bash
# Create CloudWatch log group
aws logs create-log-group --log-group-name /vpc/berta-flow-logs --region us-west-2

# Create IAM role for flow logs
echo '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"vpc-flow-logs.amazonaws.com"},"Action":"sts:AssumeRole"}]}' > /tmp/trust-policy.json

aws iam create-role --role-name VPCFlowLogsRole --assume-role-policy-document file:///tmp/trust-policy.json

echo '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["logs:CreateLogStream","logs:PutLogEvents","logs:DescribeLogGroups","logs:DescribeLogStreams"],"Resource":"*"}]}' > /tmp/flow-logs-policy.json

aws iam put-role-policy --role-name VPCFlowLogsRole --policy-name FlowLogsPolicy --policy-document file:///tmp/flow-logs-policy.json

# Enable flow logs on your VPC (replace <YOUR_VPC_ID> and <YOUR_ACCOUNT_ID>)
aws ec2 create-flow-logs --resource-type VPC --resource-ids <YOUR_VPC_ID> --traffic-type ALL \
  --log-destination-type cloud-watch-logs --log-group-name /vpc/berta-flow-logs \
  --deliver-logs-permission-arn arn:aws:iam::<YOUR_ACCOUNT_ID>:role/VPCFlowLogsRole --region us-west-2
```

##### Add Network ACL Rules (defense in depth)

Add DENY rules to block common malicious ports on your **private subnet** Network ACL:

1. Go to **VPC Console** → **Network ACLs**
2. Select the NACL associated with your **private subnets**
3. Edit **Outbound Rules** - Add these DENY rules (lower rule numbers = higher priority):

   | Rule # | Type | Port | Destination | Action |
   |--------|------|------|-------------|--------|
   | 50 | TCP | 23 | 0.0.0.0/0 | DENY |
   | 51 | TCP | 445 | 0.0.0.0/0 | DENY |
   | 52 | TCP | 2323 | 0.0.0.0/0 | DENY |
   | 53 | TCP | 3389 | 0.0.0.0/0 | DENY |
   | 54 | TCP | 3306 | 0.0.0.0/0 | DENY |
   | 100 | ALL | ALL | 0.0.0.0/0 | ALLOW |

> [!NOTE]
> These rules block common ports used by malware for scanning (Telnet, SMB, RDP, MySQL). The CloudFormation template already includes restrictive security group rules, but Network ACLs provide an additional layer of protection.

### Step 4: Deploy the Application

Now you'll deploy Berta Scribe application using AWS CloudFormation:

**Option A: One-click Deployment (Recommended)**

1. **Click the deployment button**:
   
   | Service | Button |
   |---------|--------|
   | AWS     | [![AWS CloudFormation Launch Stack SVG Button](https://cdn.rawgit.com/buildkite/cloudformation-launch-stack-button-svg/master/launch-stack.svg)](https://us-west-2.console.aws.amazon.com/cloudformation/home?region=us-west-2#/stacks/quickcreate?stackName=berta-ai-scribe&templateURL=https://cf-templates-14rwubwevbsfc-us-west-2.s3.us-west-2.amazonaws.com/2026-01-07T190220.008Zweh-template.yaml)

2. **You'll be taken to the AWS CloudFormation console** where you'll see a form to fill out

**Option B: Custom Deployment**

If you need to modify the CloudFormation template (e.g., change instance sizes, add custom configurations), you can use the `template.yaml` file included in this repository. Download the template, make your modifications, and deploy it manually through the AWS CloudFormation console or AWS CLI instead of using the one-click deployment above.

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
   | **AuthDomainPrefix** |  Prefix part of the domain name | `yourdomain` |
   | **AccessTokenSecret** | JWT signing secret | Generate with `openssl rand -base64 32` |
   | **DBName** | Database name | `berta` |
   | **DBUser** | Database username | `berta_admin` |
   | **DBPassword** | Database password | Generate secure password |

3. **Deploy the stack**:
   - After filling in all parameters, scroll down
   - Check the box "I acknowledge that AWS CloudFormation might create IAM resources"
   - Click "Create stack"
   - The deployment will take 15-20 minutes

4. **Monitor the deployment**:
   - You'll see the CloudFormation stack creation in progress
   - Watch the "Events" tab to see resources being created
   - Wait for the stack status to show "CREATE_COMPLETE"
   - If deployment fails, check the "Events" tab for error details

5. **Get your application URLs**:
   - Once deployment is complete, go to the "Outputs" tab
   - Note down the **FrontendURL** - this is where you'll access the application

### Step 5: Post-Deployment Configuration

**Test the application**:
- Navigate to the Frontend URL
- Complete Cognito authentication
- Test audio recording and note generation

**Docker Images**: The CloudFormation template uses pre-built Docker images hosted on AWS Public ECR:
- **Frontend**: `public.ecr.aws/s9f8j1d3/berta-frontend:latest`
- **Backend**: `public.ecr.aws/s9f8j1d3/berta-backend:latest`

These images are automatically pulled during deployment and contain the latest stable versions of the application components.

**Updates**: When new releases are available, we update the images at the same URLs. To get the latest version, simply restart your ECS services:
```bash
aws ecs update-service --cluster berta-cluster-production --service berta-frontend-production --force-new-deployment
aws ecs update-service --cluster berta-cluster-production --service berta-backend-production --force-new-deployment
```

## Available Services Reference

You can view all available services and models by running:

```bash
cd web-api
python -m app.cli.list_services
```

This will show:
- **Transcription Services**: Parakeet MLX, OpenAI Whisper, WhisperX, AWS Transcribe
- **AI Services**: Ollama (with your installed models), OpenAI, AWS Bedrock, VLLM, LM Studio
- **Available Models**: 
  - **Ollama**: All models from your `ollama list` output
  - **LM Studio**: Only currently loaded models in LM Studio (must be loaded in LM Studio interface first)
  - **AWS Bedrock**: `us.meta.llama3-3-70b-instruct-v1:0`, `meta.llama3-1-405b-instruct-v1:0`, `meta.llama3-1-70b-instruct-v1:0`, `anthropic.claude-3-7-sonnet-20250219-v1:0`
  - **OpenAI**: `gpt-4o`, `gpt-3.5-turbo`
  - **VLLM**: Custom models you've configured

## Security

Berta Scribe implements robust security measures:

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

### External Service Dependencies

This project integrates with external services that users install and manage separately:

- **LM Studio**: Users install LM Studio independently. Users are responsible for compliance with LM Studio's terms of service and the licenses of any models they download through LM Studio.
- **OpenAI API**: Users provide their own API keys and are responsible for compliance with OpenAI's terms of service.
- **AWS Services**: When deployed on AWS, users are responsible for compliance with AWS terms of service.


### Attribution Notices

- **Built with Meta Llama 3.3** (as required by Meta's license)
- **Parakeet models by NVIDIA Corporation** (as required by CC-BY-4.0)

## Medical Disclaimer

> [!IMPORTANT]
> The Licensed Work is provided as a support tool only and is not intended as a substitute for the guidance or care of a health professional.

> [!CAUTION]
> The authors disclaim all warranties, expressed or implied. In particular, but without limitation, the Licensed Work is provided WITHOUT WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE, EITHER EXPRESSED OR IMPLIED. The user assumes all responsibility for losses, costs, claims, damages or liability of any kind whatsoever which may arise from use of the Licensed Work.