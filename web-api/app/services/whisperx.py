import json
from typing import BinaryIO

import aiohttp

from app.errors import (
    ExternalServiceError,
    ExternalServiceInterruption,
    ExternalServiceTimeout,
)
from app.schemas import TranscriptionOutput
from app.services.adapters import TranscriptionService


class WhisperXTranscriptionService(TranscriptionService):
    def __init__(self, service_url):
        self._service_url = service_url

    @property
    def service_name(self):
        return "WhisperX"

    async def transcribe(
        self,
        audio_file: BinaryIO,
        filename: str,
        content_type: str,
        prompt: str | None = None,
    ) -> TranscriptionOutput:
        async with aiohttp.ClientSession(self._service_url) as httpSession:
            form_data = aiohttp.FormData()
            form_data.add_field(
                "audio",
                audio_file.read(),
                filename=filename,
                content_type="multipart/form-data",
            )

            try:
                async with httpSession.post(
                    "/transcribe-audio", data=form_data
                ) as response:
                    if response.status == 200:
                        response = await response.json()
                        transcript = response["text"]
                    else:
                        error = await response.json()
                        error_message = error["detail"]
                        raise ExternalServiceError(
                            self.service_name, json.dumps(error_message)
                        )
            except aiohttp.ServerTimeoutError as e:
                raise ExternalServiceTimeout(self.service_name, str(e))
            except aiohttp.ServerConnectionError as e:
                raise ExternalServiceInterruption(self.service_name, str(e))
            except (
                aiohttp.ClientPayloadError,
                aiohttp.ClientResponseError,
                aiohttp.RedirectClientError,
            ) as e:
                raise ExternalServiceError(self.service_name, str(e))

        return TranscriptionOutput(
            transcript=transcript,
            service=self.service_name,
        )
