from typing import BinaryIO
from pathlib import Path

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

async def transcribe_audio(audio: BinaryIO, filename: str, content_type: str) -> sch.TranscriptionOutput:
    try:
        file_size = get_file_size(audio)

        # Transcription cannot be performed on files > 25 MB.        
        if file_size <= MB_to_bytes(25):
            # Process the file directly.
            transcription_output = await transcription_service.transcribe(audio, filename, content_type)
        else:
            log.warning(f"{bytes_to_MB(file_size):.2f} MB will be split and transcribed in segments")

            segments: list[sch.TranscriptionOutput] = []

            for (i, audio_segment) in enumerate(split_audio(audio)):
                log.debug(f"Transcribing segment {i+1}")

                (segment_file, audio_format) = audio_segment
                segment_content_type = f"audio/{audio_format}"
                segment_filename = f"{Path(filename).stem}-{i:>03}.{audio_format}"
                previous_transcript_segment = segments[i-1].transcript if i > 1 else None

                segment = await transcription_service.transcribe(segment_file, segment_filename, segment_content_type, prompt=previous_transcript_segment)                        
                segments.append(segment)

            transcription_output = sch.TranscriptionOutput(
                transcript=" ".join([s.transcript for s in segments]),
                service=segments[0].service,
            )

    except (errors.ExternalServiceError, errors.AudioProcessingError) as e:
        raise e    
    
    return transcription_output

PLAINTEXT_FORMATTING_DIRECTIVE = """
Format your responses plain text only, do not include any markdown syntax.
After a heading or subheading line, the section content should follow on the immediate next line.
""".strip()

MARKDOWN_FORMATTING_DIRECTIVE = """
You are very good at precisely following formatting instructions.
Format your response in markdown, using level one headings for section headers (e.g. # Header) and bullets only.
Use dashes (-) for bullets, and don't nest bullets with other bullet list items.
Escape characters that could be misinterpreted as markdown by inserting a backslash before them.
Do not include an overall header for the entire response, only individual section headers are required.
""".strip()

def generate_note(model: str, instructions: str, transcript: str, output_type: sch.NoteOutputType = "Markdown") -> sch.GenerationOutput:    
    # Configure prompt messages.
    messages = [
        {"role": "system", "content": MARKDOWN_FORMATTING_DIRECTIVE if output_type == "Markdown" else PLAINTEXT_FORMATTING_DIRECTIVE},
        {"role": "system", "content": instructions},
        {"role": "user", "content": transcript}
    ]

    # Return the draft note segments.
    try:
        return generative_ai_service.complete(model, messages)
    except errors.ExternalServiceError as e:
        raise e
