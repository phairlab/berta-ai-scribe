FROM nvcr.io/nvidia/pytorch:23.12-py3

# Set the working directory in the container.
WORKDIR /app

# Install ffmpeg
RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y ffmpeg

# Install the required Python packages.
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Preload vad model
RUN python -c 'from whisperx.vad import load_vad_model; load_vad_model("cpu");'

# Preload Meta's Whisper large-v2 model
RUN python -c 'import faster_whisper; model = faster_whisper.WhisperModel("large-v2");'

# Make port 8010 available to outside the container.
EXPOSE 8010

# Copy the current directory contents into the container.
COPY . .

# Run the app when the container launches.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8010"]