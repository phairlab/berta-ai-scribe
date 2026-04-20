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
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.S3_BUCKET_NAME:
        s3_key = f"recordings/{userSession.username}/{recordingId}.mp3"
        
        try:
            s3_client = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            
            head_response = s3_client.head_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key
            )
            file_size = head_response['ContentLength']
            logger.debug(f"File size: {file_size} bytes")
            
            range_header = request.headers.get('Range')
            logger.debug(f"Range header: {range_header}")
            
            start = 0
            end = file_size - 1
            
            if range_header:
                range_match = re.search(r'bytes=(\d+)-(\d*)', range_header)
                if range_match:
                    start = int(range_match.group(1))
                    end_group = range_match.group(2)
                    if end_group:
                        end = min(int(end_group), file_size - 1)
                    else:
                        end = file_size - 1
                    logger.debug(f"Parsed range: start={start}, end={end}")
            
            content_length = end - start + 1
            
            byte_range = f'bytes={start}-{end}'
            logger.debug(f"Requesting S3 range: {byte_range}")
            
            headers = {
                'Accept-Ranges': 'bytes',
                'Content-Length': str(content_length),
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': f'attachment; filename={recordingId}.mp3',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization',
                'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type',
            }
            
            if range_header:
                headers['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            
            status_code = status.HTTP_206_PARTIAL_CONTENT if range_header else status.HTTP_200_OK
            
            async def s3_range_stream():
                params = {
                    'Bucket': settings.S3_BUCKET_NAME,
                    'Key': s3_key,
                }
                
                if range_header:
                    params['Range'] = byte_range
                
                response = s3_client.get_object(**params)
                
                body = response['Body']
                chunk_size = 8192  # 8KB chunks
                
                try:
                    data = body.read(chunk_size)
                    while data:
                        yield data
                        data = body.read(chunk_size)
                finally:
                    body.close()
            
            return StreamingResponse(
                content=s3_range_stream(),
                status_code=status_code,
                headers=headers
            )
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            logger.error(f"S3 error: {error_code} - {str(e)}")
            
            if error_code == 'NoSuchKey':
                raise errors.NotFound("Recording not found")
            else:
                raise errors.ExternalServiceError("AWS S3", str(e))
                
        except Exception as e:
            logger.error(f"Unexpected error serving recording: {str(e)}", exc_info=True)
            raise errors.ExternalServiceError("Audio Streaming", str(e))
    else:
        filepath = Path(
            settings.RECORDINGS_FOLDER, userSession.username, f"{recordingId}.mp3"
        )

        if not os.path.isfile(filepath):
            raise errors.NotFound("File not found")

        return FileResponse(filepath)

@router.options("/{recordingId}/download", dependencies=[Depends(authenticate_session_cookie)])
async def options_recording_download(recordingId: str):
    headers = {
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type',
    }
    return Response(status_code=200, headers=headers)