"""
F5-TTS Voice Cloning Server

Minimal FastAPI wrapper around F5-TTS for zero-shot voice cloning.
Endpoints:
  GET  /health           - Health check
  POST /upload_audio/    - Upload reference audio to register a voice
  GET  /synthesize_speech/ - Synthesize speech with a registered voice
  GET  /voices           - List registered voice labels
"""

import io
import os
import time
import logging
from pathlib import Path

import soundfile as sf
import torch
import torchaudio
from fastapi import FastAPI, File, UploadFile, Query, HTTPException
from fastapi.responses import Response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("f5tts")

app = FastAPI(title="F5-TTS Voice Cloning Server")

# ── Config ──────────────────────────────────────────────────────────────────

VOICES_DIR = Path(os.getenv("VOICES_DIR", "/app/voices"))
VOICES_DIR.mkdir(parents=True, exist_ok=True)

DEVICE = os.getenv("DEVICE", "cpu")
MODEL_NAME = "F5TTS_v1_Base"

# ── Lazy model loading ──────────────────────────────────────────────────────

_model = None


def get_model():
    """Load F5-TTS model on first use (downloads from HuggingFace if needed)."""
    global _model
    if _model is not None:
        return _model

    logger.info("Loading F5-TTS model (this may download ~1.3GB on first run)...")
    start = time.time()

    from f5_tts.api import F5TTS

    _model = F5TTS(model_type="F5-TTS", device=DEVICE)
    logger.info(f"Model loaded in {time.time() - start:.1f}s on {DEVICE}")
    return _model


# ── Endpoints ───────────────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "device": DEVICE,
        "model_loaded": _model is not None,
        "voices": len(list(VOICES_DIR.glob("*.wav"))),
    }


@app.post("/upload_audio/")
async def upload_audio(
    audio_file_label: str = Query(..., description="Voice label identifier"),
    file: UploadFile = File(..., description="Reference audio file"),
):
    """Upload reference audio to register a voice for cloning."""
    if not audio_file_label.strip():
        raise HTTPException(status_code=400, detail="audio_file_label is required")

    content = await file.read()
    if len(content) < 1000:
        raise HTTPException(status_code=400, detail="Audio file too small")

    # Save as WAV (convert if needed)
    voice_path = VOICES_DIR / f"{audio_file_label}.wav"

    try:
        # Try loading with torchaudio to normalize format
        audio_buffer = io.BytesIO(content)
        waveform, sample_rate = torchaudio.load(audio_buffer)

        # Resample to 24kHz if needed (F5-TTS native rate)
        if sample_rate != 24000:
            resampler = torchaudio.transforms.Resample(sample_rate, 24000)
            waveform = resampler(waveform)

        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        torchaudio.save(str(voice_path), waveform, 24000)
    except Exception as e:
        # Fallback: save raw and hope F5-TTS handles it
        logger.warning(f"Audio conversion failed, saving raw: {e}")
        voice_path.write_bytes(content)

    duration = torchaudio.info(str(voice_path)).num_frames / 24000
    logger.info(
        f"Voice '{audio_file_label}' registered ({duration:.1f}s audio)"
    )

    return {
        "status": "success",
        "label": audio_file_label,
        "duration_seconds": round(duration, 1),
    }


@app.get("/synthesize_speech/")
async def synthesize_speech(
    text: str = Query(..., description="Text to synthesize"),
    voice: str = Query(..., description="Voice label from upload_audio"),
    speed: float = Query(1.0, ge=0.5, le=2.0, description="Playback speed"),
):
    """Synthesize speech using a previously registered voice."""
    voice_path = VOICES_DIR / f"{voice}.wav"
    if not voice_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Voice '{voice}' not found. Upload reference audio first.",
        )

    if not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    model = get_model()
    start = time.time()

    try:
        # F5-TTS inference
        wav, sr, _ = model.infer(
            ref_file=str(voice_path),
            ref_text="",  # Empty = auto-transcribe reference
            gen_text=text,
            speed=speed,
        )

        # Convert numpy array to WAV bytes
        buffer = io.BytesIO()
        sf.write(buffer, wav, sr, format="WAV")
        wav_bytes = buffer.getvalue()

        elapsed = time.time() - start
        logger.info(
            f"Synthesized {len(text)} chars with voice '{voice}' in {elapsed:.1f}s"
        )

        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={
                "x-elapsed-time": f"{elapsed:.2f}",
                "x-device-used": DEVICE,
            },
        )
    except Exception as e:
        logger.error(f"Synthesis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")


@app.get("/voices")
async def list_voices():
    """List all registered voice labels."""
    voices = [p.stem for p in VOICES_DIR.glob("*.wav")]
    return {"voices": sorted(voices)}
