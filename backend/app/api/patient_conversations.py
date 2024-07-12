import logging
import time
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.audio_processing import standardize_audio, get_audio_duration_ms
from app.services.transcription import transcribe_audio
from app.services.summarization import summarize_transcript
from app.schemas import AudioInfo, Transcript, GeneratedNote, PatientConversation

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/generate_note")
async def generate_note(recording: UploadFile = File(...)):
    # Standardize the audio data.
    try:
        start_time = time.time()

        audio_buffer = standardize_audio(await recording.read(), recording.filename)
        audio_duration = get_audio_duration_ms(audio_buffer)
        audio_size = audio_buffer.getbuffer().nbytes

        end_time = time.time()
        audio_processing_ms = int((end_time - start_time) * 1000)
        
        logger.info(f"Audio file \"{recording.filename}\" processed in {audio_processing_ms / 1000:.2f}s")
    except Exception as e:
        logger.error(f"Audio processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while reading the audio file.")
    
    # Transcribe the audio.
    try:
        start_time = time.time()

        transcript = await transcribe_audio(audio_buffer)

        end_time = time.time()
        transcription_ms = int((end_time - start_time) * 1000)
        logger.info(f"Transcript generated in {transcription_ms / 1000:.2f}s")
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Transcription failed.")
    
    # Summarize the transcript.
    try:
        start_time = time.time()

        summary = await summarize_transcript(transcript)

        end_time = time.time()
        summarization_ms = int((end_time - start_time) * 1000)
        logger.info(f"Summary generated in {summarization_ms / 1000:.2f}s")
    except Exception as e:
        logger.error(f"Transcript summarization failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Transcript summarization failed.")

    return PatientConversation(
        audio=AudioInfo(duration=audio_duration, file_size=audio_size),
        transcript=Transcript(generation_time=transcription_ms, method='OpenAI Whisper', text=transcript),
        generated_note=GeneratedNote(generation_time=summarization_ms, model='gpt-4o', text=summary)
    )