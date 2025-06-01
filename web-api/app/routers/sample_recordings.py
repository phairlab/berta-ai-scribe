import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
import io

from fastapi import APIRouter, Depends, status, Response
from fastapi.responses import FileResponse, StreamingResponse

import app.errors as errors
import app.schemas as sch
from app.config import storage, settings
from app.security import authenticate_session

router = APIRouter(dependencies=[Depends(authenticate_session)])

SAMPLES_DIRECTORY = ".sample-recordings"


@router.get("")
def list_samples() -> list[sch.SampleRecording]:
    filenames = storage.list_sample_recordings()
    
    transcripts = {}
    try:
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.S3_BUCKET_NAME:
            try:
                transcript_stream = storage.get_sample_recording("transcripts.json")
                transcript_data = b""
                for chunk in transcript_stream:
                    transcript_data += chunk
                transcripts = json.loads(transcript_data.decode('utf-8'))
            except Exception as e:
                print(f"Error loading transcripts from S3: {str(e)}, falling back to local")
                with open(".sample-recordings/transcripts.json", "r", encoding="utf-8") as f:
                    transcripts = json.loads(f.read())
        else:
            with open(".sample-recordings/transcripts.json", "r", encoding="utf-8") as f:
                transcripts = json.loads(f.read())
    except Exception as e:
        print(f"Error loading transcripts: {str(e)}")
        transcripts = {f: f"Unable to load transcript for {f}" for f in filenames}

    samples = [
        sch.SampleRecording(filename=f, transcript=transcripts.get(f, f"No transcript for {f}")) 
        for f in filenames
    ]
    return samples


@router.get(
    "/{filename}/download",
    response_model=None,
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "Not Found",
            "model": sch.WebAPIError,
        },
    },
)
def download_sample(filename: str):
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.S3_BUCKET_NAME:
        try:
            file_stream = storage.get_sample_recording(filename)
            
            return StreamingResponse(
                content=file_stream,
                media_type="audio/mpeg",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        except Exception as e:
            raise errors.NotFound(f"Sample recording not found: {str(e)}")
    else:
        # Use local file system
        filepath = os.path.join(SAMPLES_DIRECTORY, filename)
        if not os.path.isfile(filepath):
            raise errors.NotFound("Recording not found")

        return FileResponse(filepath)


@router.get("/{filename}/transcript")
def get_sample_transcript(filename: str) -> sch.TextResponse:
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.S3_BUCKET_NAME:
        try:
            transcript_stream = storage.get_sample_recording("transcripts.json")
            transcript_data = b""
            for chunk in transcript_stream:
                transcript_data += chunk
            transcripts = json.loads(transcript_data.decode('utf-8'))
            
            if filename not in transcripts:
                raise errors.NotFound(f"Transcript for {filename} not found")
                
            return sch.TextResponse(text=transcripts[filename])
        except Exception as e:
            print(f"Error loading transcripts from S3: {str(e)}, falling back to local")
            try:
                with open(".sample-recordings/transcripts.json", "r", encoding="utf-8") as f:
                    transcripts = json.loads(f.read())
                    
                if filename not in transcripts:
                    raise errors.NotFound(f"Transcript for {filename} not found")
                    
                return sch.TextResponse(text=transcripts[filename])
            except Exception as nested_e:
                raise errors.NotFound(f"Transcript not found: {str(nested_e)}")
    else:
        try:
            with open(".sample-recordings/transcripts.json", "r", encoding="utf-8") as f:
                transcripts = json.loads(f.read())
            
            if filename not in transcripts:
                raise errors.NotFound(f"Transcript for {filename} not found")
                
            return sch.TextResponse(text=transcripts[filename])
        except Exception as e:
            raise errors.NotFound(f"Transcript not found: {str(e)}")
