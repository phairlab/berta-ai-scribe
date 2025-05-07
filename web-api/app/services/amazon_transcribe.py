import json
import uuid
import asyncio
from typing import BinaryIO

import aiohttp
import boto3
import botocore.exceptions

from app.errors import (
    ExternalServiceError,
    ExternalServiceInterruption,
    ExternalServiceTimeout,
)
from app.schemas import TranscriptionOutput
from app.services.adapters import TranscriptionService


class AmazonTranscribeService(TranscriptionService):
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

        # Initialize the AWS client
        self._client = boto3.client(
            "transcribe",
            region_name=self._region_name,
            aws_access_key_id=self._aws_access_key_id,
            aws_secret_access_key=self._aws_secret_access_key,
        )

        # Initialize S3 client for file upload
        self._s3_client = boto3.client(
            "s3",
            region_name=self._region_name,
            aws_access_key_id=self._aws_access_key_id,
            aws_secret_access_key=self._aws_secret_access_key,
        )

    @property
    def service_name(self):
        return "AmazonTranscribe"

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

        Args:
            audio_file: Audio file object
            filename: Name of the audio file
            content_type: MIME type of the audio file
            prompt: Optional prompt for context (not used by Amazon Transcribe but kept for interface consistency)
            language_code: Language code for transcription

        Returns:
            TranscriptionOutput object containing the transcript
        """
        try:
            # Import settings here to avoid circular imports
            from app.config import settings

            # Use S3_BUCKET_NAME from settings
            bucket_name = settings.S3_BUCKET_NAME

            # Generate a unique job name and S3 key
            job_name = f"transcription-{uuid.uuid4()}"
            s3_key = f"{job_name}/{filename}"

            # Upload the audio file to S3
            self._s3_client.upload_fileobj(audio_file, bucket_name, s3_key)

            # Get the media file URI
            media_uri = f"s3://{bucket_name}/{s3_key}"

            # Start the transcription job
            response = self._client.start_transcription_job(
                TranscriptionJobName=job_name,
                Media={"MediaFileUri": media_uri},
                MediaFormat=self._get_media_format(filename),
                LanguageCode=language_code,
            )

            # Wait for the transcription job to complete
            while True:
                status = self._client.get_transcription_job(
                    TranscriptionJobName=job_name
                )
                if status["TranscriptionJob"]["TranscriptionJobStatus"] in [
                    "COMPLETED",
                    "FAILED",
                ]:
                    break
                await asyncio.sleep(1)

            if status["TranscriptionJob"]["TranscriptionJobStatus"] == "COMPLETED":
                # Get the transcript URL
                transcript_uri = status["TranscriptionJob"]["Transcript"][
                    "TranscriptFileUri"
                ]

                # Download the transcript
                async with aiohttp.ClientSession() as session:
                    async with session.get(transcript_uri) as response:
                        if response.status == 200:
                            content = await response.read()
                            try:
                                # First try to parse it as JSON
                                transcript_json = json.loads(content)
                                transcript = transcript_json["results"]["transcripts"][
                                    0
                                ]["transcript"]
                            except (json.JSONDecodeError, KeyError) as e:
                                # If that fails, try to decode it as text and then parse
                                try:
                                    content_text = content.decode("utf-8")
                                    transcript_json = json.loads(content_text)
                                    transcript = transcript_json["results"][
                                        "transcripts"
                                    ][0]["transcript"]
                                except (
                                    UnicodeDecodeError,
                                    json.JSONDecodeError,
                                    KeyError,
                                ) as e:
                                    raise ExternalServiceError(
                                        self.service_name,
                                        f"Failed to parse transcript: {str(e)}",
                                    )
                        else:
                            raise ExternalServiceError(
                                self.service_name,
                                f"Failed to download transcript: {response.status}",
                            )

            # Clean up the S3 file after transcription
            self._s3_client.delete_object(Bucket=bucket_name, Key=s3_key)

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
