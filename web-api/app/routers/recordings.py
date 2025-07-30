import os
import re
import logging
from pathlib import Path
import boto3
from botocore.exceptions import ClientError

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import FileResponse, StreamingResponse

import app.errors as errors
from app.config import settings, storage
from app.security import authenticate_session_cookie, useCookieUserSession

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{recordingId}/download", dependencies=[Depends(authenticate_session_cookie)], response_model=None)
async def get_recording_file(
    request: Request,
    userSession: useCookieUserSession, 
    *, 
    recordingId: str
):
    filename = f"{recordingId}.mp3"
    
    try:
        # Use the storage provider's stream_recording method
        file_stream = storage.stream_recording(userSession.username, filename)
        
        # Get file size if using S3
        file_size = None
        if hasattr(storage.storage_provider, 's3_client') and storage.storage_provider.s3_client:
            try:
                s3_key = f"recordings/{userSession.username}/{filename}"
                head_response = storage.storage_provider.s3_client.head_object(
                    Bucket=storage.storage_provider.bucket_name,
                    Key=s3_key
                )
                file_size = head_response['ContentLength']
                logger.debug(f"File size: {file_size} bytes")
            except Exception as e:
                logger.debug(f"Could not get file size: {e}")
        
        # Handle range requests
        range_header = request.headers.get('Range')
        logger.debug(f"Range header: {range_header}")
        
        headers = {
            'Accept-Ranges': 'bytes',
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': f'attachment; filename={recordingId}.mp3',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Content-Length, Accept-Encoding, Authorization',
            'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type',
        }
        
        # For S3 with range support
        if range_header and hasattr(storage.storage_provider, 's3_client') and storage.storage_provider.s3_client and file_size:
            range_match = re.search(r'bytes=(\d+)-(\d*)', range_header)
            if range_match:
                start = int(range_match.group(1))
                end_group = range_match.group(2)
                end = int(end_group) if end_group else file_size - 1
                end = min(end, file_size - 1)
                
                content_length = end - start + 1
                headers['Content-Length'] = str(content_length)
                headers['Content-Range'] = f'bytes {start}-{end}/{file_size}'
                
                # Create a new range-specific stream
                s3_key = f"recordings/{userSession.username}/{filename}"
                byte_range = f'bytes={start}-{end}'
                
                async def s3_range_stream():
                    params = {
                        'Bucket': storage.storage_provider.bucket_name,
                        'Key': s3_key,
                        'Range': byte_range
                    }
                    
                    response = storage.storage_provider.s3_client.get_object(**params)
                    body = response['Body']
                    chunk_size = 8192
                    
                    try:
                        data = body.read(chunk_size)
                        while data:
                            yield data
                            data = body.read(chunk_size)
                    finally:
                        body.close()
                
                return StreamingResponse(
                    content=s3_range_stream(),
                    status_code=status.HTTP_206_PARTIAL_CONTENT,
                    headers=headers
                )
        
        # For regular streaming (no range or local storage)
        if file_size:
            headers['Content-Length'] = str(file_size)
        
        return StreamingResponse(
            content=file_stream,
            status_code=status.HTTP_200_OK,
            headers=headers
        )
        
    except Exception as e:
        logger.error(f"Error serving recording: {str(e)}", exc_info=True)
        if "not found" in str(e).lower() or "NoSuchKey" in str(e):
            raise errors.NotFound("Recording not found")
        raise errors.ExternalServiceError("Storage Service", str(e))

@router.options("/{recordingId}/download", dependencies=[Depends(authenticate_session_cookie)])
async def options_recording_download(recordingId: str):
    headers = {
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Content-Length, Accept-Encoding, Authorization',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type',
    }
    return Response(status_code=200, headers=headers)