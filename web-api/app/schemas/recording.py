import json

from pydantic import BaseModel

import app.services.db as db

class Recording(BaseModel):
    id: str
    mediaType: str | None
    fileSize: int | None
    duration: int | None
    waveformPeaks: list[float] | None
    transcript: str | None = None
    audioConversionTaskId: str | None
    transcriptionTaskId: str | None

    @staticmethod
    def from_db_record(record: db.Recording):
        return Recording(
            id=record.id,
            mediaType=record.media_type,
            fileSize=record.file_size,
            duration=record.duration,
            waveformPeaks=json.loads(record.waveform_peaks) if record.waveform_peaks is not None else None,
            transcript=record.transcript,
            audioConversionTaskId=record.audio_conversion_task_id,
            transcriptionTaskId=record.transcription_task_id,
        )
