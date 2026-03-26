import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  appEventsTable,
  founderObservationsTable,
  prospectsTable,
  interactionsTable,
  propertiesTable,
  exportBatchesTable,
  accountUsersTable,
  notesTable,
} from "@workspace/db";
import { eq, and, gte, sql, count, desc, lt, inArray } from "drizzle-orm";
import { logEvent } from "../lib/logEvent";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

async function requireOwner(req: Request, res: Response): Promise<boolean> {
  if (!requireAuth(req, res)) return false;
  const user = req.user! as typeof req.user & { id: string };
  const { accountId } = user;
  const userId = user.id;
  const [accountUser] = await db
    .select({ role: accountUsersTable.role })
    .from(accountUsersTable)
    .where(and(eq(accountUsersTable.accountId, accountId), eq(accountUsersTable.userId, userId)))
    .limit(1);
  if (!accountUser || accountUser.role !== "owner") {
    res.status(403).json({ error: "Founder access only" });
    return false;
  }
  return true;
}

function sinceDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

router.get("/founder/dashboard", async (req: Request, res: Response) => {
  if (!(await requireOwner(req, res))) return;
  const { accountId } = req.user!;

  const since7d = sinceDate(7);
  const since24h = sinceDate(1);

  const [
    leadsToday,
    leadsThisWeek,
    statusCounts,
    exportReady,
    exportedLeads,
    allInteractions,
    doneExtractions,
    fieldEditedEvents,
    reviewCompletedEvents,
    reviewTimeRows,
    perPropertyRows,
    latestObservations,
    stuckLeadsRows,
    reviewLagPerPropertyRows,
    missingFieldsRows,
    snoozedLeadsRows,
  ] = await Promise.all([
    db.select({ count: count() }).from(prospectsTable)
      .where(and(eq(prospectsTable.accountId, accountId), gte(prospectsTable.createdAt, sinceDate(1)))),
    db.select({ count: count() }).from(prospectsTable)
      .where(and(eq(prospectsTable.accountId, accountId), gte(prospectsTable.createdAt, since7d))),
    db.select({ status: prospectsTable.status, count: count() }).from(prospectsTable)
      .where(eq(prospectsTable.accountId, accountId)).groupBy(prospectsTable.status),
    db.select({ count: count() }).from(prospectsTable)
      .where(and(eq(prospectsTable.accountId, accountId), eq(prospectsTable.exportStatus, "pending"), eq(prospectsTable.status, "qualified"))),
    db.select({ count: count() }).from(prospectsTable)
      .where(and(eq(prospectsTable.accountId, accountId), eq(prospectsTable.exportStatus, "exported"))),
    db.select({ count: count() }).from(interactionsTable)
      .where(and(eq(interactionsTable.accountId, accountId), eq(interactionsTable.direction, "inbound"))),
    db.select({ count: count() }).from(interactionsTable)
      .where(and(eq(interactionsTable.accountId, accountId), eq(interactionsTable.extractionStatus, "done"))),
    db.select({ count: count() }).from(appEventsTable)
      .where(and(eq(appEventsTable.accountId, accountId), eq(appEventsTable.eventName, "field_edited"))),
    db.select({ count: count() }).from(appEventsTable)
      .where(and(eq(appEventsTable.accountId, accountId), eq(appEventsTable.eventName, "review_completed"))),
    db.execute(sql`
      SELECT
        EXTRACT(EPOCH FROM (e_new.event_timestamp - e_open.event_timestamp)) as review_seconds
      FROM app_events e_open
      JOIN app_events e_new ON e_new.interaction_id = e_open.interaction_id
        AND e_new.event_name = 'review_completed'
        AND e_new.account_id = ${accountId}
      WHERE e_open.event_name = 'interaction_opened'
        AND e_open.account_id = ${accountId}
      LIMIT 1000
    `),
    db.select({
      propertyId: prospectsTable.assignedPropertyId,
      inboundLeads: count(),
    }).from(prospectsTable)
      .where(eq(prospectsTable.accountId, accountId))
      .groupBy(prospectsTable.assignedPropertyId),
    db.select().from(founderObservationsTable)
      .where(eq(founderObservationsTable.accountId, accountId))
      .orderBy(desc(founderObservationsTable.createdAt))
      .limit(5),
    db.select({ count: count() }).from(prospectsTable)
      .where(and(
        eq(prospectsTable.accountId, accountId),
        eq(prospectsTable.status, "new"),
        lt(prospectsTable.updatedAt, since24h),
      )),
    db.execute(sql`
      SELECT
        p.assigned_property_id as property_id,
        AVG(EXTRACT(EPOCH FROM (e_done.event_timestamp - e_open.event_timestamp))) as avg_review_lag_seconds,
        COUNT(e_done.id) as review_count
      FROM app_events e_open
      JOIN app_events e_done ON e_done.interaction_id = e_open.interaction_id
        AND e_done.event_name = 'review_completed'
        AND e_done.account_id = ${accountId}
      LEFT JOIN interactions i ON i.id = e_open.interaction_id
      LEFT JOIN prospects p ON p.id = i.prospect_id
      WHERE e_open.event_name = 'interaction_opened'
        AND e_open.account_id = ${accountId}
      GROUP BY p.assigned_property_id
    `),
    db.execute(sql`
      SELECT
        CASE
          WHEN budget_min IS NULL AND budget_max IS NULL THEN 'budget'
          WHEN desired_move_in_date IS NULL THEN 'move_in_date'
          WHEN desired_bedrooms IS NULL THEN 'bedrooms'
          WHEN email IS NULL THEN 'email'
          ELSE 'other'
        END as missing_field,
        COUNT(*) as count
      FROM prospects
      WHERE account_id = ${accountId}
        AND status NOT IN ('disqualified','closed')
        AND (
          (budget_min IS NULL AND budget_max IS NULL)
          OR desired_move_in_date IS NULL
          OR desired_bedrooms IS NULL
          OR email IS NULL
        )
      GROUP BY 1
      ORDER BY count DESC
    `),
    db.select({ count: count() }).from(prospectsTable)
      .where(and(
        eq(prospectsTable.accountId, accountId),
        eq(prospectsTable.status, "contacted"),
        lt(prospectsTable.updatedAt, since7d),
      )),
  ]);

  const statusMap: Record<string, number> = {};
  for (const row of statusCounts) statusMap[row.status] = Number(row.count);

  const totalLeads = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const qualifiedCount = statusMap["qualified"] ?? 0;
  const captureRate = totalLeads > 0 ? Math.round((qualifiedCount / totalLeads) * 100 * 10) / 10 : 0;

  const totalDoneExtractions = Number(doneExtractions[0]?.count ?? 0);
  const totalAllInteractions = Number(allInteractions[0]?.count ?? 0);
  const aiExtractionSuccessRate = totalAllInteractions > 0
    ? Math.round((totalDoneExtractions / totalAllInteractions) * 100 * 10) / 10
    : 0;

  const totalReviews = Number(reviewCompletedEvents[0]?.count ?? 0);
  const totalFieldEdits = Number(fieldEditedEvents[0]?.count ?? 0);
  const editsPerLead = totalReviews > 0 ? Math.round((totalFieldEdits / totalReviews) * 10) / 10 : 0;

  const reviewRows = (reviewTimeRows.rows ?? []) as { review_seconds: string | null }[];
  const reviewSeconds = reviewRows.map((r) => Number(r.review_seconds ?? 0)).filter((v) => v > 0);
  const avgReviewSeconds = reviewSeconds.length > 0
    ? Math.round(reviewSeconds.reduce((a, b) => a + b, 0) / reviewSeconds.length)
    : null;

  const propertyIds = perPropertyRows.filter((r) => r.propertyId).map((r) => r.propertyId as string);
  let propertyNames: { id: string; name: string }[] = [];
  if (propertyIds.length > 0) {
    propertyNames = await db.select({ id: propertiesTable.id, name: propertiesTable.name })
      .from(propertiesTable).where(and(eq(propertiesTable.accountId, accountId)));
  }
  const propNameMap = new Map(propertyNames.map((p) => [p.id, p.name]));

  const reviewLagPerProperty = (reviewLagPerPropertyRows.rows as {
    property_id: string | null;
    avg_review_lag_seconds: string | null;
    review_count: string;
  }[]).map((r) => ({
    propertyId: r.property_id ?? "unassigned",
    propertyName: r.property_id ? (propNameMap.get(r.property_id) ?? "Unknown") : "Unassigned",
    avgReviewLagSeconds: r.avg_review_lag_seconds != null ? Math.round(Number(r.avg_review_lag_seconds)) : null,
    reviewCount: Number(r.review_count),
  }));

  const missingFields = (missingFieldsRows.rows as { missing_field: string; count: string }[]).map((r) => ({
    field: r.missing_field,
    count: Number(r.count),
  }));

  const stuckLeadCount = Number(stuckLeadsRows[0]?.count ?? 0);
  const snoozedLeadCount = Number(snoozedLeadsRows[0]?.count ?? 0);

  const propertyPerformance = perPropertyRows
    .filter((r) => r.propertyId)
    .map((r) => ({
      propertyId: r.propertyId!,
      propertyName: propNameMap.get(r.propertyId!) ?? "Unknown",
      inboundLeads: Number(r.inboundLeads),
    }))
    .sort((a, b) => b.inboundLeads - a.inboundLeads);

  const backlogCount = (statusMap["new"] ?? 0) + (statusMap["contacted"] ?? 0);

  res.json({
    summary: {
      leadsToday: Number(leadsToday[0]?.count ?? 0),
      leadsThisWeek: Number(leadsThisWeek[0]?.count ?? 0),
      backlog: backlogCount,
      exportReady: Number(exportReady[0]?.count ?? 0),
      avgReviewSeconds,
      aiAcceptanceRate: totalReviews > 0
        ? Math.round(((totalReviews - totalFieldEdits) / totalReviews) * 100 * 10) / 10
        : null,
      captureRate,
    },
    funnel: {
      new: statusMap["new"] ?? 0,
      contacted: statusMap["contacted"] ?? 0,
      qualified: statusMap["qualified"] ?? 0,
      disqualified: statusMap["disqualified"] ?? 0,
      closed: statusMap["closed"] ?? 0,
      stuckInNew: stuckLeadCount,
      snoozedInContacted: snoozedLeadCount,
    },
    propertyPerformance,
    reviewLagPerProperty,
    missingFields,
    aiPerformance: {
      extractionSuccessRate: aiExtractionSuccessRate,
      totalExtractions: totalAllInteractions,
      successfulExtractions: totalDoneExtractions,
      topFieldEditCount: totalFieldEdits,
    },
    workflowFriction: {
      editsPerLead,
      totalReviews,
      stuckLeads: stuckLeadCount,
      totalLeads,
    },
    exportPipeline: {
      exportReady: Number(exportReady[0]?.count ?? 0),
      exported: Number(exportedLeads[0]?.count ?? 0),
      exportableRate: totalLeads > 0 ? Math.round((qualifiedCount / totalLeads) * 100 * 10) / 10 : 0,
    },
    latestObservations,
  });
});

router.get("/founder/ai-performance", async (req: Request, res: Response) => {
  if (!(await requireOwner(req, res))) return;
  const { accountId } = req.user!;

  const [
    extractionStats,
    confidenceRows,
    topCorrectedFields,
    summaryEditRows,
    totalReviewRows,
  ] = await Promise.all([
    db.select({ status: interactionsTable.extractionStatus, count: count() })
      .from(interactionsTable)
      .where(eq(interactionsTable.accountId, accountId))
      .groupBy(interactionsTable.extractionStatus),
    db.execute(sql`
      SELECT AVG(extraction_confidence::numeric) as avg_confidence
      FROM interactions
      WHERE account_id = ${accountId}
        AND extraction_status = 'done'
        AND extraction_confidence IS NOT NULL
    `),
    db.execute(sql`
      SELECT
        previous_state_json->>'field' as field,
        COUNT(*) as edit_count
      FROM app_events
      WHERE account_id = ${accountId}
        AND event_name = 'field_edited'
        AND previous_state_json->>'field' IS NOT NULL
      GROUP BY previous_state_json->>'field'
      ORDER BY edit_count DESC
      LIMIT 10
    `),
    db.select({ count: count() }).from(appEventsTable)
      .where(and(eq(appEventsTable.accountId, accountId), eq(appEventsTable.eventName, "review_completed"),
        sql`${appEventsTable.metadataJson}->>'summaryEdited' = 'true'`)),
    db.select({ count: count() }).from(appEventsTable)
      .where(and(eq(appEventsTable.accountId, accountId), eq(appEventsTable.eventName, "review_completed"))),
  ]);

  const statusMap: Record<string, number> = {};
  for (const r of extractionStats) {
    if (r.status) statusMap[r.status] = Number(r.count);
  }

  const totalInteractions = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const successfulExtractions = statusMap["done"] ?? 0;
  const extractionSuccessRate = totalInteractions > 0
    ? Math.round((successfulExtractions / totalInteractions) * 100 * 10) / 10
    : 0;

  const avgConfidence = (confidenceRows.rows as { avg_confidence: string | null }[])[0]?.avg_confidence;
  const correctedFields = (topCorrectedFields.rows as { field: string; edit_count: string }[]).map((r) => ({
    field: r.field,
    editCount: Number(r.edit_count),
  }));

  const summaryEditsCount = Number(summaryEditRows[0]?.count ?? 0);
  const totalReviewCount = Number(totalReviewRows[0]?.count ?? 0);
  const summaryEditRate = totalReviewCount > 0
    ? Math.round((summaryEditsCount / totalReviewCount) * 100 * 10) / 10
    : 0;

  res.json({
    extractionSuccessRate,
    extractionsByStatus: statusMap,
    avgConfidence: avgConfidence != null ? Math.round(Number(avgConfidence) * 1000) / 1000 : null,
    topCorrectedFields: correctedFields,
    summaryEditRate,
    summaryEdits: summaryEditsCount,
    totalReviews: totalReviewCount,
  });
});

router.get("/founder/workflow-friction", async (req: Request, res: Response) => {
  if (!(await requireOwner(req, res))) return;
  const { accountId } = req.user!;

  const since24h = sinceDate(1);
  const since7d = sinceDate(7);

  const [fieldEdits, totalReviews, stuckLeads, totalLeads, snoozedLeads, topEditedFieldsRows, reviewLagRows] = await Promise.all([
    db.select({ count: count() }).from(appEventsTable)
      .where(and(eq(appEventsTable.accountId, accountId), eq(appEventsTable.eventName, "field_edited"))),
    db.select({ count: count() }).from(appEventsTable)
      .where(and(eq(appEventsTable.accountId, accountId), eq(appEventsTable.eventName, "review_completed"))),
    db.select({ count: count() }).from(prospectsTable)
      .where(and(
        eq(prospectsTable.accountId, accountId),
        eq(prospectsTable.status, "new"),
        lt(prospectsTable.updatedAt, since24h),
      )),
    db.select({ count: count() }).from(prospectsTable)
      .where(eq(prospectsTable.accountId, accountId)),
    db.select({ count: count() }).from(prospectsTable)
      .where(and(
        eq(prospectsTable.accountId, accountId),
        eq(prospectsTable.status, "contacted"),
        lt(prospectsTable.updatedAt, since7d),
      )),
    db.execute(sql`
      SELECT
        previous_state_json->>'field' as field_name,
        COUNT(*) as edit_count,
        COUNT(DISTINCT prospect_id) as unique_prospects
      FROM app_events
      WHERE account_id = ${accountId}
        AND event_name = 'field_edited'
        AND previous_state_json->>'field' IS NOT NULL
      GROUP BY previous_state_json->>'field'
      ORDER BY edit_count DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT
        EXTRACT(EPOCH FROM (e_done.event_timestamp - e_open.event_timestamp)) as review_lag_seconds
      FROM app_events e_open
      JOIN app_events e_done ON e_done.interaction_id = e_open.interaction_id
        AND e_done.event_name = 'review_completed'
        AND e_done.account_id = ${accountId}
      WHERE e_open.event_name = 'interaction_opened'
        AND e_open.account_id = ${accountId}
        AND e_open.event_timestamp >= NOW() - INTERVAL '30 days'
      LIMIT 500
    `),
  ]);

  const totalFieldEdits = Number(fieldEdits[0]?.count ?? 0);
  const totalReviewCount = Number(totalReviews[0]?.count ?? 0);
  const stuckLeadCount = Number(stuckLeads[0]?.count ?? 0);
  const totalLeadCount = Number(totalLeads[0]?.count ?? 0);
  const snoozedLeadCount = Number(snoozedLeads[0]?.count ?? 0);

  const topEditedFields = (topEditedFieldsRows.rows as { field_name: string; edit_count: string; unique_prospects: string }[]).map((r) => ({
    fieldName: r.field_name,
    editCount: Number(r.edit_count),
    uniqueProspects: Number(r.unique_prospects),
  }));

  const lagValues = (reviewLagRows.rows as { review_lag_seconds: string | null }[])
    .map((r) => Number(r.review_lag_seconds ?? 0)).filter((v) => v > 0);
  const avgReviewLagSeconds = lagValues.length > 0
    ? Math.round(lagValues.reduce((a, b) => a + b, 0) / lagValues.length)
    : null;
  const medianReviewLagSeconds = lagValues.length > 0
    ? (lagValues.sort((a, b) => a - b)[Math.floor(lagValues.length / 2)] ?? null)
    : null;

  res.json({
    editsPerLead: totalReviewCount > 0 ? Math.round((totalFieldEdits / totalReviewCount) * 10) / 10 : 0,
    totalFieldEdits,
    totalReviews: totalReviewCount,
    stuckLeads: stuckLeadCount,
    snoozedLeads: snoozedLeadCount,
    totalLeads: totalLeadCount,
    topEditedFields,
    avgReviewLagSeconds,
    medianReviewLagSeconds,
  });
});

router.get("/founder/observations", async (req: Request, res: Response) => {
  if (!(await requireOwner(req, res))) return;
  const { accountId } = req.user!;

  const observations = await db.select()
    .from(founderObservationsTable)
    .where(eq(founderObservationsTable.accountId, accountId))
    .orderBy(desc(founderObservationsTable.createdAt))
    .limit(100);

  const recurringTypes = await db.execute(sql`
    SELECT observation_type, COUNT(*) as count
    FROM founder_observations
    WHERE account_id = ${accountId}
    GROUP BY observation_type
    ORDER BY count DESC
  `);

  res.json({
    observations,
    recurringTypes: (recurringTypes.rows as { observation_type: string; count: string }[]).map((r) => ({
      type: r.observation_type,
      count: Number(r.count),
    })),
  });
});

router.post("/founder/observations", async (req: Request, res: Response) => {
  if (!(await requireOwner(req, res))) return;
  const user = req.user! as typeof req.user & { id: string };
  const { accountId } = user;
  const userId = user.id;

  const { observationType, title, body, prospectId, propertyId, weekLabel } = req.body as {
    observationType: string;
    title: string;
    body: string;
    prospectId?: string;
    propertyId?: string;
    weekLabel?: string;
  };

  const validTypes = [
    "workflow_friction",
    "product_idea",
    "missed_lead_risk",
    "ai_issue",
    "ui_issue",
    "customer_value_signal",
    "future_sales_claim",
  ];

  if (!observationType || !validTypes.includes(observationType)) {
    res.status(400).json({ error: `observationType must be one of: ${validTypes.join(", ")}` });
    return;
  }
  if (!title?.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  if (!body?.trim()) {
    res.status(400).json({ error: "body is required" });
    return;
  }

  const [observation] = await db.insert(founderObservationsTable).values({
    accountId,
    userId,
    observationType,
    title: title.trim(),
    body: body.trim(),
    prospectId: prospectId ?? null,
    propertyId: propertyId ?? null,
    weekLabel: weekLabel ?? null,
  }).returning();

  logEvent({
    accountId,
    userId,
    prospectId: prospectId ?? null,
    propertyId: propertyId ?? null,
    eventType: "founder_note",
    eventName: "founder_observation_added",
    sourceLayer: "api",
    metadataJson: { observationType, observationId: observation.id, weekLabel },
  });

  res.status(201).json(observation);
});

router.get("/founder/exports/kpi-summary", async (req: Request, res: Response) => {
  if (!(await requireOwner(req, res))) return;
  const { accountId } = req.user!;

  const since30d = sinceDate(30);

  const [
    prospectsRows,
    interactionRows,
    exportBatchRows,
    fieldEditRows,
    extractionConfRows,
    observationRows,
    propertyRows,
  ] = await Promise.all([
    db.select({ status: prospectsTable.status, exportStatus: prospectsTable.exportStatus, count: count() })
      .from(prospectsTable)
      .where(eq(prospectsTable.accountId, accountId))
      .groupBy(prospectsTable.status, prospectsTable.exportStatus),
    db.select({ extractionStatus: interactionsTable.extractionStatus, sourceType: interactionsTable.sourceType, count: count() })
      .from(interactionsTable)
      .where(eq(interactionsTable.accountId, accountId))
      .groupBy(interactionsTable.extractionStatus, interactionsTable.sourceType),
    db.select({ count: count() }).from(exportBatchesTable)
      .where(and(eq(exportBatchesTable.accountId, accountId), eq(exportBatchesTable.status, "completed"), gte(exportBatchesTable.createdAt, since30d))),
    db.execute(sql`
      SELECT previous_state_json->>'field' as field, COUNT(*) as count
      FROM app_events
      WHERE account_id = ${accountId} AND event_name = 'field_edited'
        AND previous_state_json->>'field' IS NOT NULL
      GROUP BY previous_state_json->>'field'
      ORDER BY count DESC LIMIT 10
    `),
    db.execute(sql`
      SELECT AVG((structured_extraction_json->>'confidence')::numeric) as avg_confidence
      FROM interactions WHERE account_id = ${accountId} AND extraction_status = 'done'
    `),
    db.select({ observationType: founderObservationsTable.observationType, count: count() })
      .from(founderObservationsTable)
      .where(eq(founderObservationsTable.accountId, accountId))
      .groupBy(founderObservationsTable.observationType),
    db.select({ id: propertiesTable.id, name: propertiesTable.name }).from(propertiesTable)
      .where(eq(propertiesTable.accountId, accountId)),
  ]);

  const funnelCounts: Record<string, number> = {};
  let exportedCount = 0;
  let pendingExportCount = 0;
  for (const r of prospectsRows) {
    funnelCounts[r.status] = (funnelCounts[r.status] ?? 0) + Number(r.count);
    if (r.exportStatus === "exported") exportedCount += Number(r.count);
    if (r.exportStatus === "pending") pendingExportCount += Number(r.count);
  }

  const ingestionBySource: Record<string, number> = {};
  let totalExtractions = 0;
  let successfulExtractions = 0;
  for (const r of interactionRows) {
    ingestionBySource[r.sourceType ?? "unknown"] = (ingestionBySource[r.sourceType ?? "unknown"] ?? 0) + Number(r.count);
    totalExtractions += Number(r.count);
    if (r.extractionStatus === "done") successfulExtractions += Number(r.count);
  }

  const avgConf = (extractionConfRows.rows as { avg_confidence: string | null }[])[0]?.avg_confidence;
  const topCorrected = (fieldEditRows.rows as { field: string; count: string }[]).map((r) => ({ field: r.field, count: Number(r.count) }));

  res.json({
    generatedAt: new Date().toISOString(),
    dateRange: { start: since30d.toISOString(), end: new Date().toISOString() },
    ingestion: {
      totalInteractions: totalExtractions,
      bySource: ingestionBySource,
    },
    funnel: funnelCounts,
    exportPipeline: {
      exportBatchesLast30d: Number(exportBatchRows[0]?.count ?? 0),
      exported: exportedCount,
      pendingExport: pendingExportCount,
    },
    aiPerformance: {
      extractionSuccessRate: totalExtractions > 0 ? Math.round((successfulExtractions / totalExtractions) * 100 * 10) / 10 : 0,
      avgConfidence: avgConf != null ? Math.round(Number(avgConf) * 1000) / 1000 : null,
      topCorrectedFields: topCorrected,
    },
    founderObservationSummary: observationRows.map((r) => ({ type: r.observationType, count: Number(r.count) })),
    properties: propertyRows.map((p) => ({ id: p.id, name: p.name })),
  });
});

router.get("/founder/exports/event-log", async (req: Request, res: Response) => {
  if (!(await requireOwner(req, res))) return;
  const { accountId } = req.user!;

  const limitParam = parseInt(req.query.limit as string ?? "1000", 10);
  const limit = Math.min(Math.max(limitParam, 1), 5000);

  const events = await db.select()
    .from(appEventsTable)
    .where(eq(appEventsTable.accountId, accountId))
    .orderBy(desc(appEventsTable.eventTimestamp))
    .limit(limit);

  res.json({
    generatedAt: new Date().toISOString(),
    count: events.length,
    events,
  });
});

router.get("/founder/exports/prospect-lifecycle", async (req: Request, res: Response) => {
  if (!(await requireOwner(req, res))) return;
  const { accountId } = req.user!;

  const allProspects = await db.select().from(prospectsTable)
    .where(eq(prospectsTable.accountId, accountId))
    .orderBy(desc(prospectsTable.createdAt))
    .limit(500);

  if (allProspects.length === 0) {
    res.json({ generatedAt: new Date().toISOString(), prospects: [] });
    return;
  }

  const prospectIds = allProspects.map((p) => p.id);

  const [allInteractions, allEvents, allProperties, allNotes] = await Promise.all([
    db.select().from(interactionsTable)
      .where(and(eq(interactionsTable.accountId, accountId)))
      .orderBy(interactionsTable.occurredAt),
    db.select().from(appEventsTable)
      .where(eq(appEventsTable.accountId, accountId))
      .orderBy(appEventsTable.eventTimestamp),
    db.select({ id: propertiesTable.id, name: propertiesTable.name })
      .from(propertiesTable)
      .where(eq(propertiesTable.accountId, accountId)),
    db.select().from(notesTable)
      .where(inArray(notesTable.prospectId, prospectIds))
      .orderBy(notesTable.createdAt),
  ]);

  const propMap = new Map(allProperties.map((p) => [p.id, p.name]));

  const interactionsByProspect = new Map<string, typeof allInteractions>();
  for (const i of allInteractions) {
    if (!i.prospectId) continue;
    const list = interactionsByProspect.get(i.prospectId) ?? [];
    list.push(i);
    interactionsByProspect.set(i.prospectId, list);
  }

  const eventsByProspect = new Map<string, typeof allEvents>();
  for (const e of allEvents) {
    if (!e.prospectId) continue;
    const list = eventsByProspect.get(e.prospectId) ?? [];
    list.push(e);
    eventsByProspect.set(e.prospectId, list);
  }

  const notesByProspect = new Map<string, typeof allNotes>();
  for (const n of allNotes) {
    if (!n.prospectId) continue;
    const list = notesByProspect.get(n.prospectId) ?? [];
    list.push(n);
    notesByProspect.set(n.prospectId, list);
  }

  const prospects = allProspects.map((p) => {
    const prospectEvents = eventsByProspect.get(p.id) ?? [];

    const statusHistory = prospectEvents
      .filter((e) => e.eventName === "prospect_status_changed")
      .map((e) => ({
        timestamp: e.eventTimestamp,
        from: (e.previousStateJson as Record<string, unknown> | null)?.status ?? null,
        to: (e.newStateJson as Record<string, unknown> | null)?.status ?? null,
      }));

    const exportStateHistory = prospectEvents
      .filter((e) => e.eventName === "prospect_export_status_changed")
      .map((e) => ({
        timestamp: e.eventTimestamp,
        from: (e.previousStateJson as Record<string, unknown> | null)?.exportStatus ?? null,
        to: (e.newStateJson as Record<string, unknown> | null)?.exportStatus ?? null,
      }));

    const humanEditsTimeline = prospectEvents
      .filter((e) => e.eventName === "field_edited")
      .map((e) => ({
        timestamp: e.eventTimestamp,
        field: (e.previousStateJson as Record<string, unknown> | null)?.field ?? null,
        previousValue: (e.previousStateJson as Record<string, unknown> | null)?.value ?? null,
        newValue: (e.newStateJson as Record<string, unknown> | null)?.value ?? null,
        interactionId: e.interactionId,
      }));

    return {
      prospectId: p.id,
      fullName: p.fullName ?? ([p.firstName, p.lastName].filter(Boolean).join(" ") || null),
      phone: p.phonePrimary,
      email: p.email ?? null,
      status: p.status,
      exportStatus: p.exportStatus,
      assignedProperty: p.assignedPropertyId ? propMap.get(p.assignedPropertyId) ?? null : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      completenessScore: p.completenessScore ?? null,
      statusHistory,
      exportStateHistory,
      humanEditsTimeline,
      notes: (notesByProspect.get(p.id) ?? []).map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt,
        userId: n.userId,
      })),
      interactions: (interactionsByProspect.get(p.id) ?? []).map((i) => ({
        id: i.id,
        sourceType: i.sourceType,
        direction: i.direction,
        occurredAt: i.occurredAt,
        extractionStatus: i.extractionStatus,
        extractionConfidence: i.extractionConfidence != null ? Number(i.extractionConfidence) : null,
        category: i.category,
        summary: i.summary,
        aiOutput: i.structuredExtractionJson,
      })),
      allEvents: prospectEvents.map((e) => ({
        eventName: e.eventName,
        eventType: e.eventType,
        eventTimestamp: e.eventTimestamp,
        metadataJson: e.metadataJson,
        previousStateJson: e.previousStateJson,
        newStateJson: e.newStateJson,
      })),
    };
  });

  res.json({
    generatedAt: new Date().toISOString(),
    count: prospects.length,
    prospects,
  });
});

router.get("/founder/exports/ai-corrections", async (req: Request, res: Response) => {
  if (!(await requireOwner(req, res))) return;
  const { accountId } = req.user!;

  const corrections = await db.execute(sql`
    SELECT
      previous_state_json->>'field' as field_name,
      previous_state_json->>'aiValue' as ai_value,
      new_state_json->>'humanValue' as human_value,
      ai_context_json->>'confidence' as confidence,
      CASE WHEN (previous_state_json->>'aiValue') IS DISTINCT FROM (new_state_json->>'humanValue') THEN true ELSE false END as was_changed,
      prospect_id,
      interaction_id,
      event_timestamp
    FROM app_events
    WHERE account_id = ${accountId}
      AND event_name = 'field_edited'
    ORDER BY event_timestamp DESC
    LIMIT 2000
  `);

  const rows = (corrections.rows as {
    field_name: string;
    ai_value: string | null;
    human_value: string | null;
    confidence: string | null;
    was_changed: boolean;
    prospect_id: string | null;
    interaction_id: string | null;
    event_timestamp: string;
  }[]).map((r) => ({
    fieldName: r.field_name,
    aiValue: r.ai_value,
    humanValue: r.human_value,
    confidence: r.confidence != null ? Number(r.confidence) : null,
    wasChanged: r.was_changed,
    prospectId: r.prospect_id,
    interactionId: r.interaction_id,
    eventTimestamp: r.event_timestamp,
  }));

  const byField: Record<string, { total: number; changed: number; avgConfidence: number | null }> = {};
  for (const r of rows) {
    if (!r.fieldName) continue;
    if (!byField[r.fieldName]) byField[r.fieldName] = { total: 0, changed: 0, avgConfidence: null };
    byField[r.fieldName].total++;
    if (r.wasChanged) byField[r.fieldName].changed++;
  }

  res.json({
    generatedAt: new Date().toISOString(),
    totalFieldEdits: rows.length,
    corrections: rows,
    summary: Object.entries(byField).map(([field, stats]) => ({
      field,
      totalEdits: stats.total,
      changedCount: stats.changed,
      changeRate: stats.total > 0 ? Math.round((stats.changed / stats.total) * 100 * 10) / 10 : 0,
    })).sort((a, b) => b.totalEdits - a.totalEdits),
  });
});

export default router;
