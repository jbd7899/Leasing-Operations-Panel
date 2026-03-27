import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic;

  const apiKey =
    process.env.ANTHROPIC_API_KEY ??
    process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

  if (!apiKey) {
    throw new Error(
      "No Anthropic API key found. Set ANTHROPIC_API_KEY or configure the Replit Anthropic AI integration (AI_INTEGRATIONS_ANTHROPIC_API_KEY + AI_INTEGRATIONS_ANTHROPIC_BASE_URL).",
    );
  }

  _anthropic = new Anthropic({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  return _anthropic;
}

/** @deprecated Use getAnthropic() instead — this throws at import time if no key is set */
export const anthropic = new Proxy({} as Anthropic, {
  get(_, prop) {
    return (getAnthropic() as any)[prop];
  },
});
