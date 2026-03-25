import { Router, type IRouter, type Request, type Response } from "express";
import { logEvent } from "../lib/logEvent";
import {
  db,
  prospectsTable,
  interactionsTable,
  notesTable,
  tagsTable,
  prospectTagsTable,
  propertiesTable,
  prospectConflictsTable,
} from "@workspace/db";
import { eq, and, or, ilike, inArray, isNull, sql } from "drizzle-orm";

async function validatePropertyOwnership(propertyId: string, accountId: string): Promise<boolean> {
  const [property] = await db.select({ id: propertiesTable.id })
    .from(propertiesTable)
    .where(and(eq(propertiesTable.id, propertyId), eq(propertiesTable.accountId, accountId)));
  return !!property;
}

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/prospects", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

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
  const { accountId } = req.user!;

  const { phonePrimary, firstName, lastName, email, assignedPropertyId, status } = req.body;
  if (!phonePrimary) { res.status(400).json({ error: "phonePrimary is required" }); return; }

  if (assignedPropertyId) {
    const valid = await validatePropertyOwnership(assignedPropertyId, accountId);
    if (!valid) { res.status(400).json({ error: "assignedPropertyId does not belong to this account" }); return; }
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  const [prospect] = await db
    .insert(prospectsTable)
    .values({ accountId, phonePrimary, firstName, lastName, fullName, email, assignedPropertyId, status: status ?? "new" })
    .returning();

  res.status(201).json(prospect);
});

router.get("/prospects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

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
    const tagIds = prospectTagRows.map((r) => r.tagId);
    tags = await db.select().from(tagsTable)
      .where(and(
        inArray(tagsTable.id, tagIds),
        eq(tagsTable.accountId, accountId),
      ));
  }

  res.json({ prospect, interactions, notes, tags });
});

router.patch("/prospects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

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

  if (updates.assignedPropertyId) {
    const valid = await validatePropertyOwnership(updates.assignedPropertyId as string, accountId);
    if (!valid) { res.status(400).json({ error: "assignedPropertyId does not belong to this account" }); return; }
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

  const [existingBeforeUpdate] = await db.select({ status: prospectsTable.status, exportStatus: prospectsTable.exportStatus })
    .from(prospectsTable)
    .where(and(eq(prospectsTable.id, id), eq(prospectsTable.accountId, accountId)))
    .limit(1);

  const [prospect] = await db
    .update(prospectsTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(prospectsTable.id, id), eq(prospectsTable.accountId, accountId)))
    .returning();

  if (!prospect) { res.status(404).json({ error: "Not found" }); return; }

  if (existingBeforeUpdate && updates.status && updates.status !== existingBeforeUpdate.status) {
    logEvent({
      accountId,
      eventType: "funnel",
      eventName: "prospect_status_changed",
      prospectId: id as string,
      previousStateJson: { status: existingBeforeUpdate.status },
      newStateJson: { status: updates.status },
    });
  }

  if (existingBeforeUpdate && updates.exportStatus && updates.exportStatus !== existingBeforeUpdate.exportStatus) {
    logEvent({
      accountId,
      eventType: "funnel",
      eventName: "prospect_export_status_changed",
      prospectId: id as string,
      previousStateJson: { exportStatus: existingBeforeUpdate.exportStatus },
      newStateJson: { exportStatus: updates.exportStatus },
    });
  }

  res.json(prospect);
});

router.post("/prospects/:id/notes", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

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
  const { accountId } = req.user!;

  const { id } = req.params;
  const { tagIds } = req.body;
  if (!Array.isArray(tagIds)) { res.status(400).json({ error: "tagIds must be an array" }); return; }

  const [prospect] = await db.select({ id: prospectsTable.id })
    .from(prospectsTable)
    .where(and(eq(prospectsTable.id, id), eq(prospectsTable.accountId, accountId)));
  if (!prospect) { res.status(404).json({ error: "Prospect not found" }); return; }

  let validatedTagIds: string[] = [];
  if (tagIds.length > 0) {
    const ownedTags = await db.select({ id: tagsTable.id })
      .from(tagsTable)
      .where(and(inArray(tagsTable.id, tagIds), eq(tagsTable.accountId, accountId)));
    validatedTagIds = ownedTags.map((t) => t.id);

    if (validatedTagIds.length !== tagIds.length) {
      res.status(400).json({ error: "One or more tagIds do not belong to this account" });
      return;
    }
  }

  await db.delete(prospectTagsTable).where(eq(prospectTagsTable.prospectId, id));
  if (validatedTagIds.length > 0) {
    await db.insert(prospectTagsTable).values(
      validatedTagIds.map((tagId) => ({ prospectId: id, tagId })),
    );
  }

  const tags = validatedTagIds.length > 0
    ? await db.select().from(tagsTable).where(and(inArray(tagsTable.id, validatedTagIds), eq(tagsTable.accountId, accountId)))
    : [];

  res.json({ tags });
});

router.get("/prospects/:id/conflicts", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;
  const { id } = req.params;

  const [prospect] = await db.select({ id: prospectsTable.id })
    .from(prospectsTable)
    .where(and(eq(prospectsTable.id, id), eq(prospectsTable.accountId, accountId)));

  if (!prospect) { res.status(404).json({ error: "Not found" }); return; }

  const conflicts = await db.select()
    .from(prospectConflictsTable)
    .where(
      and(
        eq(prospectConflictsTable.prospectId, id),
        eq(prospectConflictsTable.accountId, accountId),
        isNull(prospectConflictsTable.resolvedAt),
      ),
    );

  res.json({ conflicts });
});

router.post("/prospects/:id/conflicts/:fieldName/resolve", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;
  const { id, fieldName } = req.params;
  const { chosenValue } = req.body;

  if (chosenValue === undefined) { res.status(400).json({ error: "chosenValue is required" }); return; }

  const [prospect] = await db.select()
    .from(prospectsTable)
    .where(and(eq(prospectsTable.id, id), eq(prospectsTable.accountId, accountId)));

  if (!prospect) { res.status(404).json({ error: "Not found" }); return; }

  const [conflict] = await db.select()
    .from(prospectConflictsTable)
    .where(
      and(
        eq(prospectConflictsTable.prospectId, id),
        eq(prospectConflictsTable.accountId, accountId),
        eq(prospectConflictsTable.fieldName, fieldName),
        isNull(prospectConflictsTable.resolvedAt),
      ),
    )
    .limit(1);

  if (!conflict) { res.status(404).json({ error: "Conflict not found" }); return; }

  await db
    .update(prospectConflictsTable)
    .set({ chosenValue, resolvedAt: new Date(), updatedAt: new Date() })
    .where(eq(prospectConflictsTable.id, conflict.id));

  const fieldToProspectKey: Record<string, string> = {
    firstName: "firstName",
    lastName: "lastName",
    phone: "phonePrimary",
    email: "email",
    desiredBedrooms: "desiredBedrooms",
    desiredMoveInDate: "desiredMoveInDate",
    budgetMin: "budgetMin",
    budgetMax: "budgetMax",
    pets: "pets",
    voucherType: "voucherType",
  };

  const prospectField = fieldToProspectKey[fieldName];
  if (prospectField) {
    const updatePayload: Record<string, unknown> = { [prospectField]: chosenValue, updatedAt: new Date() };

    if (fieldName === "firstName" || fieldName === "lastName") {
      const fn = fieldName === "firstName" ? chosenValue : prospect.firstName;
      const ln = fieldName === "lastName" ? chosenValue : prospect.lastName;
      const parts = [fn, ln].filter(Boolean);
      if (parts.length > 0) updatePayload.fullName = parts.join(" ");
    }

    await db
      .update(prospectsTable)
      .set(updatePayload)
      .where(and(eq(prospectsTable.id, id), eq(prospectsTable.accountId, accountId)));
  }

  const [updatedConflict] = await db.select()
    .from(prospectConflictsTable)
    .where(eq(prospectConflictsTable.id, conflict.id));

  res.json({ conflict: updatedConflict });
});

export default router;
