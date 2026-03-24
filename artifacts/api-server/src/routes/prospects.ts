import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  prospectsTable,
  interactionsTable,
  notesTable,
  tagsTable,
  prospectTagsTable,
} from "@workspace/db";
import { eq, and, or, ilike, inArray, sql } from "drizzle-orm";

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

router.get("/prospects", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { status, exportStatus, propertyId, search } = req.query;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const conditions = [eq(prospectsTable.accountId, accountId)];
  if (status) conditions.push(eq(prospectsTable.status, status as string));
  if (exportStatus) conditions.push(eq(prospectsTable.exportStatus, exportStatus as string));
  if (propertyId) conditions.push(eq(prospectsTable.assignedPropertyId, propertyId as string));
  if (search) {
    const searchStr = `%${search}%`;
    conditions.push(
      or(
        ilike(prospectsTable.fullName, searchStr),
        ilike(prospectsTable.firstName, searchStr),
        ilike(prospectsTable.lastName, searchStr),
        ilike(prospectsTable.phonePrimary, searchStr),
        ilike(prospectsTable.email, searchStr),
      )!,
    );
  }

  const [prospects, countResult] = await Promise.all([
    db.select().from(prospectsTable)
      .where(and(...conditions))
      .orderBy(prospectsTable.updatedAt)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(prospectsTable).where(and(...conditions)),
  ]);

  res.json({ prospects, total: Number(countResult[0]?.count ?? 0) });
});

router.post("/prospects", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { phonePrimary, firstName, lastName, email, assignedPropertyId, status } = req.body;
  if (!phonePrimary) { res.status(400).json({ error: "phonePrimary is required" }); return; }

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  const [prospect] = await db
    .insert(prospectsTable)
    .values({ accountId, phonePrimary, firstName, lastName, fullName, email, assignedPropertyId, status: status ?? "new" })
    .returning();

  res.status(201).json(prospect);
});

router.get("/prospects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { id } = req.params;

  const [prospect] = await db
    .select()
    .from(prospectsTable)
    .where(and(eq(prospectsTable.id, id), eq(prospectsTable.accountId, accountId)));

  if (!prospect) { res.status(404).json({ error: "Not found" }); return; }

  const [interactions, notes, prospectTagRows] = await Promise.all([
    db.select().from(interactionsTable)
      .where(and(eq(interactionsTable.prospectId, id), eq(interactionsTable.accountId, accountId)))
      .orderBy(interactionsTable.occurredAt),
    db.select().from(notesTable)
      .where(and(eq(notesTable.prospectId, id), eq(notesTable.accountId, accountId)))
      .orderBy(notesTable.createdAt),
    db.select().from(prospectTagsTable).where(eq(prospectTagsTable.prospectId, id)),
  ]);

  let tags: typeof tagsTable.$inferSelect[] = [];
  if (prospectTagRows.length > 0) {
    tags = await db.select().from(tagsTable)
      .where(inArray(tagsTable.id, prospectTagRows.map(r => r.tagId)));
  }

  res.json({ prospect, interactions, notes, tags });
});

router.patch("/prospects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { id } = req.params;
  const allowedFields = [
    "firstName", "lastName", "fullName", "email", "phoneSecondary",
    "assignedPropertyId", "desiredMoveInDate", "desiredBedrooms",
    "budgetMin", "budgetMax", "pets", "voucherType", "employmentStatus",
    "monthlyIncome", "languagePreference", "status", "exportStatus", "crmExternalId",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (updates.firstName !== undefined || updates.lastName !== undefined) {
    const existingProspect = await db.select().from(prospectsTable)
      .where(and(eq(prospectsTable.id, id), eq(prospectsTable.accountId, accountId)))
      .limit(1);
    if (existingProspect[0]) {
      const firstName = (updates.firstName ?? existingProspect[0].firstName) as string | null;
      const lastName = (updates.lastName ?? existingProspect[0].lastName) as string | null;
      const parts = [firstName, lastName].filter(Boolean);
      if (parts.length > 0) updates.fullName = parts.join(" ");
    }
  }

  const [prospect] = await db
    .update(prospectsTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(prospectsTable.id, id), eq(prospectsTable.accountId, accountId)))
    .returning();

  if (!prospect) { res.status(404).json({ error: "Not found" }); return; }
  res.json(prospect);
});

router.post("/prospects/:id/notes", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { id } = req.params;
  const { body: noteBody } = req.body;
  if (!noteBody) { res.status(400).json({ error: "body is required" }); return; }

  const [prospect] = await db.select({ id: prospectsTable.id })
    .from(prospectsTable)
    .where(and(eq(prospectsTable.id, id), eq(prospectsTable.accountId, accountId)));

  if (!prospect) { res.status(404).json({ error: "Prospect not found" }); return; }

  const [note] = await db.insert(notesTable)
    .values({ accountId, prospectId: id, userId: req.user!.id, body: noteBody })
    .returning();

  res.status(201).json(note);
});

router.post("/prospects/:id/tags", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { id } = req.params;
  const { tagIds } = req.body;
  if (!Array.isArray(tagIds)) { res.status(400).json({ error: "tagIds must be an array" }); return; }

  const [prospect] = await db.select({ id: prospectsTable.id })
    .from(prospectsTable)
    .where(and(eq(prospectsTable.id, id), eq(prospectsTable.accountId, accountId)));
  if (!prospect) { res.status(404).json({ error: "Prospect not found" }); return; }

  await db.delete(prospectTagsTable).where(eq(prospectTagsTable.prospectId, id));
  if (tagIds.length > 0) {
    await db.insert(prospectTagsTable).values(
      tagIds.map((tagId: string) => ({ prospectId: id, tagId })),
    );
  }

  const tags = tagIds.length > 0
    ? await db.select().from(tagsTable).where(and(inArray(tagsTable.id, tagIds), eq(tagsTable.accountId, accountId)))
    : [];

  res.json({ tags });
});

export default router;
