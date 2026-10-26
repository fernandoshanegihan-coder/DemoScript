import { generateSpeech, SPEECH_VOICES, SpeechError, type SpeechVoice } from "@/lib/azureSpeech";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Open DemoScript to generate narration." }, { status: 403 });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 6000) return Response.json({ error: "Generate one scene at a time." }, { status: 400 });
    body = JSON.parse(raw);
  } catch { return Response.json({ error: "The narration request could not be read." }, { status: 400 }); }
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const seconds = body?.seconds;
  const voice = body?.voice ?? SPEECH_VOICES[0];
  if (!text || text.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text) || !Number.isFinite(seconds) || seconds < 3 || seconds > 180 || !SPEECH_VOICES.includes(voice)) {
    return Response.json({ error: "Provide a spoken scene between 3 and 180 seconds and a supported voice." }, { status: 400 });
  }
  try {
    const result = await generateSpeech(text, seconds, voice as SpeechVoice, request.signal);
    return new Response(new Blob([new Uint8Array(result.audio)], { type: "audio/wav" }), {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store", "X-Audio-Duration": String(result.seconds) },
    });
  } catch (error) {
    return Response.json({ error: error instanceof SpeechError ? error.message : "Automatic voice could not finish. Your existing takes are kept; please try again." }, { status: error instanceof SpeechError ? error.status : 502 });
  }
}
