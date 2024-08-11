import os

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai import summarize_transcript
from app.services.measurement import ExecutionTimer
from app.services.error_handling import WebServiceError, BadRequest
from app.schemas import ErrorReport, GeneratedNote
from app.config import get_app_logger

logger = get_app_logger(__name__)

router = APIRouter()

PROMPTS_FOLDER = ".prompts"

class RequestData(BaseModel):
    transcript: str
    summaryType: str = "Full Visit"

@router.post("", response_model=GeneratedNote, responses={
    400: {"description": "Bad Request", "model": ErrorReport},
    500: {"description": "Internal Server Error", "model": ErrorReport},
    502: {"description": "External Service Error", "model": ErrorReport},
    503: {"description": "External Service Unavailable", "model": ErrorReport},
    504: {"description": "External Service Timeout", "model": ErrorReport},
})
async def create_summary(data: RequestData):
    summary_file = f"{data.summaryType}.txt"
    summary_path = os.path.join(PROMPTS_FOLDER, summary_file)

    logger.info(f"Generating summary: {data.summaryType}")    
    
    if not os.path.exists(summary_path):
        error = BadRequest(f"{data.summaryType} is not a valid note type.")
        logger.error(error)
        raise error.as_http_exception()

    try:        
        with open(summary_path, "r", errors="ignore") as f:
            prompt = f.read()

        with ExecutionTimer() as summarization_timer:
            summary = await summarize_transcript(data.transcript, prompt)

        logger.info(f"Summary generated in {summarization_timer.elapsed_ms / 1000:.2f}s")
    except WebServiceError as e:
        logger.error(e)
        raise e.as_http_exception()
    except Exception as e:
        logger.exception(e)
        raise WebServiceError(str(e)).as_http_exception()

    return GeneratedNote(text=summary, noteType=data.summaryType)
