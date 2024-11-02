FROM python:3.11.9-slim-bookworm

# Set the working directory in the container.
WORKDIR /app

COPY /.deployment/audiowaveform_1.10.1-1-12_amd64.deb /app/audiowaveform_1.10.1-1-12_amd64.deb

# Install ffmpeg and audiowaveform
RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt install -y ./audiowaveform_1.10.1-1-12_amd64.deb
RUN apt-get -f install -y
RUN apt-get install -y ffmpeg

# Install the required Python packages.
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make port 8000 available to outside the container.
EXPOSE 8000

# Copy the current directory contents into the container.
COPY . .

# Run the app when the container launches.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]