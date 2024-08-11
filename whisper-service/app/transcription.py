import os
import tempfile
from typing import BinaryIO

import whisperx

from app.config import settings

whisperx_model = whisperx.load_model(settings.MODEL_VERSION, settings.DEVICE, compute_type=settings.COMPUTE_TYPE)

def transcribe_audio(audio_file: BinaryIO, filename: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(filename)[1]) as temp_file:
        contents = audio_file.read()
        temp_file.write(contents)
        temp_file_path = temp_file.name

        # Load audio using the temporary file path
        audio = whisperx.load_audio(temp_file_path)
        
        # Transcribe
        raw_text = whisperx_model.transcribe(audio, batch_size=settings.BATCH_SIZE)
        text_chunks = [segment["text"].strip() for segment in raw_text["segments"]]
        transcript = " ".join(text_chunks)

        return transcript