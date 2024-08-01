import tempfile
from typing import BinaryIO, Iterator
from functools import reduce

from pydub import AudioSegment
from pydub.silence import split_on_silence

from app.services.error_handling import AudioProcessingError
from app.services.measurement import get_file_size
from app.config import settings

def standardize_audio(original: BinaryIO, format: str = settings.AUDIO_FORMAT, bitrate: str = settings.AUDIO_BITRATE) -> BinaryIO:
    converted = tempfile.SpooledTemporaryFile()

    try:
        segment: AudioSegment = AudioSegment.from_file(original)
        segment.export(converted, bitrate=bitrate, format=format)

        return converted
    except Exception as e:
        raise AudioProcessingError(str(e))

def split_audio(audio_file: BinaryIO, max_size: int) -> list[BinaryIO]:
    size = get_file_size(audio_file)

    # Skip processing if file is already small enough.
    if size <= max_size:
        return [audio_file]

    try:
        audio: AudioSegment = AudioSegment.from_file(audio_file)
        loudness = audio.dBFS
        silence_threshold = loudness - 16
        duration_ms = len(audio)
        max_duration = duration_ms // (size // max_size + 1)
        
        # Split as much as possible on points of silence in the audio, using relative duration as a heuristic for relative file size.
        audio_chunks = split_on_silence(audio, silence_thresh=silence_threshold, min_silence_len=500, keep_silence=True)

        def cluster(chunks: list[AudioSegment]) -> Iterator[list[list[AudioSegment]]]:
            # Clusters chunks into sublists with combined duration less than max duration.
            start, *chunks = chunks
            cluster = [start]
            for chunk in chunks:
                if sum([len(c) for c in cluster]) + len(chunk) <= max_duration:
                    cluster.append(chunk)
                else:
                    yield cluster
                    cluster = [chunk]
            yield cluster

        if len(audio_chunks) > 0:
            # Merge clusters into audio segments.
            audio_segments: list[AudioSegment] = [reduce(lambda x, y: x + y, cluster) for cluster in cluster(audio_chunks)]
        else:
            # Failed to calibrate silence to loudness.
            audio_segments = [audio]

        # Convert segments into separate files.
        split_audio_files: list[BinaryIO] = [
            segment.export(tempfile.SpooledTemporaryFile(), bitrate=settings.AUDIO_BITRATE, format=settings.AUDIO_FORMAT) 
            for segment in audio_segments
        ]

        # Where necessary, split audio files without silence breaks.
        i = 0
        for file in split_audio_files:
            i = i + 1 # Next file position
            size = get_file_size(file)
            if size > max_size:
                audio: AudioSegment = AudioSegment.from_file(file)
                
                # Hard split.
                segments: list[AudioSegment] = [audio[x:(x + max_duration)] for x in range(0, len(audio), max_duration)]

                # Replace original with split files.
                split_audio_files[(i-1):i] = (
                    segment.export(tempfile.SpooledTemporaryFile(), bitrate=settings.AUDIO_BITRATE, format=settings.AUDIO_FORMAT)
                    for segment in segments
                )

                # Adjust file position to skip inserted files.
                i = i + (len(segments) - 1)

                # Close the removed file.
                file.close()

        return split_audio_files
    except Exception as e:
        raise AudioProcessingError(str(e))
