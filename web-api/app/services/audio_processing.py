import io
import json
import os
import subprocess
import tempfile
from collections.abc import Iterator
from functools import reduce
from pathlib import Path
from typing import BinaryIO, cast

from pydub import AudioSegment
from pydub.silence import split_on_silence

from app.config import settings
from app.errors import AudioProcessingError
from app.logging import WebAPILogger
from app.utility.conversion import minutes_to_ms

log = WebAPILogger(__name__)

DEFAULT_MAX_SPLIT_DURATION = minutes_to_ms(2)


def get_duration(audio: BinaryIO) -> int:
    segment = AudioSegment.from_file(audio)
    audio.seek(0)
    return len(segment)


def reformat_audio(
    original: BinaryIO, format: str, bitrate: str = settings.DEFAULT_AUDIO_BITRATE
) -> tuple[BinaryIO, int]:
    """
    Returns a new audio file (and its duration) with the given audio file
    converted into a standard format and bitrate.
    """
    reformatted = io.BytesIO()

    try:
        segment: AudioSegment = AudioSegment.from_file(original)
        duration = len(segment)

        segment.export(reformatted, bitrate=bitrate, format=format)

        return (reformatted, duration)
    except Exception as e:
        reformatted.close()
        raise AudioProcessingError(str(e))


def append_audio(
    original: BinaryIO,
    new: BinaryIO,
    format: str,
    bitrate: str = settings.DEFAULT_AUDIO_BITRATE,
) -> tuple[BinaryIO, int]:
    """
    Returns a new audio file (and its duration) combining
    the two input audio files separated by 1 second silence.
    """
    combined = io.BytesIO()

    try:
        original_segment: AudioSegment = AudioSegment.from_file(original)
        new_segment: AudioSegment = AudioSegment.from_file(new)

        combined_segment = original_segment + AudioSegment.silent() + new_segment
        duration = len(combined_segment)

        combined_segment.export(combined, bitrate=bitrate, format=format)

        return (combined, duration)
    except Exception as e:
        combined.close()
        raise AudioProcessingError(str(e))


def compute_peaks(audio: BinaryIO) -> list[float]:
    temp_audio_filename = Path(tempfile.gettempdir(), f"{os.urandom(24).hex()}.mp3")
    peaks_filename = Path(tempfile.gettempdir(), f"{os.urandom(24).hex()}.json")

    try:
        with open(temp_audio_filename, mode="wb+") as temp_audio_file:
            temp_audio_file.write(audio.read())

        subprocess.run(
            [
                "audiowaveform",
                "-i",
                temp_audio_filename,
                "-o",
                peaks_filename,
                "--pixels-per-second",
                "20",
                "--bits",
                "8",
            ],
            stdout=subprocess.DEVNULL,  # Suppress
            stderr=subprocess.DEVNULL,  # Suppress
        )

        with open(peaks_filename, mode="r", encoding="utf-8") as peaks_file:
            waveform_data = peaks_file.read()
    finally:
        audio.seek(0)

        if os.path.exists(temp_audio_filename):
            os.remove(temp_audio_filename)

        if os.path.exists(peaks_filename):
            os.remove(peaks_filename)

    waveform_json = json.loads(waveform_data)
    peaks: list[float] = waveform_json["data"]

    # Round to 2 decimal places for normalization.
    digits = 2

    max_val = float(max(peaks))
    normalized_peaks: list[float] = []

    for x in peaks:
        normalized_peaks.append(round(x / max_val if max_val != 0 else x, digits))

    return normalized_peaks


def split_audio(
    audio_file: BinaryIO,
    max_duration_ms: int = DEFAULT_MAX_SPLIT_DURATION,
    format: str = settings.DEFAULT_AUDIO_FORMAT,
    bitrate: str = settings.DEFAULT_AUDIO_BITRATE,
) -> Iterator[tuple[BinaryIO, str]]:
    """Returns files representing sequential segments of the input file,
    where each is split on a point of silence where possible
    and guaranteed to be at most the indicated max duration."""

    def _cluster(
        chunks: list[AudioSegment], max_duration_ms: int
    ) -> Iterator[AudioSegment]:
        """
        Clusters audio chunks into segments with combined duration
        less than max duration.
        """

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

    def _hard_split(
        audio: AudioSegment, max_duration_ms: int
    ) -> Iterator[AudioSegment]:
        "Splits the audio file without attempting to find points of silence for breaks"
        for x in range(0, len(audio), max_duration_ms):
            yield AudioSegment(audio[x : (x + max_duration_ms)])

    try:
        audio: AudioSegment = AudioSegment.from_file(audio_file)

        log.info(
            f"Splitting audio into {len(audio) // max_duration_ms + 1} segments"
            f" (length {len(audio)} ms; max length {max_duration_ms} ms)"
        )

        # Don't process the file further if it is already within the allowed length.
        if len(audio) <= max_duration_ms:
            return audio_file

        avg_loudness = audio.dBFS
        silence_threshold = int(avg_loudness - 16)

        # Split as much as possible on points of silence in the audio,
        # using relative duration as a heuristic for relative file size.
        audio_chunks = [
            AudioSegment(chunk)
            for chunk in split_on_silence(
                audio,
                silence_thresh=silence_threshold,
                min_silence_len=500,
                keep_silence=True,
            )
        ]
        log.debug(
            f"Audio split into {len(audio_chunks)} on points of slience;"
            f" max chunk length {max(len(chunk) for chunk in audio_chunks)} ms"
        )

        if len(audio_chunks) == 0:
            # Failed to calibrate silence to loudness.
            audio_chunks = [audio]

        # Generate the audio segment files.
        for segment in _cluster(audio_chunks, max_duration_ms):
            if len(segment) <= max_duration_ms:
                with tempfile.TemporaryFile() as file:
                    segment.export(file, bitrate=bitrate, format=format)
                    yield (cast(BinaryIO, file), format)
            else:
                # If the audio segment is still too long, hard-split it.
                for sub_segment in _hard_split(segment, max_duration_ms):
                    with tempfile.TemporaryFile() as file:
                        sub_segment.export(file, bitrate=bitrate, format=format)
                        yield (cast(BinaryIO, file), format)
    except Exception as e:
        raise AudioProcessingError(str(e))
