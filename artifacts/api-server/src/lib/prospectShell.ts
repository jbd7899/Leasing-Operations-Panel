import { db, prospectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export type MatchConfidence = "exact" | "new";

export function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1") return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return phone;
}

export async function findOrCreateProspectShell(
  accountId: string,
  phonePrimary: string,
  propertyId: string | null,
): Promise<{ id: string; confidence: MatchConfidence }> {
  const [existing] = await db
    .select({ id: prospectsTable.id })
    .from(prospectsTable)
    .where(and(eq(prospectsTable.accountId, accountId), eq(prospectsTable.phonePrimary, phonePrimary)))
    .limit(1);

  if (existing) return { id: existing.id, confidence: "exact" };

  const [created] = await db
    .insert(prospectsTable)
    .values({
      accountId,
      phonePrimary,
      assignedPropertyId: propertyId ?? undefined,
      status: "new",
      exportStatus: "pending",
    })
    .onConflictDoNothing()
    .returning({ id: prospectsTable.id });

  if (created) return { id: created.id, confidence: "new" };

  const [raceWinner] = await db
    .select({ id: prospectsTable.id })
    .from(prospectsTable)
    .where(and(eq(prospectsTable.accountId, accountId), eq(prospectsTable.phonePrimary, phonePrimary)))
    .limit(1);

  return { id: raceWinner!.id, confidence: "exact" };
}
