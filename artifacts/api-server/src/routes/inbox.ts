import { Router, type IRouter, type Request, type Response } from "express";
import { db, interactionsTable, prospectsTable, propertiesTable } from "@workspace/db";
import { eq, and, or, ilike, desc, inArray, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/inbox", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const { status, propertyId, sourceType, exportStatus, search } = req.query;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const hasProspectFilter = status || exportStatus || search;

  let allowedProspectIds: string[] | null = null;
  if (hasProspectFilter) {
    const prospectConditions = [eq(prospectsTable.accountId, accountId)];
    if (status) prospectConditions.push(eq(prospectsTable.status, status as string));
    if (exportStatus) prospectConditions.push(eq(prospectsTable.exportStatus, exportStatus as string));
    if (search) {
      prospectConditions.push(
        or(
          ilike(prospectsTable.fullName, `%${search}%`),
          ilike(prospectsTable.phonePrimary, `%${search}%`),
          ilike(prospectsTable.firstName, `%${search}%`),
          ilike(prospectsTable.lastName, `%${search}%`),
        )!,
      );
    }

    const matchingProspects = await db
      .select({ id: prospectsTable.id })
      .from(prospectsTable)
      .where(and(...prospectConditions));

    allowedProspectIds = matchingProspects.map((p) => p.id);
  }

  const interactionConditions = [eq(interactionsTable.accountId, accountId)];
  if (sourceType) interactionConditions.push(eq(interactionsTable.sourceType, sourceType as string));
  if (propertyId) interactionConditions.push(eq(interactionsTable.propertyId, propertyId as string));

  if (allowedProspectIds !== null) {
    if (allowedProspectIds.length === 0) {
      res.json({ items: [], total: 0 });
      return;
    }
    interactionConditions.push(inArray(interactionsTable.prospectId, allowedProspectIds));
  }

  const whereClause = and(...interactionConditions);

  const [interactions, countResult] = await Promise.all([
    db.select()
      .from(interactionsTable)
      .where(whereClause)
      .orderBy(desc(interactionsTable.occurredAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(interactionsTable)
      .where(whereClause),
  ]);

  const prospectIds = [...new Set(interactions.map((i) => i.prospectId).filter(Boolean) as string[])];
  const fetchedPropertyIds = [...new Set(interactions.map((i) => i.propertyId).filter(Boolean) as string[])];

  const [prospects, properties] = await Promise.all([
    prospectIds.length > 0
      ? db.select().from(prospectsTable)
          .where(and(eq(prospectsTable.accountId, accountId), inArray(prospectsTable.id, prospectIds)))
      : Promise.resolve([]),
    fetchedPropertyIds.length > 0
      ? db.select().from(propertiesTable)
          .where(and(eq(propertiesTable.accountId, accountId), inArray(propertiesTable.id, fetchedPropertyIds)))
      : Promise.resolve([]),
  ]);

  const prospectMap = new Map(prospects.map((p) => [p.id, p]));
  const propertyMap = new Map(properties.map((p) => [p.id, p]));

  const items = interactions.map((interaction) => ({
    interaction,
    prospect: interaction.prospectId ? (prospectMap.get(interaction.prospectId) ?? null) : null,
    property: interaction.propertyId ? (propertyMap.get(interaction.propertyId) ?? null) : null,
  }));

  res.json({ items, total: Number(countResult[0]?.count ?? 0) });
});

export default router;
