import { Router, type IRouter, type Request, type Response } from "express";
import { db, prospectsTable, interactionsTable, propertiesTable } from "@workspace/db";
import { eq, and, gte, lt, sql, count, inArray } from "drizzle-orm";

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

function periodDays(period: string): number | null {
  switch (period) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    default: return null;
  }
}

router.get("/analytics/overview", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const period = (req.query.period as string) || "30d";
  const since = periodToDate(period);
  const days = periodDays(period);

  const baseCondition = eq(prospectsTable.accountId, accountId);
  const periodCondition = since
    ? and(baseCondition, gte(prospectsTable.createdAt, since))
    : baseCondition;

  const now = new Date();
  const since7d = new Date(now);
  since7d.setDate(since7d.getDate() - 7);
  const since30d = new Date(now);
  since30d.setDate(since30d.getDate() - 30);

  let prevWindowStart: Date | null = null;
  let prevWindowEnd: Date | null = null;
  if (since && days !== null) {
    prevWindowEnd = new Date(since);
    prevWindowStart = new Date(since);
    prevWindowStart.setDate(prevWindowStart.getDate() - days);
  }

  const queries: Promise<unknown>[] = [
    db.select({ count: count() }).from(prospectsTable).where(baseCondition),
    db.select({ count: count() }).from(prospectsTable).where(periodCondition ?? baseCondition),
    db.select({ count: count() }).from(prospectsTable).where(and(baseCondition, gte(prospectsTable.createdAt, since7d))),
    db.select({ count: count() }).from(prospectsTable).where(and(baseCondition, gte(prospectsTable.createdAt, since30d))),
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
      .select({ count: count() })
      .from(prospectsTable)
      .where(and(baseCondition, eq(prospectsTable.exportStatus, "pending"))),
    db
      .select({ count: count() })
      .from(prospectsTable)
      .where(and(baseCondition, eq(prospectsTable.exportStatus, "exported"), gte(prospectsTable.updatedAt, since30d))),
    db
      .select({ propertyId: prospectsTable.assignedPropertyId, count: count() })
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
    prevWindowStart && prevWindowEnd
      ? db
          .select({ status: prospectsTable.status, count: count() })
          .from(prospectsTable)
          .where(and(baseCondition, gte(prospectsTable.createdAt, prevWindowStart), lt(prospectsTable.createdAt, prevWindowEnd)))
          .groupBy(prospectsTable.status)
      : Promise.resolve([]),
  ];

  const results = await Promise.all(queries);

  const [
    totalLeads,
    periodLeads,
    last7dLeads,
    last30dLeads,
    statusCounts,
    sourceCounts,
    pendingExportCounts,
    exportedLast30dCounts,
    propertyLeadCounts,
    weeklyTrend,
    prevStatusCounts,
  ] = results as [
    { count: number }[],
    { count: number }[],
    { count: number }[],
    { count: number }[],
    { status: string; count: number }[],
    { sourceType: string | null; count: number }[],
    { count: number }[],
    { count: number }[],
    { propertyId: string | null; count: number }[],
    { rows: { week: string; count: number }[] },
    { status: string; count: number }[],
  ];

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

  const pendingCount = Number(pendingExportCounts[0]?.count ?? 0);
  const exportedLast30d = Number(exportedLast30dCounts[0]?.count ?? 0);

  const qualifiedCount = statusMap["qualified"] ?? 0;
  const qualificationRate = periodCount > 0 ? (qualifiedCount / periodCount) * 100 : 0;

  const prevStatusMap: Record<string, number> = {};
  for (const row of prevStatusCounts) {
    prevStatusMap[row.status] = Number(row.count);
  }

  let qualificationRateDelta: number | null = null;
  if (prevWindowStart) {
    const prevPeriodTotal = Object.values(prevStatusMap).reduce((a, b) => a + b, 0);
    const prevQualified = prevStatusMap["qualified"] ?? 0;
    const prevRate = prevPeriodTotal > 0 ? (prevQualified / prevPeriodTotal) * 100 : 0;
    qualificationRateDelta = Math.round((qualificationRate - prevRate) * 10) / 10;
  }

  const propertyIds = propertyLeadCounts.filter((r) => r.propertyId).map((r) => r.propertyId as string);
  let propertiesData: { id: string; name: string }[] = [];
  if (propertyIds.length > 0) {
    propertiesData = await db
      .select({ id: propertiesTable.id, name: propertiesTable.name })
      .from(propertiesTable)
      .where(and(eq(propertiesTable.accountId, accountId), inArray(propertiesTable.id, propertyIds)));
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

  const unassignedRow = propertyLeadCounts.find((r) => !r.propertyId);
  if (unassignedRow && Number(unassignedRow.count) > 0) {
    propertiesRanked.push({
      propertyId: "",
      propertyName: "Unassigned",
      count: Number(unassignedRow.count),
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
    qualificationRateDelta,
    propertiesRanked,
    exportPipeline: {
      pending: pendingCount,
      exportedLast30d,
    },
  });
});

export default router;
