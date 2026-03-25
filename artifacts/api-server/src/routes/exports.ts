import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  exportBatchesTable,
  exportBatchItemsTable,
  prospectsTable,
  propertiesTable,
  notesTable,
  tagsTable,
  prospectTagsTable,
  interactionsTable,
} from "@workspace/db";
import { eq, and, inArray, max, sql } from "drizzle-orm";
import { logEvent } from "../lib/logEvent";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function buildDownloadUrl(req: Request, batchId: string): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host = req.headers.host ?? req.hostname;
  return `${proto}://${host}/api/exports/${batchId}/download`;
}

router.get("/exports", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const exports = await db
    .select({
      id: exportBatchesTable.id,
      accountId: exportBatchesTable.accountId,
      format: exportBatchesTable.format,
      targetSystem: exportBatchesTable.targetSystem,
      recordCount: exportBatchesTable.recordCount,
      status: exportBatchesTable.status,
      fileUrl: exportBatchesTable.fileUrl,
      mimeType: exportBatchesTable.mimeType,
      createdAt: exportBatchesTable.createdAt,
    })
    .from(exportBatchesTable)
    .where(eq(exportBatchesTable.accountId, accountId))
    .orderBy(sql`${exportBatchesTable.createdAt} desc`);

  res.json({ exports });
});

router.post("/exports", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const exportUser = req.user! as typeof req.user & { id: string };
  const accountId = exportUser.accountId;
  const userId = exportUser.id;

  const { prospectIds, format, targetSystem } = req.body as {
    prospectIds?: unknown;
    format?: unknown;
    targetSystem?: unknown;
  };

  if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
    res.status(400).json({ error: "prospectIds must be a non-empty array" });
    return;
  }
  if (!format || !["csv", "json"].includes(format as string)) {
    res.status(400).json({ error: "format must be 'csv' or 'json'" });
    return;
  }

  const typedFormat = format as "csv" | "json";

  const ownedProspects = await db
    .select({ id: prospectsTable.id })
    .from(prospectsTable)
    .where(
      and(
        inArray(prospectsTable.id, prospectIds as string[]),
        eq(prospectsTable.accountId, accountId),
      ),
    );

  if (ownedProspects.length !== (prospectIds as string[]).length) {
    res.status(400).json({ error: "One or more prospectIds do not belong to this account" });
    return;
  }

  const validatedProspectIds = ownedProspects.map((p) => p.id);

  const [batch] = await db
    .insert(exportBatchesTable)
    .values({
      accountId,
      createdByUserId: userId,
      format: typedFormat,
      targetSystem: targetSystem as string | undefined,
      recordCount: validatedProspectIds.length,
      status: "pending",
    })
    .returning();

  const batchId = batch.id;
  const fileUrl = buildDownloadUrl(req, batchId);

  logEvent({
    accountId,
    eventType: "export",
    eventName: "export_batch_started",
    metadataJson: {
      batchId,
      format: typedFormat,
      targetSystem: targetSystem ?? null,
      prospectCount: validatedProspectIds.length,
    },
  });

  const { content, mimeType } = await generateExportContent(
    accountId,
    validatedProspectIds,
    typedFormat,
    batchId,
  );

  const [updated] = await db
    .update(exportBatchesTable)
    .set({ status: "completed", mimeType, fileContent: content, fileUrl })
    .where(eq(exportBatchesTable.id, batchId))
    .returning({
      id: exportBatchesTable.id,
      accountId: exportBatchesTable.accountId,
      format: exportBatchesTable.format,
      targetSystem: exportBatchesTable.targetSystem,
      recordCount: exportBatchesTable.recordCount,
      status: exportBatchesTable.status,
      fileUrl: exportBatchesTable.fileUrl,
      mimeType: exportBatchesTable.mimeType,
      createdAt: exportBatchesTable.createdAt,
    });

  await db
    .insert(exportBatchItemsTable)
    .values(validatedProspectIds.map((pid) => ({ exportBatchId: batch.id, prospectId: pid })));

  for (const prospectId of validatedProspectIds) {
    logEvent({
      accountId,
      userId,
      eventType: "export",
      eventName: "prospect_export_included",
      prospectId,
      metadataJson: { batchId, format: typedFormat },
    });
  }

  await db
    .update(prospectsTable)
    .set({ exportStatus: "exported", updatedAt: new Date() })
    .where(
      and(
        inArray(prospectsTable.id, validatedProspectIds),
        eq(prospectsTable.accountId, accountId),
      ),
    );

  logEvent({
    accountId,
    userId,
    eventType: "export",
    eventName: "export_batch_completed",
    sourceLayer: "api",
    metadataJson: {
      batchId: batch.id,
      format: typedFormat,
      targetSystem: targetSystem as string | undefined,
      recordCount: validatedProspectIds.length,
    },
  });

  const downloadUrl = fileUrl;
  res.status(201).json({ ...updated, downloadUrl });
});

router.get("/exports/:id/download", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { accountId } = req.user!;

  const { id } = req.params;

  const [batch] = await db
    .select()
    .from(exportBatchesTable)
    .where(and(eq(exportBatchesTable.id, id), eq(exportBatchesTable.accountId, accountId)));

  if (!batch) {
    res.status(404).json({ error: "Export batch not found" });
    return;
  }

  const ext = batch.format === "json" ? "json" : "csv";
  const filename = `export-${id}.${ext}`;
  const mime = batch.mimeType ?? (batch.format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8");

  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  if (batch.fileContent) {
    res.send(batch.fileContent);
    return;
  }

  const items = await db
    .select()
    .from(exportBatchItemsTable)
    .where(eq(exportBatchItemsTable.exportBatchId, id));

  const prospectIds = items.map((i) => i.prospectId);
  if (prospectIds.length === 0) {
    const empty = batch.format === "csv" ? buildCsvHeaders() : JSON.stringify({ exportBatchId: id, prospects: [] }, null, 2);
    res.send(empty);
    return;
  }

  const { content } = await generateExportContent(accountId, prospectIds, batch.format as "csv" | "json", id);
  res.send(content);
});

async function generateExportContent(
  accountId: string,
  prospectIds: string[],
  format: "csv" | "json",
  batchId: string,
): Promise<{ content: string; mimeType: string }> {
  if (prospectIds.length === 0) {
    const empty = format === "csv"
      ? buildCsvHeaders()
      : JSON.stringify({ exportBatchId: batchId, prospects: [] }, null, 2);
    const mimeType = format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8";
    return { content: empty, mimeType };
  }

  const prospectsWithProperty = await db
    .select({
      prospect: prospectsTable,
      propertyName: propertiesTable.name,
    })
    .from(prospectsTable)
    .leftJoin(propertiesTable, eq(prospectsTable.assignedPropertyId, propertiesTable.id))
    .where(
      and(inArray(prospectsTable.id, prospectIds), eq(prospectsTable.accountId, accountId)),
    );

  const noteRows = await db
    .select({ prospectId: notesTable.prospectId, body: notesTable.body, createdAt: notesTable.createdAt })
    .from(notesTable)
    .where(and(inArray(notesTable.prospectId, prospectIds), eq(notesTable.accountId, accountId)))
    .orderBy(notesTable.createdAt);

  const tagRows = await db
    .select({
      prospectId: prospectTagsTable.prospectId,
      tagName: tagsTable.name,
    })
    .from(prospectTagsTable)
    .innerJoin(
      tagsTable,
      and(eq(prospectTagsTable.tagId, tagsTable.id), eq(tagsTable.accountId, accountId)),
    )
    .where(inArray(prospectTagsTable.prospectId, prospectIds));

  const latestInteractionRows = await db
    .select({
      prospectId: interactionsTable.prospectId,
      latestAt: max(interactionsTable.occurredAt),
      category: interactionsTable.category,
    })
    .from(interactionsTable)
    .where(
      and(
        inArray(interactionsTable.prospectId, prospectIds),
        eq(interactionsTable.accountId, accountId),
      ),
    )
    .groupBy(interactionsTable.prospectId, interactionsTable.category);

  const notesByProspect = new Map<string, string[]>();
  for (const n of noteRows) {
    const list = notesByProspect.get(n.prospectId) ?? [];
    list.push(n.body);
    notesByProspect.set(n.prospectId, list);
  }

  const tagsByProspect = new Map<string, string[]>();
  for (const t of tagRows) {
    const list = tagsByProspect.get(t.prospectId) ?? [];
    list.push(t.tagName);
    tagsByProspect.set(t.prospectId, list);
  }

  const latestByProspect = new Map<string, { latestAt: Date | null; category: string | null }>();
  for (const r of latestInteractionRows) {
    if (!r.prospectId) continue;
    const existing = latestByProspect.get(r.prospectId);
    const rowDate = r.latestAt ? new Date(r.latestAt as unknown as string) : null;
    if (!existing || (rowDate && (!existing.latestAt || rowDate > existing.latestAt))) {
      latestByProspect.set(r.prospectId, { latestAt: rowDate, category: r.category ?? null });
    }
  }

  if (format === "csv") {
    const content = buildCsv(prospectsWithProperty, notesByProspect, tagsByProspect, latestByProspect);
    return { content, mimeType: "text/csv; charset=utf-8" };
  }

  const interactionRows = await db
    .select()
    .from(interactionsTable)
    .where(
      and(
        inArray(interactionsTable.prospectId, prospectIds),
        eq(interactionsTable.accountId, accountId),
      ),
    )
    .orderBy(interactionsTable.occurredAt);

  const interactionsByProspect = new Map<string, typeof interactionRows>();
  for (const i of interactionRows) {
    if (!i.prospectId) continue;
    const list = interactionsByProspect.get(i.prospectId) ?? [];
    list.push(i);
    interactionsByProspect.set(i.prospectId, list);
  }

  const fullNotesByProspect = new Map<string, typeof noteRows>();
  for (const n of noteRows) {
    const list = fullNotesByProspect.get(n.prospectId) ?? [];
    list.push(n);
    fullNotesByProspect.set(n.prospectId, list);
  }

  const json = buildJson(
    batchId,
    format,
    prospectsWithProperty,
    tagsByProspect,
    latestByProspect,
    interactionsByProspect,
    fullNotesByProspect,
  );

  return { content: JSON.stringify(json, null, 2), mimeType: "application/json; charset=utf-8" };
}

const CSV_HEADERS = [
  "prospect_id",
  "first_name",
  "last_name",
  "full_name",
  "phone",
  "email",
  "property",
  "desired_bedrooms",
  "desired_move_in_date",
  "budget_min",
  "budget_max",
  "pets",
  "voucher_type",
  "employment_status",
  "monthly_income",
  "lead_status",
  "category",
  "latest_summary",
  "notes",
  "tags",
  "latest_interaction_at",
];

function buildCsvHeaders(): string {
  return CSV_HEADERS.join(",") + "\n";
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

type ProspectWithProperty = { prospect: typeof prospectsTable.$inferSelect; propertyName: string | null };

function buildCsv(
  rows: ProspectWithProperty[],
  notesByProspect: Map<string, string[]>,
  tagsByProspect: Map<string, string[]>,
  latestByProspect: Map<string, { latestAt: Date | null; category: string | null }>,
): string {
  const lines: string[] = [CSV_HEADERS.join(",")];

  for (const { prospect: p, propertyName } of rows) {
    const notes = (notesByProspect.get(p.id) ?? []).join(" | ");
    const tags = (tagsByProspect.get(p.id) ?? []).join(", ");
    const latest = latestByProspect.get(p.id);
    const latestAt = latest?.latestAt ? latest.latestAt.toISOString() : "";
    const category = latest?.category ?? "";

    const values = [
      p.id,
      p.firstName ?? "",
      p.lastName ?? "",
      p.fullName ?? ([p.firstName, p.lastName].filter(Boolean).join(" ") || ""),
      p.phonePrimary,
      p.email ?? "",
      propertyName ?? "",
      p.desiredBedrooms ?? "",
      p.desiredMoveInDate ?? "",
      p.budgetMin ?? "",
      p.budgetMax ?? "",
      p.pets ?? "",
      p.voucherType ?? "",
      p.employmentStatus ?? "",
      p.monthlyIncome ?? "",
      p.status,
      category,
      p.latestSummary ?? "",
      notes,
      tags,
      latestAt,
    ];

    lines.push(values.map(csvEscape).join(","));
  }

  return lines.join("\n");
}

function buildJson(
  batchId: string,
  format: string,
  rows: ProspectWithProperty[],
  tagsByProspect: Map<string, string[]>,
  latestByProspect: Map<string, { latestAt: Date | null; category: string | null }>,
  interactionsByProspect: Map<string, (typeof interactionsTable.$inferSelect)[]>,
  fullNotesByProspect: Map<string, { prospectId: string; body: string; createdAt: Date }[]>,
) {
  const prospects = rows.map(({ prospect: p, propertyName }) => {
    const latest = latestByProspect.get(p.id);
    return {
      prospect_id: p.id,
      first_name: p.firstName ?? null,
      last_name: p.lastName ?? null,
      full_name: p.fullName ?? ([p.firstName, p.lastName].filter(Boolean).join(" ") || null),
      phone: p.phonePrimary,
      email: p.email ?? null,
      property: propertyName ?? null,
      desired_bedrooms: p.desiredBedrooms ?? null,
      desired_move_in_date: p.desiredMoveInDate ?? null,
      budget_min: p.budgetMin != null ? Number(p.budgetMin) : null,
      budget_max: p.budgetMax != null ? Number(p.budgetMax) : null,
      pets: p.pets ?? null,
      voucher_type: p.voucherType ?? null,
      employment_status: p.employmentStatus ?? null,
      monthly_income: p.monthlyIncome != null ? Number(p.monthlyIncome) : null,
      lead_status: p.status,
      category: latest?.category ?? null,
      latest_summary: p.latestSummary ?? null,
      latest_sentiment: p.latestSentiment ?? null,
      tags: tagsByProspect.get(p.id) ?? [],
      latest_interaction_at: latest?.latestAt ? latest.latestAt.toISOString() : null,
      notes: (fullNotesByProspect.get(p.id) ?? []).map((n) => ({
        body: n.body,
        created_at: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
      })),
      interactions: (interactionsByProspect.get(p.id) ?? []).map((i) => ({
        id: i.id,
        source_type: i.sourceType,
        direction: i.direction,
        occurred_at: i.occurredAt instanceof Date ? i.occurredAt.toISOString() : String(i.occurredAt),
        raw_text: i.rawText ?? null,
        transcript: i.transcript ?? null,
        summary: i.summary ?? null,
        category: i.category ?? null,
        sentiment: i.sentiment ?? null,
        urgency: i.urgency ?? null,
        extraction_status: i.extractionStatus ?? null,
        extraction_confidence: i.extractionConfidence != null ? Number(i.extractionConfidence) : null,
        structured_extraction: i.structuredExtractionJson ?? null,
      })),
    };
  });

  return {
    export_batch_id: batchId,
    format,
    generated_at: new Date().toISOString(),
    record_count: prospects.length,
    prospects,
  };
}

export default router;
