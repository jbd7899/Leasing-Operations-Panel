import { Router, type IRouter, type Request, type Response } from "express";
import { db, interactionsTable, prospectsTable, propertiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/interactions/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

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
  const { accountId } = req.user!;

  const { id } = req.params;
  const { summary, category, propertyId, prospectId, structuredExtractionJson } = req.body;

  if (propertyId !== undefined) {
    const [property] = await db.select({ id: propertiesTable.id })
      .from(propertiesTable)
      .where(and(eq(propertiesTable.id, propertyId), eq(propertiesTable.accountId, accountId)));
    if (!property) {
      res.status(400).json({ error: "propertyId does not belong to this account" });
      return;
    }
  }

  if (prospectId !== undefined) {
    const [prospect] = await db.select({ id: prospectsTable.id })
      .from(prospectsTable)
      .where(and(eq(prospectsTable.id, prospectId), eq(prospectsTable.accountId, accountId)));
    if (!prospect) {
      res.status(400).json({ error: "prospectId does not belong to this account" });
      return;
    }
  }

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
