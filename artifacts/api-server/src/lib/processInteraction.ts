import { db, interactionsTable, prospectsTable, twilioNumbersTable } from "@workspace/db";
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
    await db.update(interactionsTable)
      .set({ extractionStatus: "skipped", updatedAt: new Date() })
      .where(eq(interactionsTable.id, interactionId));
    return;
  }

  const sourceType = interaction.sourceType as "sms" | "voice" | "voicemail";

  try {
    await db.update(interactionsTable)
      .set({ extractionStatus: "processing", updatedAt: new Date() })
      .where(eq(interactionsTable.id, interactionId));

    const extraction = await extractProspectData(textToAnalyze, sourceType);

    await db.update(interactionsTable)
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

    await upsertProspect(interaction.accountId, interaction.fromNumber, interaction.propertyId, interaction.id, extraction);
  } catch (err) {
    logger.error({ err, interactionId }, "Failed to process interaction");
    await db.update(interactionsTable)
      .set({ extractionStatus: "failed", updatedAt: new Date() })
      .where(eq(interactionsTable.id, interactionId));
  }
}

async function upsertProspect(
  accountId: string,
  fromNumber: string,
  propertyId: string | null,
  interactionId: string,
  extraction: Awaited<ReturnType<typeof extractProspectData>>,
): Promise<void> {
  const existing = await db
    .select()
    .from(prospectsTable)
    .where(and(eq(prospectsTable.accountId, accountId), eq(prospectsTable.phonePrimary, fromNumber)))
    .limit(1);

  const updates: Partial<typeof prospectsTable.$inferInsert> = {
    latestSummary: extraction.summary,
    latestSentiment: extraction.sentiment,
    updatedAt: new Date(),
  };

  if (extraction.email) updates.email = extraction.email;
  if (extraction.desiredBedrooms) updates.desiredBedrooms = extraction.desiredBedrooms;
  if (extraction.desiredMoveInDate) updates.desiredMoveInDate = extraction.desiredMoveInDate;
  if (extraction.budgetMin !== undefined && extraction.budgetMin !== null) updates.budgetMin = String(extraction.budgetMin);
  if (extraction.budgetMax !== undefined && extraction.budgetMax !== null) updates.budgetMax = String(extraction.budgetMax);
  if (extraction.pets) updates.pets = extraction.pets;
  if (extraction.voucherType) updates.voucherType = extraction.voucherType;
  if (extraction.employmentStatus) updates.employmentStatus = extraction.employmentStatus;
  if (extraction.monthlyIncome !== undefined && extraction.monthlyIncome !== null) updates.monthlyIncome = String(extraction.monthlyIncome);
  if (extraction.languagePreference) updates.languagePreference = extraction.languagePreference;

  let prospectId: string;

  if (existing.length > 0) {
    const prospect = existing[0];
    const nameUpdates: Partial<typeof prospectsTable.$inferInsert> = {};
    if (extraction.firstName && !prospect.firstName) nameUpdates.firstName = extraction.firstName;
    if (extraction.lastName && !prospect.lastName) nameUpdates.lastName = extraction.lastName;
    if ((nameUpdates.firstName || nameUpdates.lastName)) {
      const fn = nameUpdates.firstName ?? prospect.firstName;
      const ln = nameUpdates.lastName ?? prospect.lastName;
      nameUpdates.fullName = [fn, ln].filter(Boolean).join(" ");
    }

    await db.update(prospectsTable)
      .set({ ...updates, ...nameUpdates })
      .where(eq(prospectsTable.id, prospect.id));

    prospectId = prospect.id;
  } else {
    const firstName = extraction.firstName ?? null;
    const lastName = extraction.lastName ?? null;
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

    const [newProspect] = await db.insert(prospectsTable)
      .values({
        accountId,
        phonePrimary: fromNumber,
        assignedPropertyId: propertyId ?? undefined,
        firstName,
        lastName,
        fullName,
        email: extraction.email ?? null,
        desiredBedrooms: extraction.desiredBedrooms ?? null,
        desiredMoveInDate: extraction.desiredMoveInDate ?? null,
        budgetMin: extraction.budgetMin !== undefined && extraction.budgetMin !== null ? String(extraction.budgetMin) : null,
        budgetMax: extraction.budgetMax !== undefined && extraction.budgetMax !== null ? String(extraction.budgetMax) : null,
        pets: extraction.pets ?? null,
        voucherType: extraction.voucherType ?? null,
        employmentStatus: extraction.employmentStatus ?? null,
        monthlyIncome: extraction.monthlyIncome !== undefined && extraction.monthlyIncome !== null ? String(extraction.monthlyIncome) : null,
        languagePreference: extraction.languagePreference ?? null,
        latestSummary: extraction.summary,
        latestSentiment: extraction.sentiment,
        status: "new",
        exportStatus: "pending",
      })
      .returning();

    prospectId = newProspect.id;
  }

  await db.update(interactionsTable)
    .set({ prospectId, propertyId: propertyId ?? undefined, updatedAt: new Date() })
    .where(eq(interactionsTable.id, interactionId));
}
