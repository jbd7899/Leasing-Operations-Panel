import { db, interactionsTable, prospectsTable, prospectConflictsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { extractProspectData, ExtractionValidationError, type ProspectExtraction } from "./aiExtract";
import { logger } from "./logger";

const CONFLICT_FIELDS: (keyof ProspectExtraction)[] = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "desiredBedrooms",
  "desiredMoveInDate",
  "budgetMin",
  "budgetMax",
  "pets",
  "voucherType",
];

type ProspectRow = typeof prospectsTable.$inferSelect;

function prospectValueForField(prospect: ProspectRow, field: keyof ProspectExtraction): string | null {
  switch (field) {
    case "firstName": return prospect.firstName ?? null;
    case "lastName": return prospect.lastName ?? null;
    case "phone": return prospect.phonePrimary ?? null;
    case "email": return prospect.email ?? null;
    case "desiredBedrooms": return prospect.desiredBedrooms ?? null;
    case "desiredMoveInDate": return prospect.desiredMoveInDate ?? null;
    case "budgetMin": return prospect.budgetMin != null ? String(prospect.budgetMin) : null;
    case "budgetMax": return prospect.budgetMax != null ? String(prospect.budgetMax) : null;
    case "pets": return prospect.pets ?? null;
    case "voucherType": return prospect.voucherType ?? null;
    default: return null;
  }
}

function extractedValueForField(extraction: ProspectExtraction, field: keyof ProspectExtraction): string | null {
  const raw = extraction[field];
  if (raw == null) return null;
  return String(raw);
}

async function detectAndStoreConflicts(
  accountId: string,
  prospectId: string,
  prospect: ProspectRow,
  extraction: ProspectExtraction,
): Promise<void> {
  for (const field of CONFLICT_FIELDS) {
    const extractedVal = extractedValueForField(extraction, field);
    if (extractedVal == null) continue;

    const existingVal = prospectValueForField(prospect, field);

    if (existingVal == null) {
      if (field === "phone") {
        continue;
      }
      let updateSet: Partial<ProspectRow> | null = null;
      if (field === "firstName") {
        const parts = [extractedVal, prospect.lastName].filter(Boolean);
        updateSet = { firstName: extractedVal, ...(parts.length > 0 ? { fullName: parts.join(" ") } : {}) };
      } else if (field === "lastName") {
        const parts = [prospect.firstName, extractedVal].filter(Boolean);
        updateSet = { lastName: extractedVal, ...(parts.length > 0 ? { fullName: parts.join(" ") } : {}) };
      } else {
        const simpleFieldMap: Partial<Record<keyof ProspectExtraction, Partial<ProspectRow>>> = {
          email: { email: extractedVal },
          desiredBedrooms: { desiredBedrooms: extractedVal },
          desiredMoveInDate: { desiredMoveInDate: extractedVal },
          budgetMin: { budgetMin: extractedVal },
          budgetMax: { budgetMax: extractedVal },
          pets: { pets: extractedVal },
          voucherType: { voucherType: extractedVal },
        };
        updateSet = simpleFieldMap[field] ?? null;
      }
      if (updateSet) {
        await db
          .update(prospectsTable)
          .set({ ...updateSet, updatedAt: new Date() } as Partial<ProspectRow>)
          .where(and(eq(prospectsTable.id, prospectId), eq(prospectsTable.accountId, accountId)));
      }
      continue;
    }

    if (existingVal.trim().toLowerCase() === extractedVal.trim().toLowerCase()) {
      continue;
    }

    const [existing] = await db
      .select({ id: prospectConflictsTable.id })
      .from(prospectConflictsTable)
      .where(
        and(
          eq(prospectConflictsTable.prospectId, prospectId),
          eq(prospectConflictsTable.fieldName, field),
          isNull(prospectConflictsTable.resolvedAt),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(prospectConflictsTable)
        .set({ extractedValue: extractedVal, updatedAt: new Date() })
        .where(eq(prospectConflictsTable.id, existing.id));
    } else {
      await db.insert(prospectConflictsTable).values({
        accountId,
        prospectId,
        fieldName: field,
        existingValue: existingVal,
        extractedValue: extractedVal,
      });
    }
  }
}

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

  const sourceType = interaction.sourceType as "sms" | "voice" | "voicemail" | "call";

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
      extraction,
    );
  } catch (err) {
    logger.error({ err, interactionId }, "Failed to process interaction");

    const rawContent =
      err instanceof ExtractionValidationError ? err.rawContent : undefined;

    await db
      .update(interactionsTable)
      .set({
        extractionStatus: "failed",
        structuredExtractionJson: rawContent
          ? ({ _extractionFailed: true, _raw: rawContent } as unknown as Record<string, unknown>)
          : null,
        updatedAt: new Date(),
      })
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
  extraction: ProspectExtraction,
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

  const [prospect] = await db
    .select()
    .from(prospectsTable)
    .where(and(eq(prospectsTable.id, prospectId), eq(prospectsTable.accountId, accountId)));

  if (!prospect) return;

  await db
    .update(prospectsTable)
    .set({ latestSummary, latestSentiment, updatedAt: new Date() })
    .where(and(eq(prospectsTable.id, prospectId), eq(prospectsTable.accountId, accountId)));

  await detectAndStoreConflicts(accountId, prospectId, prospect, extraction);
}
