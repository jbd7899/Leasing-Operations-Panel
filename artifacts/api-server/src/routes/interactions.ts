import { Router, type IRouter, type Request, type Response } from "express";
import { db, interactionsTable, prospectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function getAccountId(req: Request): string | null {
  if (!req.isAuthenticated()) return null;
  return (req.user as any).accountId ?? null;
}

router.get("/interactions/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { id } = req.params;
  const [interaction] = await db
    .select()
    .from(interactionsTable)
    .where(and(eq(interactionsTable.id, id), eq(interactionsTable.accountId, accountId)));

  if (!interaction) { res.status(404).json({ error: "Not found" }); return; }
  res.json(interaction);
});

router.patch("/interactions/:id/review", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { id } = req.params;
  const { summary, category, propertyId, prospectId, structuredExtractionJson } = req.body;

  const updates: Record<string, unknown> = {};
  if (summary !== undefined) updates.summary = summary;
  if (category !== undefined) updates.category = category;
  if (propertyId !== undefined) updates.propertyId = propertyId;
  if (prospectId !== undefined) updates.prospectId = prospectId;
  if (structuredExtractionJson !== undefined) updates.structuredExtractionJson = structuredExtractionJson;

  const [interaction] = await db
    .update(interactionsTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(interactionsTable.id, id), eq(interactionsTable.accountId, accountId)))
    .returning();

  if (!interaction) { res.status(404).json({ error: "Not found" }); return; }

  if (interaction.prospectId && interaction.summary) {
    await db.update(prospectsTable)
      .set({ latestSummary: interaction.summary, latestSentiment: interaction.sentiment ?? undefined, updatedAt: new Date() })
      .where(and(eq(prospectsTable.id, interaction.prospectId), eq(prospectsTable.accountId, accountId)));
  }

  res.json(interaction);
});

export default router;
