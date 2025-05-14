import os
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, Response
from fastapi.responses import FileResponse, StreamingResponse

import app.errors as errors
from app.config import settings, storage
from app.security import authenticate_session_cookie, useCookieUserSession

router = APIRouter()


@router.get(
    "/{recordingId}/download", 
    dependencies=[Depends(authenticate_session_cookie)],
    response_model=None
)
def get_recording_file(
    userSession: useCookieUserSession, *, recordingId: str
):
    # Check if we need to use S3 or local storage
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.S3_BUCKET_NAME:
        # Use S3 storage provider
        try:
            # Stream the file from S3
            file_stream = storage.stream_recording(userSession.username, f"{recordingId}.mp3")
            
            # Return a streaming response
            return StreamingResponse(
                content=file_stream,
                media_type="audio/mpeg",
                headers={"Content-Disposition": f"attachment; filename={recordingId}.mp3"}
            )
        except Exception as e:
            raise errors.NotFound(f"File not found: {str(e)}")
    else:
        # Use local file system
        filepath = Path(
            settings.RECORDINGS_FOLDER, userSession.username, f"{recordingId}.mp3"
        )

        if not os.path.isfile(filepath):
            raise errors.NotFound("File not found")

        return FileResponse(filepath)
