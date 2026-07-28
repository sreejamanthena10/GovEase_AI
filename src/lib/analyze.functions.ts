import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  filename: z.string().min(1),
  mime: z.string().min(1),
  dataBase64: z.string().min(1),
});

export type AnalysisResult = {
  title: string;
  summary: string;
  plainExplanation: string;
  steps: string[];
  documents: string[];
  warnings: string[];
};

const SYSTEM = `You are an assistant that reads Indian government / official documents and explains them in very simple plain language for citizens who are not native English speakers or legal experts. Always answer as strict JSON matching the schema. Use short, friendly sentences.`;

const SCHEMA_INSTRUCTIONS = `Return ONLY a compact JSON object with these keys:
{
 "title": string (short 3-6 word title of the document),
 "summary": string (1-2 sentences on what this document is),
 "plainExplanation": string (3-5 sentences in plain English explaining what the citizen needs to do and why),
 "steps": string[] (3-6 clear step-by-step actions),
 "documents": string[] (list of documents / info the citizen must prepare),
 "warnings": string[] (0-3 important things to be careful about; can be empty)
}
No markdown, no code fences.`;

function buildUserContent(filename: string, mime: string, dataBase64: string) {
  const dataUrl = `data:${mime};base64,${dataBase64}`;
  if (mime.startsWith("image/")) {
    return [
      { type: "text", text: `Analyse this government document image (${filename}). ${SCHEMA_INSTRUCTIONS}` },
      { type: "image_url", image_url: { url: dataUrl } },
    ];
  }
  return [
    { type: "text", text: `Analyse this government document (${filename}). ${SCHEMA_INSTRUCTIONS}` },
    { type: "file", file: { filename, file_data: dataUrl } },
  ];
}

function extractJson(text: string): AnalysisResult {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(slice) as Partial<AnalysisResult>;
  return {
    title: parsed.title ?? "Document",
    summary: parsed.summary ?? "",
    plainExplanation: parsed.plainExplanation ?? "",
    steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 8) : [],
    documents: Array.isArray(parsed.documents) ? parsed.documents.slice(0, 8) : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 5) : [],
  };
}

export const analyzeDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildUserContent(data.filename, data.mime, data.dataBase64) },
      ],
      response_format: { type: "json_object" },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in your workspace billing.");
      throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("Empty response from AI");
    return extractJson(content);
  });
