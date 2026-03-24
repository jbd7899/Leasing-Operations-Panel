import { z } from "zod";
import { openai } from "@workspace/integrations-openai-ai-server";
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
  "category": one of: "availability_inquiry" | "pricing_inquiry" | "schedule_tour" | "application_question" | "maintenance" | "general_question" | "spam" | "wrong_number" | "voicemail",
  "sentiment": one of: "positive" | "neutral" | "negative" | "mixed",
  "urgency": one of: "low" | "medium" | "high",
  "confidence": number 0.0-1.0 (overall extraction confidence),
  "suggestedStatus": one of: "new" | "contacted" | "qualified" | "disqualified" | "closed" | null,
  "suggestedNextAction": string | null (brief recommended next action for the leasing agent)
}`;

const BASE_SYSTEM = `You are a leasing intake AI assistant for a property management company. Your job is to extract structured prospect data from messages or transcripts and return ONLY valid JSON — no explanation, no markdown.

Be conservative with confidence scores — only assign high confidence when data is explicit and unambiguous. If a field is not mentioned or unclear, set it to null.

Respond ONLY with a JSON object matching this exact schema:
${JSON_SCHEMA}`;

function smsPrompt(text: string): string {
  return `${BASE_SYSTEM}

SOURCE TYPE: SMS message
CONTEXT: Short text message from a prospective renter to a property management number.

Extract prospect data from this SMS message:

${text}`;
}

function voicemailPrompt(text: string): string {
  return `${BASE_SYSTEM}

SOURCE TYPE: Voicemail transcript
CONTEXT: Automated transcription of a voicemail left by a prospective renter. Transcription may have errors — be charitable when interpreting unclear words. The category should default to "voicemail" unless the content clearly indicates another specific intent.

Extract prospect data from this voicemail transcript:

${text}`;
}

function callNotePrompt(text: string): string {
  return `${BASE_SYSTEM}

SOURCE TYPE: Voice call note
CONTEXT: Notes or metadata from an inbound phone call. May include call status, duration, or call metadata rather than conversation content. If there is no meaningful prospect content, set confidence low and summary to describe what little was captured.

Extract prospect data from this call note:

${text}`;
}

function buildPrompt(text: string, sourceType: "sms" | "voice" | "voicemail"): string {
  if (sourceType === "sms") return smsPrompt(text);
  if (sourceType === "voicemail") return voicemailPrompt(text);
  return callNotePrompt(text);
}

export async function extractProspectData(
  text: string,
  sourceType: "sms" | "voice" | "voicemail",
): Promise<ProspectExtraction> {
  const prompt = buildPrompt(text, sourceType);

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
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
