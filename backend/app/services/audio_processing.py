import io
from pathlib import Path
from pydub import AudioSegment
from app.config import settings

def standardize_audio(data: bytes, filename: str) -> io.BytesIO:
    original = io.BytesIO(data)

    converted = io.BytesIO()
    AudioSegment.from_file(original).export(converted, bitrate=settings.AUDIO_BITRATE, format='mp3')
    converted.name = f"{Path(filename).stem}.mp3"
    
    return converted

def get_audio_duration_ms(audio_buffer: io.BytesIO) -> int:
    audio = AudioSegment.from_file(audio_buffer)
    return int(audio.duration_seconds * 1000)