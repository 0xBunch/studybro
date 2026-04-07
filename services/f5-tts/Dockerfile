FROM python:3.11-slim

# Audio processing dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg sox libsox-fmt-all libsndfile1-dev git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install f5-tts first (it pulls its own torch/torchaudio)
COPY services/f5-tts/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Force-downgrade to PyTorch 2.1.2 CPU AFTER f5-tts installs.
# torchaudio >= 2.9 forces torchcodec (needs CUDA).
# 2.1.2 has multiple audio backends and works on CPU.
# Use +cpu suffix to get the correct CPU-only wheels.
RUN pip install --no-cache-dir \
    torch==2.1.2+cpu torchaudio==2.1.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

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
