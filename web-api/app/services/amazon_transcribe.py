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
    """Optimized Amazon Transcribe service with support for long audio files."""
    
    def __init__(self, region_name, aws_access_key_id=None, aws_secret_access_key=None):
        """
        Initialize the Amazon Transcribe service.

        Args:
            region_name: AWS region name
            aws_access_key_id: AWS access key ID (optional if using IAM roles)
            aws_secret_access_key: AWS secret access key (optional if using IAM roles)
        """
        self._region_name = region_name
        self._aws_access_key_id = aws_access_key_id
        self._aws_secret_access_key = aws_secret_access_key

        # Initialize the AWS client with optimized configuration
        client_config = boto3.config.Config(
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

        # Initialize S3 client with optimized configuration
        self._s3_client = boto3.client(
            "s3",
            region_name=self._region_name,
            aws_access_key_id=self._aws_access_key_id,
            aws_secret_access_key=self._aws_secret_access_key,
            config=client_config
        )
        
        # Cache bucket name
        self._bucket_name = None

    @property
    def service_name(self):
        return "AmazonTranscribe"

    async def optimize_audio(self, audio_file: BinaryIO, filename: str) -> tuple[BinaryIO, str]:
        """
        Optimize audio for AWS Transcribe processing.
        - Converts to 16kHz mono WAV (AWS preferred format)
        - Normalizes audio levels
        """
        try:
            # Create a temporary copy for processing
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
            # If optimization fails, return original file
            log.warning(f"Audio optimization failed: {str(e)}. Using original file.")
            audio_file.seek(0)
            return audio_file, filename.split('.')[-1].lower()

    async def split_long_audio(self, audio_file: BinaryIO, filename: str, max_segments: int = 8) -> List[tuple[BinaryIO, str]]:
        """
        Split a long audio file into segments for parallel processing.
        
        Args:
            audio_file: Original audio file
            filename: Original filename
            max_segments: Maximum number of segments to create
            
        Returns:
            List of (audio_file, format) tuples ready for processing
        """
        try:
            # Make a copy to avoid consuming the original file
            audio_copy = io.BytesIO()
            audio_file.seek(0)
            audio_copy.write(audio_file.read())
            audio_file.seek(0)
            audio_copy.seek(0)
            
            # Load the audio
            audio = AudioSegment.from_file(audio_copy)
            total_duration = len(audio)
            
            # Don't split short files
            if total_duration < 60000:  # < 1 minute
                return [await self.optimize_audio(audio_file, filename)]
            
            # Determine optimal segment count based on duration
            # Between 2-8 segments depending on length
            segment_count = min(
                max(2, total_duration // 180000),  # Aim for 3-minute segments
                max_segments
            )
            
            log.info(f"Splitting {total_duration/1000:.1f}s audio into {segment_count} segments for parallel processing")
            
            # Split file evenly by duration
            segment_duration = total_duration // segment_count
            segments = []
            
            # Create each segment
            for i in range(segment_count):
                start_time = i * segment_duration
                end_time = min((i + 1) * segment_duration, total_duration)
                
                # Extract segment
                segment = audio[start_time:end_time]
                
                # Optimize segment
                if segment.channels > 1:
                    segment = segment.set_channels(1)
                if segment.frame_rate != 16000:
                    segment = segment.set_frame_rate(16000)
                segment = segment.normalize()
                
                # Export segment as WAV
                segment_file = io.BytesIO()
                segment.export(segment_file, format="wav")
                segment_file.seek(0)
                
                segments.append((segment_file, "wav"))
                
            log.info(f"Created {len(segments)} optimized audio segments")
            return segments
            
        except Exception as e:
            log.error(f"Error splitting audio: {str(e)}")
            # If splitting fails, return the optimized original file
            return [await self.optimize_audio(audio_file, filename)]

    async def transcribe(
        self,
        audio_file: BinaryIO,
        filename: str,
        content_type: str,
        prompt: str | None = None,
        language_code: str = "en-US",
    ) -> TranscriptionOutput:
        """
        Transcribe audio using Amazon Transcribe service.
        For long audio files, this automatically splits and processes in parallel.

        Args:
            audio_file: Audio file object
            filename: Name of the audio file
            content_type: MIME type of the audio file
            prompt: Optional prompt for context (not used by Amazon Transcribe)
            language_code: Language code for transcription

        Returns:
            TranscriptionOutput object containing the transcript
        """
        try:
            # Import settings here to avoid circular imports
            from app.config import settings

            # Cache bucket name
            if not self._bucket_name:
                self._bucket_name = settings.S3_BUCKET_NAME
            
            # Check file size to determine processing approach
            audio_file.seek(0, 2)  # Seek to end
            file_size = audio_file.tell()
            audio_file.seek(0)  # Reset position
            
            # For files > 10MB, use parallel processing
            if file_size > 10 * 1024 * 1024:
                return await self._transcribe_long_audio(
                    audio_file, filename, content_type, language_code
                )
            
            # For smaller files, use standard processing with optimized audio
            optimized_audio, format_extension = await self.optimize_audio(audio_file, filename)
            
            # Generate a unique job name and S3 key
            job_name = f"transcription-{uuid.uuid4()}"
            s3_key = f"{job_name}/audio.{format_extension}"

            # Upload the audio file to S3 with optimized transfer settings
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

            # Get the media file URI
            media_uri = f"s3://{self._bucket_name}/{s3_key}"

            # Start the transcription job with optimized settings
            response = self._client.start_transcription_job(
                TranscriptionJobName=job_name,
                Media={"MediaFileUri": media_uri},
                MediaFormat=format_extension,
                LanguageCode=language_code,
                Settings={
                    "ShowSpeakerLabels": False,
                    "MaxSpeakerLabels": 2,
                    "ShowAlternatives": False,
                    "MaxAlternatives": 1,
                    "VocabularyFilterMethod": "mask",
                    "IdentifyLanguage": False
                }
            )

            # Use adaptive polling to wait for completion
            transcript = await self._wait_for_transcription(job_name)
            
            # Clean up S3 file in background
            asyncio.create_task(self._clean_up_s3(self._bucket_name, s3_key))

            return TranscriptionOutput(
                transcript=transcript,
                service=self.service_name,
            )

        except botocore.exceptions.ClientError as e:
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
            raise ExternalServiceError(self.service_name, str(e))
            
    async def _transcribe_long_audio(
        self,
        audio_file: BinaryIO,
        filename: str,
        content_type: str,
        language_code: str = "en-US",
    ) -> TranscriptionOutput:
        """
        Process long audio files by splitting and transcribing in parallel.
        
        Args:
            audio_file: Audio file object
            filename: Name of the audio file
            content_type: MIME type of the audio file
            language_code: Language code for transcription
            
        Returns:
            TranscriptionOutput with combined transcript
        """
        # Split the audio into segments
        segments = await self.split_long_audio(audio_file, filename)
        
        if len(segments) == 1:
            # If we only have one segment, process normally
            return await self.transcribe(
                segments[0][0], 
                f"{Path(filename).stem}.{segments[0][1]}", 
                f"audio/{segments[0][1]}",
                None, 
                language_code
            )
        
        # Create transcription tasks for each segment
        tasks = []
        segment_keys = []
        
        try:
            log.info(f"Starting parallel transcription of {len(segments)} segments")
            
            for i, (segment_file, format_ext) in enumerate(segments):
                # Generate unique job name for this segment
                job_name = f"segment-{uuid.uuid4()}"
                s3_key = f"{job_name}/segment-{i}.{format_ext}"
                segment_keys.append((self._bucket_name, s3_key))
                
                # Upload segment to S3
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
                
                # Start transcription job
                media_uri = f"s3://{self._bucket_name}/{s3_key}"
                
                self._client.start_transcription_job(
                    TranscriptionJobName=job_name,
                    Media={"MediaFileUri": media_uri},
                    MediaFormat=format_ext,
                    LanguageCode=language_code,
                    Settings={
                        "ShowSpeakerLabels": False,
                        "ShowAlternatives": False,
                        "MaxAlternatives": 1,
                        "VocabularyFilterMethod": "mask",
                        "IdentifyLanguage": False
                    }
                )
                
                # Create task to wait for this job
                task = self._wait_for_transcription(job_name)
                tasks.append(task)
            
            # Wait for all transcription jobs to complete
            segment_transcripts = await asyncio.gather(*tasks)
            
            # Combine segments with intelligent joining
            combined_transcript = self._combine_transcripts(segment_transcripts)
            
            return TranscriptionOutput(
                transcript=combined_transcript,
                service=f"{self.service_name} (Parallel)"
            )
            
        finally:
            # Clean up all S3 objects in background
            for bucket, key in segment_keys:
                asyncio.create_task(self._clean_up_s3(bucket, key))

    async def _wait_for_transcription(self, job_name: str) -> str:
        """
        Wait for a transcription job to complete with adaptive polling.
        
        Args:
            job_name: Transcription job name
            
        Returns:
            Transcript text
        """
        # Adaptive polling with exponential backoff
        max_attempts = 60
        attempts = 0
        base_delay = 2
        max_delay = 20
        
        while attempts < max_attempts:
            status = self._client.get_transcription_job(
                TranscriptionJobName=job_name
            )
            
            job_status = status["TranscriptionJob"]["TranscriptionJobStatus"]
            
            if job_status == "COMPLETED":
                # Get the transcript URL
                transcript_uri = status["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
                
                # Download the transcript
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
                raise ExternalServiceError(
                    self.service_name,
                    f"Transcription job failed: {error_reason}"
                )
            
            # Calculate delay with exponential backoff
            delay = min(max_delay, base_delay * (1.5 ** min(attempts, 8)))
            await asyncio.sleep(delay)
            attempts += 1
            
        # If we get here, we've exceeded max attempts
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
            
        # Clean and combine segments
        combined = transcripts[0].strip()
        
        for i in range(1, len(transcripts)):
            current = transcripts[i].strip()
            if not current:
                continue
                
            # Check if previous segment ended with punctuation
            prev_ends_with_punct = combined[-1] in '.!?;:' if combined else False
            # Check if current segment starts with uppercase (likely new sentence)
            curr_starts_with_upper = current[0].isupper() if current else False
            
            if curr_starts_with_upper and not prev_ends_with_punct:
                # Add period if needed between segments
                combined += ". " + current
            else:
                # Just add space
                combined += " " + current
                
        return combined
        
    async def _clean_up_s3(self, bucket: str, key: str):
        """Clean up S3 objects without blocking the main process"""
        try:
            self._s3_client.delete_object(Bucket=bucket, Key=key)
        except Exception as e:
            log.warning(f"Failed to clean up S3 object {key}: {str(e)}")

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
        )  # Default to mp3 if format is unknown