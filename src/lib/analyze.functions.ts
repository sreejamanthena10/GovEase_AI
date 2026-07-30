import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  filename: z.string().min(1),
  mime: z.string().min(1),
  dataBase64: z.string().min(1),
});

export type FormField = { label: string; value: string };
export type Reminder = { label: string; dueInDays: number };

export type AnalysisResult = {
  title: string;
  summary: string;
  plainExplanation: string;
  steps: string[];
  documents: string[];
  warnings: string[];
  formFields: FormField[];
  reminders: Reminder[];
};

const SYSTEM = `You are an assistant that reads Indian government / official documents and explains them in very simple plain language for citizens who are not native English speakers or legal experts. Always answer as strict JSON matching the schema. Use short, friendly sentences.`;

const SCHEMA_INSTRUCTIONS = `Return ONLY a compact JSON object with these keys:
{
 "title": string (short 3-6 word title of the document),
 "summary": string (1-2 sentences on what this document is),
 "plainExplanation": string (3-5 sentences in plain English explaining what the citizen needs to do and why),
 "steps": string[] (3-6 clear step-by-step actions),
 "documents": string[] (list of documents / info the citizen must prepare),
 "warnings": string[] (0-3 important things to be careful about; can be empty),
 "formFields": [{"label": string, "value": string}] (4-10 fields a citizen would need to fill in a related form. Fill "value" with the exact value found in the document; use "" when it is not present),
 "reminders": [{"label": string, "dueInDays": number}] (1-5 deadlines or follow-up tasks with an estimated number of days from today)
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

function parseJsonLoose(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as Record<string, unknown>;
}

function toStringArray(v: unknown, max: number): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max) : [];
}

function normalize(parsed: Record<string, unknown>): AnalysisResult {
  const rawFields = Array.isArray(parsed.formFields) ? parsed.formFields : [];
  const rawReminders = Array.isArray(parsed.reminders) ? parsed.reminders : [];
  return {
    title: typeof parsed.title === "string" ? parsed.title : "Document",
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    plainExplanation: typeof parsed.plainExplanation === "string" ? parsed.plainExplanation : "",
    steps: toStringArray(parsed.steps, 8),
    documents: toStringArray(parsed.documents, 8),
    warnings: toStringArray(parsed.warnings, 5),
    formFields: rawFields
      .map((f) => f as { label?: unknown; value?: unknown })
      .filter((f) => typeof f.label === "string")
      .slice(0, 12)
      .map((f) => ({ label: String(f.label), value: typeof f.value === "string" ? f.value : "" })),
    reminders: rawReminders
      .map((r) => r as { label?: unknown; dueInDays?: unknown })
      .filter((r) => typeof r.label === "string")
      .slice(0, 6)
      .map((r) => ({
        label: String(r.label),
        dueInDays: Number.isFinite(Number(r.dueInDays)) ? Math.max(0, Math.round(Number(r.dueInDays))) : 7,
      })),
  };
}

async function callGateway(body: unknown): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

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

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Empty response from AI");
  return content;
}

export const analyzeDocument = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const content = await callGateway({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildUserContent(data.filename, data.mime, data.dataBase64) },
      ],
      response_format: { type: "json_object" },
    });
    return normalize(parseJsonLoose(content));
  });

const TranslateInput = z.object({
  language: z.string().min(2).max(40),
  payload: z.object({
    title: z.string(),
    summary: z.string(),
    plainExplanation: z.string(),
    steps: z.array(z.string()),
    documents: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
});

export type TranslatedAnalysis = z.infer<typeof TranslateInput>["payload"];

export const translateAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TranslateInput.parse(input))
  .handler(async ({ data }): Promise<TranslatedAnalysis> => {
    const content = await callGateway({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You translate simple government guidance into Indian languages. Keep it very simple and natural. Reply with strict JSON only, same keys and array lengths as the input.",
        },
        {
          role: "user",
          content: `Translate every string value of this JSON into ${data.language}. Keep the JSON keys in English and keep array lengths identical. Return JSON only.\n\n${JSON.stringify(
            data.payload,
          )}`,
        },
      ],
      response_format: { type: "json_object" },
    });
    const parsed = parseJsonLoose(content);
    return {
      title: typeof parsed.title === "string" ? parsed.title : data.payload.title,
      summary: typeof parsed.summary === "string" ? parsed.summary : data.payload.summary,
      plainExplanation:
        typeof parsed.plainExplanation === "string" ? parsed.plainExplanation : data.payload.plainExplanation,
      steps: toStringArray(parsed.steps, 8),
      documents: toStringArray(parsed.documents, 8),
      warnings: toStringArray(parsed.warnings, 5),
    };
  });
