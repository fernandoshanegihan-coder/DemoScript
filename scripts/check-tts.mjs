/**
 * Can this key synthesize speech at all, and is it on the free tier?
 * Run: node --env-file=.env.local scripts/check-tts.mjs
 */
const models = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview"];

for (const model of models) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say this warmly: your demo starts here." }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
        },
      }),
    },
  );

  const text = await response.text();
  let detail = "";
  try {
    const json = JSON.parse(text);
    if (response.ok) {
      const audio = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      detail = audio
        ? `audio ${Math.round((audio.inlineData.data.length * 3) / 4 / 1024)} KB, ${audio.inlineData.mimeType}`
        : "200 but no audio part";
    } else {
      detail = (json.error?.message ?? "").slice(0, 200);
    }
  } catch {
    detail = text.slice(0, 200);
  }

  console.log(model.padEnd(30), response.status, detail);
}
