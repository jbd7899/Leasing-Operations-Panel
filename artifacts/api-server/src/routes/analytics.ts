import { Router, type IRouter, type Request, type Response } from "express";
import { db, prospectsTable, interactionsTable, propertiesTable } from "@workspace/db";
import { eq, and, gte, sql, count } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function periodToDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    case "90d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return d;
    }
    default:
      return null;
  }
}

router.get("/analytics/overview", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const period = (req.query.period as string) || "30d";
  const since = periodToDate(period);

  const baseCondition = eq(prospectsTable.accountId, accountId);
  const periodCondition = since
    ? and(baseCondition, gte(prospectsTable.createdAt, since))
    : baseCondition;

  const now = new Date();
  const since7d = new Date(now);
  since7d.setDate(since7d.getDate() - 7);
  const since30d = new Date(now);
  since30d.setDate(since30d.getDate() - 30);

  const [
    totalLeads,
    periodLeads,
    last7dLeads,
    last30dLeads,
    statusCounts,
    sourceCounts,
    exportQueueCounts,
    propertyLeadCounts,
    weeklyTrend,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(prospectsTable)
      .where(baseCondition),

    db
      .select({ count: count() })
      .from(prospectsTable)
      .where(periodCondition ?? baseCondition),

    db
      .select({ count: count() })
      .from(prospectsTable)
      .where(and(baseCondition, gte(prospectsTable.createdAt, since7d))),

    db
      .select({ count: count() })
      .from(prospectsTable)
      .where(and(baseCondition, gte(prospectsTable.createdAt, since30d))),

    db
      .select({ status: prospectsTable.status, count: count() })
      .from(prospectsTable)
      .where(periodCondition ?? baseCondition)
      .groupBy(prospectsTable.status),

    db
      .select({ sourceType: interactionsTable.sourceType, count: count() })
      .from(interactionsTable)
      .where(
        since
          ? and(
              eq(interactionsTable.accountId, accountId),
              eq(interactionsTable.direction, "inbound"),
              gte(interactionsTable.occurredAt, since),
            )
          : and(
              eq(interactionsTable.accountId, accountId),
              eq(interactionsTable.direction, "inbound"),
            ),
      )
      .groupBy(interactionsTable.sourceType),

    db
      .select({ exportStatus: prospectsTable.exportStatus, count: count() })
      .from(prospectsTable)
      .where(baseCondition)
      .groupBy(prospectsTable.exportStatus),

    db
      .select({
        propertyId: prospectsTable.assignedPropertyId,
        count: count(),
      })
      .from(prospectsTable)
      .where(periodCondition ?? baseCondition)
      .groupBy(prospectsTable.assignedPropertyId),

    db.execute(sql`
      SELECT
        to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week,
        count(*)::int AS count
      FROM prospects
      WHERE account_id = ${accountId}
        AND created_at >= NOW() - INTERVAL '28 days'
      GROUP BY date_trunc('week', created_at)
      ORDER BY week ASC
    `),
  ]);

  const totalCount = Number(totalLeads[0]?.count ?? 0);
  const periodCount = Number(periodLeads[0]?.count ?? 0);
  const last7dCount = Number(last7dLeads[0]?.count ?? 0);
  const last30dCount = Number(last30dLeads[0]?.count ?? 0);

  const statusMap: Record<string, number> = {};
  for (const row of statusCounts) {
    statusMap[row.status] = Number(row.count);
  }

  const sourceMap: Record<string, number> = {};
  for (const row of sourceCounts) {
    if (row.sourceType) sourceMap[row.sourceType] = Number(row.count);
  }

  const exportMap: Record<string, number> = {};
  for (const row of exportQueueCounts) {
    exportMap[row.exportStatus] = Number(row.count);
  }

  const qualifiedCount = statusMap["qualified"] ?? 0;
  const qualificationRate = periodCount > 0 ? (qualifiedCount / periodCount) * 100 : 0;

  const propertyIds = propertyLeadCounts
    .filter((r) => r.propertyId)
    .map((r) => r.propertyId as string);

  let propertiesData: { id: string; name: string }[] = [];
  if (propertyIds.length > 0) {
    propertiesData = await db
      .select({ id: propertiesTable.id, name: propertiesTable.name })
      .from(propertiesTable)
      .where(eq(propertiesTable.accountId, accountId));
  }

  const propertyMap = new Map(propertiesData.map((p) => [p.id, p.name]));
  const propertiesRanked = propertyLeadCounts
    .filter((r) => r.propertyId)
    .map((r) => ({
      propertyId: r.propertyId as string,
      propertyName: propertyMap.get(r.propertyId as string) ?? "Unknown",
      count: Number(r.count),
    }))
    .sort((a, b) => b.count - a.count);

  const unassignedCount = propertyLeadCounts.find((r) => !r.propertyId);
  if (unassignedCount && Number(unassignedCount.count) > 0) {
    propertiesRanked.push({
      propertyId: "",
      propertyName: "Unassigned",
      count: Number(unassignedCount.count),
    });
  }

  const trendRows = (weeklyTrend.rows ?? []) as { week: string; count: number }[];

  res.json({
    period,
    leadVolume: {
      total: totalCount,
      periodCount,
      last7d: last7dCount,
      last30d: last30dCount,
      weeklyTrend: trendRows,
    },
    sourceMix: {
      sms: sourceMap["sms"] ?? 0,
      voice: sourceMap["voice"] ?? 0,
      voicemail: sourceMap["voicemail"] ?? 0,
    },
    statusFunnel: {
      new: statusMap["new"] ?? 0,
      contacted: statusMap["contacted"] ?? 0,
      qualified: statusMap["qualified"] ?? 0,
      disqualified: statusMap["disqualified"] ?? 0,
    },
    qualificationRate: Math.round(qualificationRate * 10) / 10,
    propertiesRanked,
    exportPipeline: {
      pending: exportMap["pending"] ?? 0,
      exported: exportMap["exported"] ?? 0,
    },
  });
});

export default router;
