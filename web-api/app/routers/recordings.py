import os
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

import app.services.error_handling as errors
from app.services.security import useCookieUserSession
from app.config import settings

router = APIRouter()

@router.get("/{recordingId}")
def get_recording_file(
    userSession: useCookieUserSession,
    *,
    recordingId: str
) -> FileResponse:
    filepath = Path(settings.RECORDINGS_FOLDER, userSession.username, f"{recordingId}.mp3")

    if not os.path.isfile(filepath):
        raise errors.NotFound("File not found")
    
    return FileResponse(filepath)