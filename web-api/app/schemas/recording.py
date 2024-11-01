import json

from pydantic import BaseModel

import app.services.db as db

class Recording(BaseModel):
    filename: str
    mediaType: str
    duration: int
    waveformPeaks: list[float] | None
    transcript: str | None = None
    transcriptionService: str | None = None
    timeToTranscribe: int | None = None

    @staticmethod
    def from_db_record(record: db.Recording):
        return Recording(
            filename=record.filename,
            mediaType=record.media_type,
            duration=record.duration,
            waveformPeaks=json.loads(record.waveform_peaks) if record.waveform_peaks is not None else None,
            transcript=record.transcript,
            transcriptionService=record.transcription_service,
            timeToTranscribe=record.time_to_transcribe,
        )
