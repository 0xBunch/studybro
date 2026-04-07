FROM python:3.11-slim

# Audio processing dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg sox libsox-fmt-all libsndfile1-dev git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Pin PyTorch 2.1.2 — torchaudio >= 2.9 forces torchcodec (needs CUDA).
# 2.1.2 has multiple audio backends and works on CPU without torchcodec.
RUN pip install --no-cache-dir \
    torch==2.1.2 torchaudio==2.1.2 \
    --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
COPY services/f5-tts/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY services/f5-tts/server.py .
RUN mkdir -p voices

# HuggingFace cache — model downloads on first request
ENV HF_HOME=/tmp/hf_cache
ENV PYTHONUNBUFFERED=1
ENV DEVICE=cpu

EXPOSE 8000

# Single worker to avoid OOM on CPU instances
# Railway sets PORT dynamically — fall back to 8000 for local dev
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --timeout-keep-alive 300
