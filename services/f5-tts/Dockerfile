FROM python:3.11-slim

# Audio processing dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg sox libsox-fmt-all libsndfile1-dev git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-only PyTorch first (keeps image small — no CUDA)
RUN pip install --no-cache-dir \
    torch torchaudio \
    --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .
COPY voices/ ./voices/

# HuggingFace cache — model downloads on first request
ENV HF_HOME=/tmp/hf_cache
ENV PYTHONUNBUFFERED=1
ENV DEVICE=cpu

EXPOSE 8000

# Single worker to avoid OOM on CPU instances
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--timeout-keep-alive", "300"]
