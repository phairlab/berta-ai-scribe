from app.config import (
    is_openai_supported,
    is_aws_transcribe_supported,
    is_aws_bedrock_supported,
    is_vllm_supported,
    settings,
)
from app.services.adapters import GenerativeAIService, TranscriptionService
from app.services.openai import OpenAIGenerativeAIService, OpenAITranscriptionService
from app.services.prompt_service import prompt_service
from app.services.whisperx import WhisperXTranscriptionService
from app.services.amazon_transcribe import AmazonTranscribeService
from app.services.aws_bedrock import BedrockGenerativeAIService
from app.services.ollama import OllamaGenerativeAIService
from app.services.parakeet_mlx import ParakeetMLXTranscriptionService
from app.services.vllm_service import VLLMService


note_format_prompts = prompt_service.get_note_format_prompts()
PLAINTEXT_NOTE_SYSTEM_PROMPT = note_format_prompts.get('plaintext', '')
MARKDOWN_NOTE_SYSTEM_PROMPT = note_format_prompts.get('markdown', '')
LABEL_TRANSCRIPT_SYSTEM_PROMPT = prompt_service.get_label_transcript_prompt()


transcription_service: TranscriptionService
match settings.TRANSCRIPTION_SERVICE:
    case "OpenAI Whisper":
        transcription_service = OpenAITranscriptionService()
    case "WhisperX":
        transcription_service = WhisperXTranscriptionService(
            settings.LOCAL_WHISPER_SERVICE_URL or "http://localhost:9000"
        )
    case "AWS Transcribe":
        transcription_service = AmazonTranscribeService(
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
    case "Parakeet MLX":
        transcription_service = ParakeetMLXTranscriptionService()
    case _:
        raise ValueError(
            f"{settings.TRANSCRIPTION_SERVICE} is not a valid transcription service"
        )

generative_ai_services: list[GenerativeAIService] = []

match settings.GENERATIVE_AI_SERVICE:
    case "Ollama":
        generative_ai_services.append(OllamaGenerativeAIService())
    case "OpenAI":
        if is_openai_supported:
            generative_ai_services.append(OpenAIGenerativeAIService())
    case "AWS Bedrock":
        if is_aws_bedrock_supported:
            generative_ai_services.append(
                BedrockGenerativeAIService(region_name=settings.AWS_REGION)
            )
    case "VLLM":
        if is_vllm_supported:
            api_url = f"http://{settings.VLLM_SERVER_NAME}:{settings.VLLM_SERVER_PORT}/v1"
            generative_ai_services.append(VLLMService(api_url=api_url))
    case _:
        raise ValueError(
            f"{settings.GENERATIVE_AI_SERVICE} is not a valid generative AI service"
        )

if not any(generative_ai_services):
    raise Exception("No generative AI services have been configured")
