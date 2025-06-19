import json
from typing import BinaryIO
import tempfile
import os
from pathlib import Path
import warnings
from pydantic import BaseModel, Field
import logging
import sys

from app.errors import (
    ExternalServiceError,
    ExternalServiceInterruption,
    ExternalServiceTimeout,
)
from app.schemas import TranscriptionOutput
from app.services.adapters import TranscriptionService
from app.config import settings

logger = logging.getLogger(__name__)

# Make WhisperX imports optional
try:
    import whisperx
    import torch
    WHISPERX_AVAILABLE = True
except ImportError:
    WHISPERX_AVAILABLE = False
    logger.warning("WhisperX dependencies not available. This is normal in AWS environment.")

class WhisperXConfig(BaseModel):
    """Configuration for WhisperX ASR model."""
    device: str = "cuda"
    device_index: int = 0
    batch_size: int = 16
    compute_type: str = "float32"
    model_version: str = "large-v3"

    def validate_device(self) -> bool:
        """Validate device availability and compatibility."""
        if not WHISPERX_AVAILABLE:
            return True

        if self.device == "cpu":
            logger.info("Using CPU for WhisperX transcription")
            logger.warning("CPU transcription will be significantly slower than GPU. Consider using CUDA if available.")
            return True

        if self.device == "cuda":
            if not torch.cuda.is_available():
                raise RuntimeError("CUDA is not available. Please check your NVIDIA drivers or use CPU instead.")

            try:
                if self.device_index >= torch.cuda.device_count():
                    raise RuntimeError(f"CUDA device {self.device_index} not available")

                torch.cuda.set_device(self.device_index)
                test_tensor = torch.zeros(1, device=f"cuda:{self.device_index}")
                del test_tensor
                logger.info(f"Successfully validated CUDA device {self.device_index}")
                return True

            except Exception as e:
                raise RuntimeError(f"CUDA validation failed: {str(e)}")

        return True

class WhisperXTranscriptionService(TranscriptionService):
    def __init__(self):
        if not WHISPERX_AVAILABLE:
            logger.info("WhisperX is not available. This service will not be used in AWS environment.")
            return

        self.config = WhisperXConfig(
            device=settings.WHISPERX_DEVICE.split(":")[0] if ":" in settings.WHISPERX_DEVICE else settings.WHISPERX_DEVICE,
            device_index=int(settings.WHISPERX_DEVICE.split(":")[1]) if ":" in settings.WHISPERX_DEVICE and settings.WHISPERX_DEVICE.split(":")[0] == "cuda" else 0,
            batch_size=1 if settings.WHISPERX_DEVICE.split(":")[0] == "cpu" else 16,
            compute_type="float32",
            model_version="large-v3"
        )
        
        self.config.validate_device()
        
        self.model = None
        self._load_model()

    @property
    def service_name(self):
        return "WhisperX"

    def _load_model(self):
        if not WHISPERX_AVAILABLE:
            return

        if self.model is None:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    
                if self.config.device == "cpu":
                    logger.info("Loading WhisperX model on CPU")
                    self.model = whisperx.load_model(
                        self.config.model_version,
                        "cpu",
                        compute_type=self.config.compute_type
                    )
                else:
                    logger.info(f"Loading WhisperX model on CUDA device {self.config.device_index}")
                    self.model = whisperx.load_model(
                        self.config.model_version,
                        self.config.device,
                        device_index=self.config.device_index,
                        compute_type=self.config.compute_type
                    )
            except Exception as e:
                device_type = "CPU" if self.config.device == "cpu" else "GPU"
                raise ExternalServiceError(
                    self.service_name,
                    f"Failed to load WhisperX model on {device_type}: {str(e)}."
                )

    async def transcribe(
        self,
        audio_file: BinaryIO,
        filename: str,
        content_type: str,
        prompt: str | None = None,
    ) -> TranscriptionOutput:
        if not WHISPERX_AVAILABLE:
            raise ExternalServiceError(
                self.service_name,
                "WhisperX is not available in this environment. Please use Amazon Transcribe instead."
            )

        temp_file_path = None

        try:
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=Path(filename).suffix
            ) as temp_file:
                try:
                    content = audio_file.read()
                    if not content:
                        logger.error("Audio file is empty")
                        raise ExternalServiceError(
                            self.service_name, "Audio file is empty"
                        )
                    temp_file.write(content)
                    temp_file_path = temp_file.name
                    logger.info(f"Saved temporary audio file to {temp_file_path}")
                except Exception as e:
                    logger.error(f"Failed to read/write audio file: {str(e)}")
                    raise ExternalServiceError(
                        self.service_name, f"Failed to read audio file: {str(e)}"
                    )

            try:
                try:
                    logger.info("Loading audio file...")
                    audio = whisperx.load_audio(temp_file_path)
                    if audio is None or len(audio) == 0:
                        logger.error("Audio loading returned empty result")
                        raise ValueError("Audio loading returned empty result")
                    logger.info(f"Audio loaded successfully, shape: {audio.shape}")
                except Exception as e:
                    logger.error(f"Failed to load audio file: {str(e)}")
                    raise ExternalServiceError(
                        self.service_name, f"Failed to load audio file: {str(e)}"
                    )

                try:
                    logger.info(
                        f"Transcribing audio on {self.config.device} (batch_size={self.config.batch_size})"
                    )

                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        result = self.model.transcribe(
                            audio, batch_size=self.config.batch_size
                        )

                    if not result:
                        logger.error("Transcription returned empty result")
                        raise ValueError("Transcription returned empty result")
                    
                    if "segments" not in result:
                        logger.error(f"Transcription result missing segments: {result}")
                        raise ValueError("Transcription returned invalid result")

                    logger.info(f"Transcription result: {json.dumps(result, indent=2)}")

                except Exception as e:
                    if "memory" in str(e).lower() and self.config.batch_size > 1:
                        logger.warning(
                            f"Memory error, reducing batch size from {self.config.batch_size} to {self.config.batch_size // 2}"
                        )
                        try:
                            result = self.model.transcribe(
                                audio, batch_size=self.config.batch_size // 2
                            )
                            if not result or "segments" not in result:
                                logger.error(f"Transcription with reduced batch size returned invalid result: {result}")
                                raise ValueError(
                                    "Transcription returned invalid result"
                                )
                        except Exception as retry_e:
                            logger.error(f"Transcription failed with reduced batch size: {str(retry_e)}")
                            raise ExternalServiceError(
                                self.service_name,
                                f"Transcription failed with reduced batch size: {str(retry_e)}",
                            )
                    else:
                        logger.error(f"Failed to transcribe audio: {str(e)}")
                        raise ExternalServiceError(
                            self.service_name, f"Failed to transcribe audio: {str(e)}"
                        )

                segments = result.get("segments", [])
                if not segments:
                    logger.warning("No segments found in transcription result")
                    transcript = ""
                else:
                    text_chunks = [
                        segment["text"].strip()
                        for segment in segments
                        if isinstance(segment, dict)
                        and "text" in segment
                        and segment["text"].strip()
                    ]
                    transcript = " ".join(text_chunks)

                logger.info(
                    f"Transcription completed successfully. Length: {len(transcript)} characters"
                )

            finally:
                if temp_file_path and os.path.exists(temp_file_path):
                    try:
                        os.unlink(temp_file_path)
                        logger.info(f"Cleaned up temporary file {temp_file_path}")
                    except Exception as e:
                        logger.warning(
                            f"Failed to clean up temporary file {temp_file_path}: {str(e)}"
                        )

            return TranscriptionOutput(
                transcript=transcript,
                service=self.service_name,
            )

        except ExternalServiceError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during transcription: {str(e)}", exc_info=True)
            raise ExternalServiceError(
                self.service_name, f"Unexpected error during transcription: {str(e)}"
            )
