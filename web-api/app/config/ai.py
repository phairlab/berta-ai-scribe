from app.config import (
    is_azure_cognitive_supported,
    is_cortex_supported,
    is_openai_supported,
    is_aws_transcribe_supported,
    is_aws_bedrock_supported,
    settings,
)
from app.services.adapters import GenerativeAIService, TranscriptionService
from app.services.azure_cognitive import AzureCognitiveGenerativeAIService
from app.services.cortex import CortexGenerativeAIService
from app.services.openai import OpenAIGenerativeAIService, OpenAITranscriptionService
from app.services.whisperx import WhisperXTranscriptionService
from app.services.amazon_transcribe import AmazonTranscribeService
from app.services.aws_bedrock import BedrockGenerativeAIService


with open(
    f"{settings.PROMPTS_FOLDER}/note-formats/plaintext.txt", "r", encoding="utf-8"
) as f:
    PLAINTEXT_NOTE_SYSTEM_PROMPT = f.read()

with open(
    f"{settings.PROMPTS_FOLDER}/note-formats/markdown.txt", "r", encoding="utf-8"
) as f:
    MARKDOWN_NOTE_SYSTEM_PROMPT = f.read()

with open(
    f"{settings.PROMPTS_FOLDER}/label-transcript.txt", "r", encoding="utf-8"
) as f:
    LABEL_TRANSCRIPT_SYSTEM_PROMPT = f.read()


transcription_service: TranscriptionService
match settings.TRANSCRIPTION_SERVICE:
    case "OpenAI Whisper":
        transcription_service = OpenAITranscriptionService()
    case "WhisperX":
        transcription_service = WhisperXTranscriptionService(
            settings.LOCAL_WHISPER_SERVICE_URL
        )
    case "AWS Transcribe":
        transcription_service = AmazonTranscribeService(
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
    case _:
        raise ValueError(
            f"{settings.TRANSCRIPTION_SERVICE} is not a valid transcription service"
        )

generative_ai_services: list[GenerativeAIService] = []

if is_cortex_supported:
    generative_ai_services.append(CortexGenerativeAIService())

if is_azure_cognitive_supported:
    generative_ai_services.append(AzureCognitiveGenerativeAIService())
elif is_openai_supported:
    generative_ai_services.append(OpenAIGenerativeAIService())

if is_aws_bedrock_supported:
    generative_ai_services.append(
        BedrockGenerativeAIService(region_name=settings.AWS_REGION)
    )

if not any(generative_ai_services):
    raise Exception("No generative AI services have been configured")
