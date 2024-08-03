import os
import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.summarization import summarize_transcript
from app.services.measurement import Stopwatch
from app.services.error_handling import AIServiceTimeout, AIServiceError, APIError, BadRequest, TransientAIServiceError
from app.schemas import APIErrorReport, GeneratedNote

logger = logging.getLogger(__name__)
router = APIRouter()

PROMPTS_FOLDER = ".prompts"

class RequestData(BaseModel):
    transcript: str
    summaryType: str = "Full Visit"

@router.post("", response_model=GeneratedNote, responses={
    400: {"description": "Bad Request", "model": APIErrorReport},
    500: {"description": "Internal Server Error", "model": APIErrorReport},
    502: {"description": "AI Service Error", "model": APIErrorReport},
    503: {"description": "AI Service Unavailable", "model": APIErrorReport},
    504: {"description": "AI Service Timeout", "model": APIErrorReport},
})
async def create_summary(data: RequestData):
    summary_file = f"{data.summaryType}.txt"
    summary_path = os.path.join(PROMPTS_FOLDER, summary_file)
    
    if not os.path.exists(summary_path):
        error_message = f"{data.summaryType} is not a valid note type."
        logger.error(error_message)
        raise BadRequest(error_message).to_http_exception()

    try:        
        with open(summary_path, "r", errors="ignore") as f:
            prompt = f.read()

        with Stopwatch() as summarization_timer:
            summary = await summarize_transcript(data.transcript, prompt)

        logger.info(f"Summary generated in {summarization_timer.elapsed_ms / 1000:.2f}s")
    except (AIServiceError, AIServiceTimeout, TransientAIServiceError) as e:
        logger.error(e)
        raise e.to_http_exception()
    except Exception as e:
        logger.error(e)
        raise APIError(str(e)).to_http_exception()

    return GeneratedNote(
        text=summary,
        noteType=data.summaryType,
        serviceUsed="OpenAI API",
        modelUsed='gpt-4o',
        timeToGenerate=summarization_timer.elapsed_ms,
    )
