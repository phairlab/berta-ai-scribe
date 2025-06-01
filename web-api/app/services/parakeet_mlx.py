from pathlib import Path
from typing import BinaryIO
import os, tempfile

from parakeet_mlx import from_pretrained           
from app.schemas import TranscriptionOutput
from app.services.adapters import TranscriptionService
from app.errors import ExternalServiceError

MODEL_ID = "mlx-community/parakeet-tdt-0.6b-v2"    

class ParakeetMLXTranscriptionService(TranscriptionService):
    def __init__(self, model_id: str | Path = MODEL_ID):
        try:
            self.model = from_pretrained(str(model_id))
        except Exception as e:
            raise ExternalServiceError("Parakeet MLX", f"Model load failed: {e}")

    @property
    def service_name(self) -> str:
        return "Parakeet MLX"

    async def transcribe(
        self,
        audio_file: BinaryIO,
        filename: str,
        content_type: str,
        prompt: str | None = None,
    ) -> TranscriptionOutput:

        if audio_file is None:
            raise ExternalServiceError(self.service_name, "audio_file is None")

        with tempfile.NamedTemporaryFile(delete=False,
                                         suffix=Path(filename).suffix) as tmp:
            tmp.write(audio_file.read())
            tmp_path = tmp.name

        try:
            result = self.model.transcribe(tmp_path)   # library takes the path
        finally:
            os.unlink(tmp_path)

        return TranscriptionOutput(
            transcript=result.text,
            service=self.service_name,
        )