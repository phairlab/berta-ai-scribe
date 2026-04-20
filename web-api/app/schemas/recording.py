from pydantic import BaseModel


class Recording(BaseModel):
    id: str
    mediaType: str | None
    fileSize: int | None
    duration: int
    waveformPeaks: list[float] | None
    transcript: str | None = None
