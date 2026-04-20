from pathlib import Path
from typing import BinaryIO

import app.errors as errors
import app.schemas as sch
from app.config.ai import transcription_service
from app.logging import WebAPILogger
from app.services.audio_processing import split_audio
from app.utility.conversion import MB_to_bytes, bytes_to_MB, get_file_size

log = WebAPILogger(__name__)


async def transcribe_audio(
    audio: BinaryIO, filename: str, content_type: str
) -> sch.TranscriptionOutput:
    try:
        file_size = get_file_size(audio)

        # Transcription cannot be performed on files > 25 MB.
        if file_size <= MB_to_bytes(25):
            # Process the file directly.
            transcription_output = await transcription_service.transcribe(
                audio, filename, content_type
            )
        else:
            log.warning(
                f"{bytes_to_MB(file_size):.2f} MB"
                "will be split and transcribed in segments"
            )

            segments: list[sch.TranscriptionOutput] = []

            for i, audio_segment in enumerate(split_audio(audio)):
                log.debug(f"Transcribing segment {i+1}")

                (segment_file, audio_format) = audio_segment
                segment_content_type = f"audio/{audio_format}"
                segment_filename = f"{Path(filename).stem}-{i:>03}.{audio_format}"
                previous_transcript_segment = (
                    segments[i - 1].transcript if i > 1 else None
                )

                segment = await transcription_service.transcribe(
                    segment_file,
                    segment_filename,
                    segment_content_type,
                    prompt=previous_transcript_segment,
                )
                segments.append(segment)

            transcription_output = sch.TranscriptionOutput(
                transcript=" ".join([s.transcript for s in segments]),
                service=segments[0].service,
            )

    except (errors.ExternalServiceError, errors.AudioProcessingError) as e:
        raise e

    return transcription_output
