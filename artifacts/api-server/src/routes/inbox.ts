import { Router, type IRouter, type Request, type Response } from "express";
import { db, interactionsTable, prospectsTable, propertiesTable } from "@workspace/db";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";

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

router.get("/inbox", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { status, propertyId, sourceType, exportStatus, search } = req.query;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const conditions = [eq(interactionsTable.accountId, accountId)];
  if (sourceType) conditions.push(eq(interactionsTable.sourceType, sourceType as string));
  if (propertyId) conditions.push(eq(interactionsTable.propertyId, propertyId as string));

  const interactions = await db
    .select()
    .from(interactionsTable)
    .where(and(...conditions))
    .orderBy(desc(interactionsTable.occurredAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(interactionsTable)
    .where(and(...conditions));

  const prospectIds = [...new Set(interactions.map(i => i.prospectId).filter(Boolean) as string[])];
  const propertyIds = [...new Set(interactions.map(i => i.propertyId).filter(Boolean) as string[])];

  const [prospects, properties] = await Promise.all([
    prospectIds.length > 0
      ? db.select().from(prospectsTable).where(
          and(
            eq(prospectsTable.accountId, accountId),
            status
              ? eq(prospectsTable.status, status as string)
              : sql`1=1`,
            exportStatus
              ? eq(prospectsTable.exportStatus, exportStatus as string)
              : sql`1=1`,
            search
              ? or(
                  ilike(prospectsTable.fullName, `%${search}%`),
                  ilike(prospectsTable.phonePrimary, `%${search}%`),
                )!
              : sql`1=1`,
          ),
        )
      : Promise.resolve([]),
    propertyIds.length > 0
      ? db.select().from(propertiesTable).where(eq(propertiesTable.accountId, accountId))
      : Promise.resolve([]),
  ]);

  const prospectMap = new Map(prospects.map(p => [p.id, p]));
  const propertyMap = new Map(properties.map(p => [p.id, p]));

  const items = interactions.map(interaction => ({
    interaction,
    prospect: interaction.prospectId ? prospectMap.get(interaction.prospectId) ?? null : null,
    property: interaction.propertyId ? propertyMap.get(interaction.propertyId) ?? null : null,
  }));

  const filteredItems = (status || exportStatus || search)
    ? items.filter(item => {
        if (status || exportStatus || search) {
          if (!item.prospect) return false;
        }
        return true;
      })
    : items;

  res.json({ items: filteredItems, total: Number(total[0]?.count ?? 0) });
});

export default router;
