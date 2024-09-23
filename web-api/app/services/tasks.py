from typing import BinaryIO
from pathlib import Path

from sqlalchemy.orm import Session as SQLAlchemySession

import app.schemas as sch
import app.services.openai as openai
import app.services.whisperx as whisperx
import app.services.cortex as cortex
import app.services.error_handling as errors
from app.services.measurement import MB_to_bytes, bytes_to_MB, get_file_size
from app.services.audio_processing import split_audio
from app.services.logging import WebAPILogger
from app.config import settings

log = WebAPILogger(__name__)

if settings.TRANSCRIPTION_SERVICE not in ["OPENAI", "LOCAL_WHISPER"]:
    raise Exception(f"Invalid transcription service: {settings.TRANSCRIPTION_SERVICE}")

if settings.GENERATIVE_AI_SERVICE not in ["OPENAI", "SNOWFLAKE_CORTEX"]:
    raise Exception(f"Invalid generative AI service: {settings.GENERATIVE_AI_SERVICE}")

transcription_service = openai if settings.TRANSCRIPTION_SERVICE == "OPENAI" else whisperx
generative_ai_service = openai if settings.GENERATIVE_AI_SERVICE == "OPENAI" else cortex

async def transcribe_audio(database: SQLAlchemySession, userSession: sch.WebAPISession, audio: BinaryIO, filename: str, content_type: str) -> str:
    try:
        file_size = get_file_size(audio)

        # Transcription cannot be performed on files > 25 MB.        
        if file_size <= MB_to_bytes(25):
            # Process the file directly.
            transcript = await transcription_service.transcribe(database, userSession, audio, filename, content_type)
        else:
            log.warning(f"{bytes_to_MB(file_size):.2f} MB will be split and transcribed in segments")

            transcript_segments = []

            for (i, audio_segment) in enumerate(split_audio(audio)):
                log.debug(f"Transcribing segment {i+1}")

                (segment_file, audio_format) = audio_segment
                segment_content_type = f"audio/{audio_format}"
                segment_filename = f"{Path(filename).stem}-{i:>03}.{audio_format}"
                previous_transcript_segment = transcript_segments[i-1] if i > 1 else None

                transcript_segment = await transcription_service.transcribe(segment_file, segment_filename, segment_content_type, prompt=previous_transcript_segment)                        
                transcript_segments.append(transcript_segment)

            transcript = " ".join(transcript_segments)

    except (errors.ExternalServiceError, errors.AudioProcessingError) as e:
        raise e    
    
    return transcript

def generate_note(database: SQLAlchemySession, userSession: sch.WebAPISession, tag: str, model: str, instructions: str, transcript: str) -> str:    
    # Configure prompt messages.
    messages = [
        {"role": "system", "content": "Format your responses plain text only, do not include any markdown syntax. Use asterisks before and after header text to indicate headers."},
        {"role": "user", "content": instructions},
        {"role": "user", "content": transcript}
    ]

    # Return the draft note segments.
    try:
        return generative_ai_service.complete(database, userSession, tag, model, messages)
    except errors.ExternalServiceError as e:
        raise e
