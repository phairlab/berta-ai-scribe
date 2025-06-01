import json
import uuid
import asyncio
from typing import BinaryIO, List
import io
import os
from pathlib import Path

import aiohttp
import boto3
import botocore.exceptions
from pydub import AudioSegment
from botocore.config import Config

from app.errors import (
    ExternalServiceError,
    ExternalServiceInterruption,
    ExternalServiceTimeout,
)
from app.schemas import TranscriptionOutput
from app.services.adapters import TranscriptionService
from app.logging import WebAPILogger

log = WebAPILogger(__name__)


class AmazonTranscribeService(TranscriptionService):
    
    def __init__(self, region_name, aws_access_key_id=None, aws_secret_access_key=None):
        self._region_name = region_name
        self._aws_access_key_id = aws_access_key_id
        self._aws_secret_access_key = aws_secret_access_key

        client_config = Config(
            retries={"max_attempts": 10, "mode": "adaptive"},
            max_pool_connections=20,
            connect_timeout=5,
            read_timeout=180
        )
        
        self._client = boto3.client(
            "transcribe",
            region_name=self._region_name,
            aws_access_key_id=self._aws_access_key_id,
            aws_secret_access_key=self._aws_secret_access_key,
            config=client_config
        )

        self._s3_client = boto3.client(
            "s3",
            region_name=self._region_name,
            aws_access_key_id=self._aws_access_key_id,
            aws_secret_access_key=self._aws_secret_access_key,
            config=client_config
        )
        

        self._bucket_name = None

    @property
    def service_name(self):
        return "AmazonTranscribe"

    async def optimize_audio(self, audio_file: BinaryIO, filename: str) -> tuple[BinaryIO, str]:
        try:
            audio_copy = io.BytesIO()
            audio_file.seek(0)
            audio_copy.write(audio_file.read())
            audio_file.seek(0)
            audio_copy.seek(0)
            
            # Load with pydub
            audio = AudioSegment.from_file(audio_copy)
            
            # Convert to mono if stereo
            if audio.channels > 1:
                log.info("Converting stereo to mono for transcription optimization")
                audio = audio.set_channels(1)
                
            # Convert to 16kHz sample rate
            if audio.frame_rate != 16000:
                log.info(f"Converting {audio.frame_rate}Hz to 16kHz for transcription optimization")
                audio = audio.set_frame_rate(16000)
                
            # Normalize audio levels
            audio = audio.normalize()
            log.info("Audio normalized for optimal transcription")
            
            # Export as WAV
            output = io.BytesIO()
            audio.export(
                output, 
                format="wav",
                parameters=["-ar", "16000", "-ac", "1"]
            )
            output.seek(0)
            log.info("Audio optimized for AWS Transcribe")
            
            return output, "wav"
        except Exception as e:
            log.warning(f"Audio optimization failed: {str(e)}. Using original file.")
            audio_file.seek(0)
            return audio_file, filename.split('.')[-1].lower()

    async def split_long_audio(self, audio_file: BinaryIO, filename: str, max_segments: int = 8) -> List[tuple[BinaryIO, str]]:
        try:
            
            audio_copy = io.BytesIO()
            audio_file.seek(0)
            audio_copy.write(audio_file.read())
            audio_file.seek(0)
            audio_copy.seek(0)
            
            # Load the audio
            audio = AudioSegment.from_file(audio_copy)
            total_duration = len(audio)
            
          
            if total_duration < 60000:  
                return [await self.optimize_audio(audio_file, filename)]
            
           
            segment_count = min(
                max(2, total_duration // 180000),  
                max_segments
            )
            
            log.info(f"Splitting {total_duration/1000:.1f}s audio into {segment_count} segments for parallel processing")
            
            segment_duration = total_duration // segment_count
            segments = []
            
            for i in range(segment_count):
                start_time = i * segment_duration
                end_time = min((i + 1) * segment_duration, total_duration)
                
                segment = audio[start_time:end_time]
                
                if segment.channels > 1:
                    segment = segment.set_channels(1)
                if segment.frame_rate != 16000:
                    segment = segment.set_frame_rate(16000)
                segment = segment.normalize()
                
                segment_file = io.BytesIO()
                segment.export(segment_file, format="wav")
                segment_file.seek(0)
                
                segments.append((segment_file, "wav"))
                
            log.info(f"Created {len(segments)} optimized audio segments")
            return segments
            
        except Exception as e:
            log.error(f"Error splitting audio: {str(e)}")
            
            return [await self.optimize_audio(audio_file, filename)]

    async def transcribe(
        self,
        audio_file: BinaryIO,
        filename: str,
        content_type: str,
        prompt: str | None = None,
        language_code: str = "en-US",
    ) -> TranscriptionOutput:
        
        from app.config import settings

        if not self._bucket_name:
            self._bucket_name = settings.S3_BUCKET_NAME
            
        # Track cleanup items
        cleanup_items = []
        
        try:
            audio_file.seek(0, 2)  
            file_size = audio_file.tell()
            audio_file.seek(0)  
            
            log.info(f"Processing audio file: {filename}, size: {file_size} bytes")
            
            if file_size > 10 * 1024 * 1024:
                return await self._transcribe_long_audio(
                    audio_file, filename, content_type, language_code
                )
            
            optimized_audio, format_extension = await self.optimize_audio(audio_file, filename)
            
            job_name = f"transcription-{uuid.uuid4()}"
            s3_key = f"{job_name}/audio.{format_extension}"
            
            cleanup_items.append(s3_key)

            log.info(f"Uploading audio to S3: bucket={self._bucket_name}, key={s3_key}")

            
            transfer_config = boto3.s3.transfer.TransferConfig(
                multipart_threshold=8 * 1024 * 1024,  # 8MB
                max_concurrency=10,
                use_threads=True
            )
            
            self._s3_client.upload_fileobj(
                optimized_audio, 
                self._bucket_name, 
                s3_key,
                Config=transfer_config
            )

            
            media_uri = f"s3://{self._bucket_name}/{s3_key}"

            
            log.info(f"Starting AWS Transcribe job: {job_name}, media_uri={media_uri}")
            response = self._client.start_transcription_job(
                TranscriptionJobName=job_name,
                Media={"MediaFileUri": media_uri},
                MediaFormat=format_extension,
                LanguageCode=language_code,
                Settings={
                    "ShowSpeakerLabels": False,
                    "ShowAlternatives": False
                }
            )

            transcript = await self._wait_for_transcription(job_name)
            
            log.info(f"Transcription completed successfully for job: {job_name}")

            return TranscriptionOutput(
                transcript=transcript,
                service=self.service_name,
            )

        except botocore.exceptions.ClientError as e:
            import traceback
            log.error(f"Exception in transcribe (ClientError): {e}\n{traceback.format_exc()}")
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_message = e.response.get("Error", {}).get("Message", str(e))

            if error_code == "LimitExceededException":
                raise ExternalServiceTimeout(self.service_name, error_message)
            elif error_code in ["ServiceUnavailable", "InternalFailure"]:
                raise ExternalServiceInterruption(self.service_name, error_message)
            else:
                raise ExternalServiceError(self.service_name, error_message)
        except botocore.exceptions.ConnectTimeoutError as e:
            raise ExternalServiceTimeout(self.service_name, str(e))
        except botocore.exceptions.EndpointConnectionError as e:
            raise ExternalServiceInterruption(self.service_name, str(e))
        except Exception as e:
            import traceback
            log.error(f"Exception in transcribe: {e}\n{traceback.format_exc()}")
            raise ExternalServiceError(self.service_name, str(e))
        finally:
            for s3_key in cleanup_items:
                try:
                    log.info(f"Cleaning up S3 object: bucket={self._bucket_name}, key={s3_key}")
                    self._s3_client.delete_object(Bucket=self._bucket_name, Key=s3_key)
                    log.info(f"Successfully deleted S3 object: {s3_key}")
                except Exception as cleanup_error:
                    log.error(f"Failed to cleanup S3 object {s3_key}: {str(cleanup_error)}")
            
    async def _transcribe_long_audio(
        self,
        audio_file: BinaryIO,
        filename: str,
        content_type: str,
        language_code: str = "en-US",
    ) -> TranscriptionOutput:
        
        segments = await self.split_long_audio(audio_file, filename)
        
        if len(segments) == 1:
            return await self.transcribe(
                segments[0][0], 
                f"{Path(filename).stem}.{segments[0][1]}", 
                f"audio/{segments[0][1]}",
                None, 
                language_code
            )
        
        tasks = []
        cleanup_items = []  
        
        try:
            log.info(f"Starting parallel transcription of {len(segments)} segments")
            
            for i, (segment_file, format_ext) in enumerate(segments):
                job_name = f"segment-{uuid.uuid4()}"
                s3_key = f"{job_name}/segment-{i}.{format_ext}"
                cleanup_items.append(s3_key)
                
                log.info(f"Uploading segment {i} to S3: bucket={self._bucket_name}, key={s3_key}")
                
                transfer_config = boto3.s3.transfer.TransferConfig(
                    multipart_threshold=8 * 1024 * 1024,
                    max_concurrency=10,
                    use_threads=True
                )
                
                self._s3_client.upload_fileobj(
                    segment_file,
                    self._bucket_name,
                    s3_key,
                    Config=transfer_config
                )
                
                media_uri = f"s3://{self._bucket_name}/{s3_key}"
                
                log.info(f"Starting transcription job for segment {i}: {job_name}")
                
                
                self._client.start_transcription_job(
                    TranscriptionJobName=job_name,
                    Media={"MediaFileUri": media_uri},
                    MediaFormat=format_ext,
                    LanguageCode=language_code,
                    Settings={
                        "ShowSpeakerLabels": False,
                        "ShowAlternatives": False,
                    }
                )
                
                
                task = self._wait_for_transcription(job_name)
                tasks.append(task)
            
            log.info(f"Waiting for {len(tasks)} transcription jobs to complete")
            segment_transcripts = await asyncio.gather(*tasks)
            
            combined_transcript = self._combine_transcripts(segment_transcripts)
            
            log.info("All segments transcribed and combined successfully")
            
            return TranscriptionOutput(
                transcript=combined_transcript,
                service=f"{self.service_name} (Parallel)"
            )
            
        except Exception as e:
            log.error(f"Error in parallel transcription: {str(e)}")
            raise
        finally:
            log.info(f"Starting cleanup of {len(cleanup_items)} S3 objects")
            for s3_key in cleanup_items:
                try:
                    log.info(f"Cleaning up S3 object: bucket={self._bucket_name}, key={s3_key}")
                    self._s3_client.delete_object(Bucket=self._bucket_name, Key=s3_key)
                    log.info(f"Successfully deleted S3 object: {s3_key}")
                except Exception as cleanup_error:
                    log.error(f"Failed to cleanup S3 object {s3_key}: {str(cleanup_error)}")

    async def _wait_for_transcription(self, job_name: str) -> str:
        max_attempts = 60
        attempts = 0
        base_delay = 2
        max_delay = 20
        
        log.info(f"Waiting for transcription job to complete: {job_name}")
        
        while attempts < max_attempts:
            try:
                status = self._client.get_transcription_job(
                    TranscriptionJobName=job_name
                )
                
                job_status = status["TranscriptionJob"]["TranscriptionJobStatus"]
                
                if job_status == "COMPLETED":
                    log.info(f"Transcription job completed: {job_name}")
                    # Get the transcript URL
                    transcript_uri = status["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
                    
                    async with aiohttp.ClientSession() as session:
                        async with session.get(transcript_uri) as response:
                            if response.status == 200:
                                content = await response.read()
                                try:
                                    # Parse the transcript JSON
                                    transcript_json = json.loads(content)
                                    return transcript_json["results"]["transcripts"][0]["transcript"]
                                except (json.JSONDecodeError, KeyError) as e:
                                    # Fallback parsing approach
                                    content_text = content.decode("utf-8")
                                    transcript_json = json.loads(content_text)
                                    return transcript_json["results"]["transcripts"][0]["transcript"]
                            else:
                                raise ExternalServiceError(
                                    self.service_name,
                                    f"Failed to download transcript: {response.status}"
                                )
                elif job_status == "FAILED":
                    error_reason = status["TranscriptionJob"].get("FailureReason", "Unknown error")
                    log.error(f"Transcription job failed: {job_name}, reason: {error_reason}")
                    raise ExternalServiceError(
                        self.service_name,
                        f"Transcription job failed: {error_reason}"
                    )
                elif job_status in ["IN_PROGRESS", "QUEUED"]:
                    log.debug(f"Transcription job {job_name} status: {job_status}, attempt {attempts + 1}")
                
                delay = min(max_delay, base_delay * (1.5 ** min(attempts, 8)))
                await asyncio.sleep(delay)
                attempts += 1
                
            except Exception as e:
                log.error(f"Error checking transcription job status: {job_name}, {str(e)}")
                attempts += 1
                if attempts < max_attempts:
                    await asyncio.sleep(base_delay)
                else:
                    raise
            
        log.error(f"Transcription job timed out: {job_name}")
        raise ExternalServiceTimeout(
            self.service_name,
            f"Transcription job {job_name} timed out after {max_attempts} attempts"
        )
        
    def _combine_transcripts(self, transcripts: List[str]) -> str:
        """
        Combine segment transcripts intelligently for natural flow.
        
        Args:
            transcripts: List of transcript segments
            
        Returns:
            Combined transcript
        """
        if not transcripts:
            return ""
            
        if len(transcripts) == 1:
            return transcripts[0]
            
        combined = transcripts[0].strip()
        
        for i in range(1, len(transcripts)):
            current = transcripts[i].strip()
            if not current:
                continue
                
            prev_ends_with_punct = combined[-1] in '.!?;:' if combined else False
            curr_starts_with_upper = current[0].isupper() if current else False
            
            if curr_starts_with_upper and not prev_ends_with_punct:
                combined += ". " + current
            else:
                combined += " " + current
                
        return combined

    def _get_media_format(self, filename: str) -> str:
        """
        Determine the media format from the filename.

        Args:
            filename: Name of the audio file

        Returns:
            Media format string that Amazon Transcribe accepts
        """
        extension = filename.split(".")[-1].lower()
        format_mapping = {
            "mp3": "mp3",
            "mp4": "mp4",
            "wav": "wav",
            "flac": "flac",
            "ogg": "ogg",
            "amr": "amr",
            "webm": "webm",
        }

        return format_mapping.get(
            extension, "mp3"
        )