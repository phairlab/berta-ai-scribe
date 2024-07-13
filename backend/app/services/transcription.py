from openai import AsyncOpenAI
import io

async def transcribe_audio(audio_buffer: io.BytesIO) -> str:
    openai = AsyncOpenAI()
    
    transcription = await openai.audio.transcriptions.create(model="whisper-1", file=audio_buffer)
    return transcription.text