FROM python:3.11-slim

# Audio processing dependencies (libavcodec-dev needed by torchcodec)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libavcodec-dev libavformat-dev libavutil-dev \
    sox libsox-fmt-all libsndfile1-dev git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-only PyTorch first (keeps image small — no CUDA)
RUN pip install --no-cache-dir \
    torch torchaudio \
    --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
COPY services/f5-tts/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y torchcodec 2>/dev/null; true \
    && rm -rf /usr/local/lib/python3.11/site-packages/torchcodec* 2>/dev/null; true \
    && python -c "import importlib.util; assert importlib.util.find_spec('torchcodec') is None, 'torchcodec still installed!'"

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
