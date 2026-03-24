import { openai } from "@workspace/integrations-openai-ai-server";

export interface ProspectExtraction {
  firstName?: string;
  lastName?: string;
  email?: string;
  desiredBedrooms?: string;
  desiredMoveInDate?: string;
  budgetMin?: number;
  budgetMax?: number;
  pets?: string;
  voucherType?: string;
  employmentStatus?: string;
  monthlyIncome?: number;
  languagePreference?: string;
  summary: string;
  category: string;
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  urgency: "low" | "medium" | "high";
  confidence: number;
}

const SYSTEM_PROMPT = `You are a leasing intake AI assistant for a property management company. Your job is to extract structured prospect data from SMS messages or phone call transcripts and produce a JSON response.

Extract as much information as possible from the text. Be conservative with confidence scores — only mark high confidence when data is explicit.

Respond ONLY with valid JSON matching this schema:
{
  "firstName": string or null,
  "lastName": string or null,
  "email": string or null,
  "desiredBedrooms": string or null (e.g. "2", "studio", "1+den"),
  "desiredMoveInDate": string or null (ISO date if parseable, otherwise human text),
  "budgetMin": number or null,
  "budgetMax": number or null,
  "pets": string or null (describe pets if mentioned),
  "voucherType": string or null (e.g. "Section 8", "HUD", "none"),
  "employmentStatus": string or null (e.g. "employed", "self-employed", "retired", "student"),
  "monthlyIncome": number or null,
  "languagePreference": string or null (BCP 47 code, e.g. "en", "es"),
  "summary": string (1-2 sentence summary of the inquiry),
  "category": string (one of: "availability_inquiry", "pricing_inquiry", "schedule_tour", "application_question", "maintenance", "general_question", "spam", "wrong_number", "voicemail"),
  "sentiment": string (one of: "positive", "neutral", "negative", "mixed"),
  "urgency": string (one of: "low", "medium", "high"),
  "confidence": number (0.0 to 1.0, overall extraction confidence)
}`;

export async function extractProspectData(text: string, sourceType: "sms" | "voice" | "voicemail"): Promise<ProspectExtraction> {
  const userPrompt = sourceType === "sms"
    ? `Extract prospect data from this SMS message:\n\n${text}`
    : `Extract prospect data from this ${sourceType} transcript:\n\n${text}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 1024,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in AI response");
  }

  const parsed = JSON.parse(content) as ProspectExtraction;
  return parsed;
}
