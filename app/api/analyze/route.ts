import { ANALYSIS_MODEL, GeminiError, analysisSchema, generateJson } from "@/lib/gemini";
import { ANALYSIS_SYSTEM, analysisInstruction } from "@/lib/prompts";

export const runtime = "nodejs";

type ImageInput = { id: string; dataUrl: string };

type RawAnalysis = {
  index: number;
  description: string;
  elements: string[];
  confident: boolean;
};

const MAX_IMAGES = 6;
const DATA_URL = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i;

function failure(error: unknown): Response {
  if (error instanceof GeminiError) {
    const status = error.code === "rate-limit" ? 429 : error.code === "no-key" ? 400 : 502;
    return Response.json({ error: error.message }, { status });
  }
  console.error("/api/analyze failed", error);
  return Response.json(
    { error: "Something went wrong reading the screenshots. Try again." },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  let body: { images?: ImageInput[] };
  try {
    body = (await request.json()) as { images?: ImageInput[] };
  } catch {
    return Response.json({ error: "That request didn't arrive in one piece." }, { status: 400 });
  }

  const images = Array.isArray(body.images) ? body.images : [];
  if (images.length === 0) {
    return Response.json({ error: "No screenshots to read." }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return Response.json(
      { error: "6 at a time — that's already a full 3-minute script." },
      { status: 400 },
    );
  }

  const parsed = images.map((image) => {
    const match = DATA_URL.exec(image.dataUrl ?? "");
    return {
      id: image.id,
      mimeType: match?.[1] ?? "image/jpeg",
      data: match?.[2] ?? "",
    };
  });

  if (parsed.some((image) => !image.data)) {
    return Response.json(
      { error: "One of those screenshots couldn't be read. Try adding it again." },
      { status: 400 },
    );
  }

  try {
    /**
     * One call for every screenshot, not one call each. The free tier counts
     * requests per minute, and six separate calls is the easiest way to hit
     * that ceiling before the script is even written.
     */
    const result = await generateJson<{ analyses: RawAnalysis[] }>({
      parts: [
        { text: analysisInstruction(parsed.length) },
        ...parsed.map((image) => ({
          inlineData: { mimeType: image.mimeType, data: image.data },
        })),
      ],
      schema: analysisSchema,
      systemInstruction: ANALYSIS_SYSTEM,
      temperature: 0.2,
      models: [ANALYSIS_MODEL],
    });

    const byIndex = new Map<number, RawAnalysis>();
    for (const analysis of result.analyses ?? []) {
      const index = Number(analysis.index);
      if (Number.isInteger(index) && index >= 1 && index <= parsed.length) {
        byIndex.set(index, analysis);
      }
    }

    const results = parsed.map((image, position) => {
      const analysis = byIndex.get(position + 1);
      const confident =
        Boolean(analysis?.confident) && Boolean(analysis?.description?.trim());

      return {
        shotId: image.id,
        description: confident ? analysis!.description.trim() : "",
        elements: confident
          ? (analysis!.elements ?? [])
              .filter((item) => typeof item === "string")
              .slice(0, 6)
          : [],
        confident,
      };
    });

    return Response.json({ results });
  } catch (error) {
    return failure(error);
  }
}
