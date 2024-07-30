import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.summarization import summarize_transcript
from app.services.measurement import Stopwatch
from app.services.error_handling import AIServiceTimeout, AIServiceError, TransientAIServiceError
from app.schemas import GeneratedNote

logger = logging.getLogger(__name__)
router = APIRouter()

PROMPTS_FOLDER = ".prompts"

class RequestData(BaseModel):
    transcript: str
    summaryType: str = "Full Visit"

@router.post("/create", response_model=GeneratedNote, responses={
    500: {"description": "Internal Server Error"},
    502: {"description": "Bad Gateway: Error reported by AI Service"},
    503: {"description": "Service Unavailable: AI Service temporarily unavailable"},
    504: {"description": "Gateway Timeout: AI Service timeout"},
})
async def create(data: RequestData):
    summary_file = f"{data.summaryType}.txt"
    summary_path = os.path.join(PROMPTS_FOLDER, summary_file)
    
    if not os.path.exists(summary_path):
        logger.error(f"The requested summary type '{data.summaryType}' is not valid.")
        raise HTTPException(status_code=400, detail="Invalid Summary Type.")
    
    with open(summary_path, "r", errors="ignore") as f:
        prompt = f.read()

    try:
        with Stopwatch() as summarization_timer:
            summary = await summarize_transcript(data.transcript, prompt)

        logger.info(f"Summary generated in {summarization_timer.elapsed_ms / 1000:.2f}s")
    except AIServiceTimeout as e:
        logger.error(f"AI Service timed out: {str(e)}")
        raise HTTPException(status_code=504, detail={
            "message": "Request timed out.",
            "errorDetails": str(e),
        })
    except TransientAIServiceError as e:
        logger.error(f"Request failed due to a temporary problem with the AI Service: {str(e)}")
        raise HTTPException(status_code=503, detail={
            "message": "The AI Service is temporarily unavailable.",
            "errorDetails": str(e),
        })
    except AIServiceError as e:
        logger.error(f"Request failed due to an error in the AI Service: {str(e)}")
        raise HTTPException(status_code=502, detail={
            "message": "An error occurred when communicating with the AI Service.",
            "errorDetails": str(e),
        })
    except Exception as e:
        logger.error(f"A server error occurred during request: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "message": "A server error occurred.",
            "errorDetails": str(e),
        })

    return GeneratedNote(
        text=summary,
        noteType=data.summaryType,
        serviceUsed="OpenAI API",
        modelUsed='gpt-4o',
        timeToGenerate=summarization_timer.elapsed_ms,
    )
