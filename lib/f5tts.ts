const F5_TTS_URL = process.env.F5_TTS_URL;

function getBaseUrl(): string {
  if (!F5_TTS_URL) {
    throw new Error("F5_TTS_URL environment variable is not set");
  }
  return F5_TTS_URL.replace(/\/$/, "");
}

/** Register a voice with the F5-TTS server from reference audio */
export async function registerVoice(
  label: string,
  audioBuffer: Buffer
): Promise<void> {
  const base = getBaseUrl();

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: "audio/wav" }),
    `${label}.wav`
  );

  const url = new URL(`${base}/upload_audio/`);
  url.searchParams.set("audio_file_label", label);

  const res = await fetch(url.toString(), {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `F5-TTS voice registration failed (${res.status}): ${text}`
    );
  }
}

/** Synthesize speech using a previously registered voice. Returns raw WAV bytes. */
export async function synthesizeSpeech(
  text: string,
  voiceLabel: string,
  refAudioUrl?: string,
  refText?: string
): Promise<Buffer> {
  const base = getBaseUrl();

  const url = new URL(`${base}/synthesize_speech/`);
  url.searchParams.set("text", text);
  url.searchParams.set("voice", voiceLabel);
  if (refAudioUrl) {
    url.searchParams.set("ref_audio_url", refAudioUrl);
  }
  if (refText) {
    url.searchParams.set("ref_text", refText);
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`F5-TTS synthesis failed (${res.status}): ${errText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
