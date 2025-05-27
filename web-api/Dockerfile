FROM --platform=linux/amd64 python:3.11-slim

# Create non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install system dependencies and build audiowaveform
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    ffmpeg \
    git \
    cmake \
    libmad0-dev \
    libid3tag0-dev \
    libsndfile1-dev \
    libgd-dev \
    libboost-filesystem-dev \
    libboost-program-options-dev \
    libboost-regex-dev \
    libboost-system-dev \
    libboost-test-dev \
    libboost-thread-dev \
    wget \
    && git clone https://github.com/bbc/audiowaveform.git \
    && cd audiowaveform \
    && git checkout 1.10.0 \
    # Manually install googletest
    && wget https://github.com/google/googletest/archive/release-1.10.0.tar.gz \
    && tar xzf release-1.10.0.tar.gz \
    && ln -s googletest-release-1.10.0/googletest googletest \
    && ln -s googletest-release-1.10.0/googlemock googlemock \
    # Build commands with all required flags
    && mkdir build \
    && cd build \
    && cmake -D ENABLE_TESTS=0 \
           -D CMAKE_BUILD_TYPE=Release \
           -D CMAKE_INSTALL_PREFIX=/usr \
           -D ENABLE_STATIC=0 \
           -D ENABLE_SHARED=1 \
           .. \
    && make -j$(nproc) \
    && make install \
    && ldconfig \
    && cd ../.. \
    && rm -rf audiowaveform \
    && apt-get purge -y git cmake wget \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir psycopg2-binary

# Copy the rest of the application
COPY . .

# Set proper permissions
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]