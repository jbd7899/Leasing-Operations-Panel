import { db, interactionsTable, prospectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { extractProspectData } from "./aiExtract";
import { logger } from "./logger";

export async function processInteraction(interactionId: string): Promise<void> {
  const [interaction] = await db
    .select()
    .from(interactionsTable)
    .where(eq(interactionsTable.id, interactionId));

  if (!interaction) {
    logger.warn({ interactionId }, "Interaction not found for processing");
    return;
  }

  const textToAnalyze = interaction.rawText ?? interaction.transcript;
  if (!textToAnalyze) {
    await db
      .update(interactionsTable)
      .set({ extractionStatus: "skipped", updatedAt: new Date() })
      .where(eq(interactionsTable.id, interactionId));
    logger.info({ interactionId }, "Interaction has no text to analyze — skipped");
    return;
  }

  const sourceType = interaction.sourceType as "sms" | "voice" | "voicemail";

  try {
    await db
      .update(interactionsTable)
      .set({ extractionStatus: "processing", updatedAt: new Date() })
      .where(eq(interactionsTable.id, interactionId));

    const extraction = await extractProspectData(textToAnalyze, sourceType);

    await db
      .update(interactionsTable)
      .set({
        summary: extraction.summary,
        category: extraction.category,
        sentiment: extraction.sentiment,
        urgency: extraction.urgency,
        extractionConfidence: String(extraction.confidence),
        structuredExtractionJson: extraction as unknown as Record<string, unknown>,
        extractionStatus: "done",
        updatedAt: new Date(),
      })
      .where(eq(interactionsTable.id, interactionId));

    await updateProspectDisplayFields(
      interaction.accountId,
      interaction.fromNumber,
      interaction.prospectId,
      interaction.id,
      extraction.summary,
      extraction.sentiment,
    );
  } catch (err) {
    logger.error({ err, interactionId }, "Failed to process interaction");
    await db
      .update(interactionsTable)
      .set({ extractionStatus: "failed", updatedAt: new Date() })
      .where(eq(interactionsTable.id, interactionId));
  }
}

async function updateProspectDisplayFields(
  accountId: string,
  fromNumber: string,
  existingProspectId: string | null,
  interactionId: string,
  latestSummary: string,
  latestSentiment: string,
): Promise<void> {
  let prospectId: string | null = existingProspectId;

  if (!prospectId) {
    const [found] = await db
      .select({ id: prospectsTable.id })
      .from(prospectsTable)
      .where(and(eq(prospectsTable.accountId, accountId), eq(prospectsTable.phonePrimary, fromNumber)))
      .limit(1);

    if (!found) {
      const [created] = await db
        .insert(prospectsTable)
        .values({
          accountId,
          phonePrimary: fromNumber,
          status: "new",
          exportStatus: "pending",
        })
        .onConflictDoNothing()
        .returning({ id: prospectsTable.id });

      if (created) {
        prospectId = created.id;
      } else {
        const [raceWinner] = await db
          .select({ id: prospectsTable.id })
          .from(prospectsTable)
          .where(and(eq(prospectsTable.accountId, accountId), eq(prospectsTable.phonePrimary, fromNumber)))
          .limit(1);
        prospectId = raceWinner?.id ?? null;
      }
    } else {
      prospectId = found.id;
    }

    if (prospectId) {
      await db
        .update(interactionsTable)
        .set({ prospectId, updatedAt: new Date() })
        .where(eq(interactionsTable.id, interactionId));
    }
  }

  if (!prospectId) return;

  await db
    .update(prospectsTable)
    .set({ latestSummary, latestSentiment, updatedAt: new Date() })
    .where(and(eq(prospectsTable.id, prospectId), eq(prospectsTable.accountId, accountId)));
}
