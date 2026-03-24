import { Router, type IRouter, type Request, type Response } from "express";
import { db, interactionsTable, prospectsTable, propertiesTable } from "@workspace/db";
import { eq, and, or, ilike, desc, inArray } from "drizzle-orm";

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

  // Group by prospectId: get one row per prospect (most recent interaction),
  // plus individual rows for orphaned interactions (no prospectId).
  // We do this in application logic: fetch all matching interactions, then group.
  const allInteractions = await db.select()
    .from(interactionsTable)
    .where(whereClause)
    .orderBy(desc(interactionsTable.occurredAt));

  // Group interactions by prospectId
  const prospectGroups = new Map<string, typeof allInteractions>();
  const orphanedInteractions: typeof allInteractions = [];

  for (const interaction of allInteractions) {
    if (interaction.prospectId) {
      const group = prospectGroups.get(interaction.prospectId);
      if (group) {
        group.push(interaction);
      } else {
        prospectGroups.set(interaction.prospectId, [interaction]);
      }
    } else {
      orphanedInteractions.push(interaction);
    }
  }

  // Build ungrouped "virtual" items: one per prospect (most recent) + all orphans
  // Each prospect group is already sorted desc by occurredAt, so first item is most recent.
  interface GroupedItem {
    interaction: (typeof allInteractions)[0];
    messageCount: number;
    prospectId: string | null;
    propertyId: string | null;
  }

  const groupedItems: GroupedItem[] = [];

  for (const [prospectId, interactions] of prospectGroups) {
    groupedItems.push({
      interaction: interactions[0],
      messageCount: interactions.length,
      prospectId,
      propertyId: interactions[0].propertyId ?? null,
    });
  }

  for (const interaction of orphanedInteractions) {
    groupedItems.push({
      interaction,
      messageCount: 1,
      prospectId: null,
      propertyId: interaction.propertyId ?? null,
    });
  }

  // Sort grouped items by most recent interaction desc
  groupedItems.sort((a, b) =>
    new Date(b.interaction.occurredAt).getTime() - new Date(a.interaction.occurredAt).getTime()
  );

  const total = groupedItems.length;
  const paged = groupedItems.slice(offset, offset + limit);

  const prospectIds = [...new Set(paged.map((i) => i.prospectId).filter(Boolean) as string[])];
  const fetchedPropertyIds = [...new Set(paged.map((i) => i.propertyId).filter(Boolean) as string[])];

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

  const items = paged.map((item) => ({
    interaction: item.interaction,
    prospect: item.prospectId ? (prospectMap.get(item.prospectId) ?? null) : null,
    property: item.propertyId ? (propertyMap.get(item.propertyId) ?? null) : null,
    messageCount: item.messageCount,
  }));

  res.json({ items, total });
});

export default router;
