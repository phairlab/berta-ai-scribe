import tempfile
from typing import BinaryIO, Iterator
from functools import reduce

from pydub import AudioSegment
from pydub.silence import split_on_silence

from app.services.error_handling import AudioProcessingError
from app.services.measurement import minutes_to_ms
from app.services.logging import WebAPILogger
from app.config import settings

log = WebAPILogger(__name__)

def get_duration(audio: BinaryIO) -> int:
    segment = AudioSegment.from_file(audio)
    audio.seek(0)
    return len(segment)

def reformat_audio(original: BinaryIO, format: str, bitrate: str = settings.DEFAULT_AUDIO_BITRATE) -> tuple[BinaryIO, int]:
    "Returns a new audio file (and its format) with the given audio file converted into a standard format and bitrate."
    reformatted = tempfile.SpooledTemporaryFile()

    try:
        segment: AudioSegment = AudioSegment.from_file(original)
        duration = len(segment)
        segment.export(reformatted, bitrate=bitrate, format=format)

        return (reformatted, duration)
    except Exception as e:
        reformatted.close()
        raise AudioProcessingError(str(e))

def split_audio(audio_file: BinaryIO, max_duration_ms: int = minutes_to_ms(2), format: str = settings.DEFAULT_AUDIO_FORMAT, bitrate: str = settings.DEFAULT_AUDIO_BITRATE) -> Iterator[tuple[BinaryIO, str]]:
    """Returns files representing sequential segments of the input file,
    where each is split on a point of silence where possible
    and guaranteed to be at most the indicated max duration."""
    
    def _cluster(chunks: list[AudioSegment], max_duration_ms: int) -> Iterator[AudioSegment]:
        "Clusters audio chunks into segments with combined duration less than max duration."
        start, *chunks = chunks
        cluster = [start]
        
        for chunk in chunks:
            if sum([len(c) for c in cluster]) + len(chunk) <= max_duration_ms:
                cluster.append(chunk)
            else:
                # Convert chunks into cluster into a single audio segment and return.
                segment = reduce(lambda x, y: x + y, cluster)
                yield segment
                cluster = [chunk]
        
        segment = reduce(lambda x, y: x + y, cluster)
        yield segment

    def _hard_split(audio: AudioSegment, max_duration_ms: int) -> Iterator[AudioSegment]:
        "Splits the audio file without attempting to find points of silence for breaks"
        for x in range(0, len(audio), max_duration_ms):
            yield audio[x:(x + max_duration_ms)]

    try:
        audio: AudioSegment = AudioSegment.from_file(audio_file)

        log.info(f"Splitting audio into {len(audio) // max_duration_ms + 1} segments (length {len(audio)} ms; max length {max_duration_ms} ms)")

        # Don't process the file further if it is already within the allowed length.
        if len(audio) <= max_duration_ms:
            return audio_file

        avg_loudness = audio.dBFS
        silence_threshold = avg_loudness - 16
        
        # Split as much as possible on points of silence in the audio, using relative duration as a heuristic for relative file size.
        audio_chunks = split_on_silence(audio, silence_thresh=silence_threshold, min_silence_len=500, keep_silence=True)
        log.debug(f"Audio split into {len(audio_chunks)} on points of slience; max chunk length {max(len(chunk) for chunk in audio_chunks)} ms")

        if len(audio_chunks) == 0:
            # Failed to calibrate silence to loudness.
            audio_chunks = [audio]

        # Generate the audio segment files.
        for segment in _cluster(audio_chunks, max_duration_ms):            
            if len(segment) <= max_duration_ms:
                with tempfile.SpooledTemporaryFile() as file:
                    segment.export(file, bitrate=bitrate, format=format)
                    yield (file, format)
            else:
                # If the audio segment is still too long, hard-split it.
                for sub_segment in _hard_split(segment, max_duration_ms):
                    with tempfile.SpooledTemporaryFile() as file:
                        sub_segment.export(file, bitrate=bitrate, format=format)
                        yield (file, format)
    except Exception as e:
        raise AudioProcessingError(str(e))
