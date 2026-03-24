import { Router, type IRouter, type Request, type Response } from "express";
import { db, exportBatchesTable, exportBatchItemsTable, prospectsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

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

router.get("/exports", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const exports = await db
    .select()
    .from(exportBatchesTable)
    .where(eq(exportBatchesTable.accountId, accountId))
    .orderBy(exportBatchesTable.createdAt);

  res.json({ exports });
});

router.post("/exports", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { prospectIds, format, targetSystem } = req.body;
  if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
    res.status(400).json({ error: "prospectIds must be a non-empty array" });
    return;
  }
  if (!format || !["csv", "json"].includes(format)) {
    res.status(400).json({ error: "format must be 'csv' or 'json'" });
    return;
  }

  const [batch] = await db.insert(exportBatchesTable).values({
    accountId,
    createdByUserId: req.user!.id,
    format,
    targetSystem,
    recordCount: prospectIds.length,
    status: "completed",
  }).returning();

  await db.insert(exportBatchItemsTable).values(
    prospectIds.map((pid: string) => ({ exportBatchId: batch.id, prospectId: pid })),
  );

  await db.update(prospectsTable)
    .set({ exportStatus: "exported", updatedAt: new Date() })
    .where(and(inArray(prospectsTable.id, prospectIds), eq(prospectsTable.accountId, accountId)));

  res.status(201).json(batch);
});

router.get("/exports/:id/download", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { id } = req.params;
  const [batch] = await db.select().from(exportBatchesTable)
    .where(and(eq(exportBatchesTable.id, id), eq(exportBatchesTable.accountId, accountId)));

  if (!batch) { res.status(404).json({ error: "Not found" }); return; }

  const items = await db.select().from(exportBatchItemsTable)
    .where(eq(exportBatchItemsTable.exportBatchId, id));

  const prospectIds = items.map(i => i.prospectId);
  const prospects = prospectIds.length > 0
    ? await db.select().from(prospectsTable).where(inArray(prospectsTable.id, prospectIds))
    : [];

  if (batch.format === "csv") {
    const headers = [
      "prospect_id", "first_name", "last_name", "full_name", "phone", "email",
      "desired_bedrooms", "desired_move_in_date", "budget_min", "budget_max",
      "pets", "voucher_type", "employment_status", "monthly_income",
      "lead_status", "export_status",
    ];
    const rows = prospects.map(p => [
      p.id, p.firstName ?? "", p.lastName ?? "", p.fullName ?? "",
      p.phonePrimary, p.email ?? "",
      p.desiredBedrooms ?? "", p.desiredMoveInDate ?? "",
      p.budgetMin ?? "", p.budgetMax ?? "",
      p.pets ?? "", p.voucherType ?? "", p.employmentStatus ?? "", p.monthlyIncome ?? "",
      p.status, p.exportStatus,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="export-${id}.csv"`);
    res.send(csv);
  } else {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="export-${id}.json"`);
    res.json({ exportBatchId: id, prospects });
  }
});

export default router;
