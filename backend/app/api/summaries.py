import os
import logging
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.summarization import summarize_transcript
from app.schemas import GeneratedNote

logger = logging.getLogger(__name__)
router = APIRouter()

PROMPTS_FOLDER = ".prompts"

class RequestData(BaseModel):
    transcript: str
    summaryType: str = "Full Visit"

@router.post("/create")
async def create(data: RequestData):
    summary_file = f"{data.summaryType}.txt"
    summary_path = os.path.join(PROMPTS_FOLDER, summary_file)
    
    if not os.path.exists(summary_path):
        logger.error(f"The requested summary type '{data.summaryType}' is not valid.")
        raise HTTPException(status_code=400, detail="Invalid Summary Type.")
    
    with open(summary_path, "r", errors="ignore") as f:
        prompt = f.read()

    try:
        start_time = time.time()

        summary = await summarize_transcript(data.transcript, prompt)

        end_time = time.time()
        summarization_ms = int((end_time - start_time) * 1000)

        logger.info(f"Summary generated in {summarization_ms / 1000:.2f}s")
    except Exception as e:
        logger.error(f"Transcript summarization failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Transcript summarization failed.")

    return GeneratedNote(
        text=summary,
        noteType=data.summaryType,
        serviceUsed="OpenAI API",
        modelUsed='gpt-4o',
        timeToGenerate=summarization_ms,
    )
