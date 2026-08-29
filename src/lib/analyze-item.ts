import type { ItemAnalysis } from "./types";

export const ANALYZE_PROMPT = `You are helping Loopify, a Yangon (Myanmar) donation app. Reply in English only. Locations must be Yangon townships such as Bahan, Kamayut, Insein, Hlaing, Tamwe, Thingangyun, or North Okkalapa — never another city.

A user uploaded a photo of an item they want to donate or recycle. Analyze the photo and return JSON with:
{
  "title": "short item title",
  "category": "clothes" | "books" | "electronics" | "furniture" | "food" | "other",
  "condition": "Like new" | "Good" | "Fair" | "For parts / recycle",
  "description": "2-4 sentences for neighbors: what it is, quantity, and how to collect in a Myanmar township",
  "estimated_kg_min": number,
  "estimated_kg_max": number,
  "recommendation": "reuse" | "repair" | "recycle",
  "recommendation_detail": "one sentence on reuse, repair, or recycling in Myanmar (e.g. PET to a recovery workshop, not a drain)",
  "safety_warnings": string[],
  "keywords": string[]
}

Safety warnings: batteries, mouldy food, broken glass, unsealed food, flammables. Empty array if none.
If the photo is not an item, still guess the closest donation category.
JSON only.`;

function parseJson(text: string): Omit<ItemAnalysis, "provider"> {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const raw = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  const cats = ["clothes", "books", "electronics", "furniture", "food", "other"] as const;
  const recs = ["reuse", "repair", "recycle"] as const;
  const cat = String(raw.category ?? "other");
  const rec = String(raw.recommendation ?? "reuse");
  const category = cats.includes(cat as (typeof cats)[number])
    ? (cat as ItemAnalysis["category"])
    : "other";
  const recommendation = recs.includes(rec as (typeof recs)[number])
    ? (rec as ItemAnalysis["recommendation"])
    : "reuse";
  return {
    title: String(raw.title ?? "Donated item"),
    category,
    condition: String(raw.condition ?? "Good"),
    description: String(raw.description ?? ""),
    estimated_kg_min: Number(raw.estimated_kg_min ?? 1),
    estimated_kg_max: Number(raw.estimated_kg_max ?? 2),
    recommendation,
    recommendation_detail: String(raw.recommendation_detail ?? ""),
    safety_warnings: Array.isArray(raw.safety_warnings)
      ? raw.safety_warnings.map(String)
      : [],
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
  };
}

async function geminiAnalyze(base64: string, mime: string): Promise<ItemAnalysis> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("No Gemini key");
  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
  let last = "Gemini failed";
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: ANALYZE_PROMPT },
                { inline_data: { mime_type: mime, data: base64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      },
    );
    const json = (await res.json()) as {
      error?: { message?: string };
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    if (!res.ok) {
      last = json.error?.message ?? res.statusText;
      continue;
    }
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { ...parseJson(text), provider: `gemini:${model}` };
  }
  throw new Error(last);
}

async function openaiAnalyze(base64: string, mime: string, apiKey: string, url: string, model: string, extraHeaders?: Record<string, string>): Promise<ItemAnalysis> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ANALYZE_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this item photo for a Loopify donation post in Myanmar." },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
    }),
  });
  const json = (await res.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  const text = json.choices?.[0]?.message?.content ?? "";
  return { ...parseJson(text), provider: model };
}

export async function analyzeItemPhoto(base64: string, mime: string): Promise<ItemAnalysis> {
  const errors: string[] = [];
  try {
    return await geminiAnalyze(base64, mime);
  } catch (e) {
    errors.push(`Gemini: ${e instanceof Error ? e.message : e}`);
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      return await openaiAnalyze(
        base64,
        mime,
        process.env.OPENAI_API_KEY,
        "https://api.openai.com/v1/chat/completions",
        "gpt-4o-mini",
      );
    } catch (e) {
      errors.push(`OpenAI: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (process.env.OPENROUTER_API_KEY) {
    const models = ["google/gemini-2.0-flash-001", "openai/gpt-4o-mini"];
    for (const model of models) {
      try {
        return await openaiAnalyze(
          base64,
          mime,
          process.env.OPENROUTER_API_KEY,
          "https://openrouter.ai/api/v1/chat/completions",
          model,
          { "HTTP-Referer": "https://loopify.app", "X-Title": "Loopify" },
        );
      } catch (e) {
        errors.push(`OpenRouter ${model}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  throw new Error(errors.join(" · ") || "No vision provider available");
}
