import { z } from "zod";
import { anthropic } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

export const extractionSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  desiredBedrooms: z.string().nullable().optional(),
  desiredMoveInDate: z.string().nullable().optional(),
  budgetMin: z.number().nullable().optional(),
  budgetMax: z.number().nullable().optional(),
  pets: z.string().nullable().optional(),
  voucherType: z.string().nullable().optional(),
  employmentStatus: z.string().nullable().optional(),
  monthlyIncome: z.number().nullable().optional(),
  languagePreference: z.string().nullable().optional(),
  summary: z.string(),
  category: z.enum([
    "availability_inquiry",
    "pricing_inquiry",
    "schedule_tour",
    "application_question",
    "maintenance",
    "general_question",
    "spam",
    "wrong_number",
    "voicemail",
  ]),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]),
  urgency: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
  suggestedStatus: z.enum(["new", "contacted", "qualified", "disqualified", "closed"]).nullable().optional(),
  suggestedNextAction: z.string().nullable().optional(),
});

export type ProspectExtraction = z.infer<typeof extractionSchema>;

export class ExtractionValidationError extends Error {
  readonly rawContent: unknown;
  readonly validationIssues: z.ZodIssue[];

  constructor(issues: z.ZodIssue[], rawContent: unknown) {
    super(`AI extraction response failed schema validation (${issues.length} issue(s))`);
    this.name = "ExtractionValidationError";
    this.rawContent = rawContent;
    this.validationIssues = issues;
  }
}

const JSON_SCHEMA = `{
  "firstName": string | null,
  "lastName": string | null,
  "phone": string | null (E.164 if possible),
  "email": string | null,
  "desiredBedrooms": string | null (e.g. "2", "studio", "1+den"),
  "desiredMoveInDate": string | null (ISO date if parseable, else natural language),
  "budgetMin": number | null,
  "budgetMax": number | null,
  "pets": string | null (describe pets if mentioned),
  "voucherType": string | null (e.g. "Section 8", "HUD", "none"),
  "employmentStatus": string | null (e.g. "employed", "self-employed", "retired", "student"),
  "monthlyIncome": number | null,
  "languagePreference": string | null (BCP 47 code, e.g. "en", "es"),
  "summary": string (1-2 sentence summary of the inquiry),
  "category": "availability_inquiry" | "pricing_inquiry" | "schedule_tour" | "application_question" | "maintenance" | "general_question" | "spam" | "wrong_number" | "voicemail",
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "urgency": "low" | "medium" | "high",
  "confidence": number 0.0-1.0 (overall extraction confidence),
  "suggestedStatus": "new" | "contacted" | "qualified" | "disqualified" | "closed" | null,
  "suggestedNextAction": string | null (brief recommended next action for the leasing agent)
}`;

const BASE_SYSTEM = `You are a leasing intake AI assistant for a property management company. Extract structured prospect data from messages or transcripts and respond with ONLY valid JSON — no explanation, no markdown.

Be conservative with confidence scores — only assign high confidence when data is explicit and unambiguous. If a field is not mentioned or unclear, set it to null.

Respond ONLY with a JSON object matching this exact schema:
${JSON_SCHEMA}`;

function buildUserMessage(text: string, sourceType: "sms" | "voice" | "voicemail" | "call"): string {
  const sourceLabels = {
    sms: "SMS message from a prospective renter",
    voicemail: "Voicemail transcript (automated, may have errors — be charitable). Default category to 'voicemail' unless content clearly indicates otherwise.",
    call: "Voice call note or metadata. If no meaningful prospect content, set confidence low.",
    voice: "Outbound call transcript between leasing agent and prospective renter (may have transcription errors).",
  };

  return `SOURCE: ${sourceLabels[sourceType]}\n\n${text}`;
}

export async function extractProspectData(
  text: string,
  sourceType: "sms" | "voice" | "voicemail" | "call",
): Promise<ProspectExtraction> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: BASE_SYSTEM,
    messages: [{ role: "user", content: buildUserMessage(text, sourceType) }],
  });

  const content = response.content.find((b) => b.type === "text")?.text;
  if (!content) {
    throw new Error("No content in AI extraction response");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error(`AI returned invalid JSON: ${content.slice(0, 200)}`);
  }

  const result = extractionSchema.safeParse(raw);
  if (!result.success) {
    logger.warn(
      { issues: result.error.issues, raw },
      "AI extraction response failed Zod validation",
    );
    throw new ExtractionValidationError(result.error.issues, raw);
  }

  return result.data;
}
