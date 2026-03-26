import Anthropic from "@anthropic-ai/sdk";

const apiKey =
  process.env.ANTHROPIC_API_KEY ??
  process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

if (!apiKey) {
  throw new Error(
    "No Anthropic API key found. Set ANTHROPIC_API_KEY or configure the Replit Anthropic AI integration (AI_INTEGRATIONS_ANTHROPIC_API_KEY + AI_INTEGRATIONS_ANTHROPIC_BASE_URL).",
  );
}

export const anthropic = new Anthropic({
  apiKey,
  ...(baseURL ? { baseURL } : {}),
});
