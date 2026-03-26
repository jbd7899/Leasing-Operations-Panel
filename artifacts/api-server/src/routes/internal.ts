import { Router, type IRouter, type Request, type Response } from "express";
import { db, interactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { processInteraction } from "../lib/processInteraction";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const ADMIN_ROLES = new Set(["owner", "admin"]);

const router: IRouter = Router();

type CallerKind = "secret" | "admin";

function requireInternalOrAdmin(req: Request, res: Response): CallerKind | false {
  const secretHeader = req.headers["x-internal-secret"];
  if (INTERNAL_SECRET && secretHeader === INTERNAL_SECRET) {
    return "secret";
  }

  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  if (!ADMIN_ROLES.has(req.user!.role)) {
    res.status(403).json({ error: "Forbidden: admin or owner role required" });
    return false;
  }
  return "admin";
}

async function resolveAndGateInteraction(
  id: string,
  callerKind: CallerKind,
  req: Request,
  res: Response,
): Promise<boolean> {
  if (callerKind === "secret") {
    const [interaction] = await db.select({ id: interactionsTable.id })
      .from(interactionsTable)
      .where(eq(interactionsTable.id, id));
    if (!interaction) {
      res.status(404).json({ error: "Interaction not found" });
      return false;
    }
    return true;
  }

  const { accountId } = req.user!;
  const [interaction] = await db.select({ id: interactionsTable.id })
    .from(interactionsTable)
    .where(and(eq(interactionsTable.id, id), eq(interactionsTable.accountId, accountId)));
  if (!interaction) {
    res.status(404).json({ error: "Interaction not found or not in your account" });
    return false;
  }
  return true;
}

router.post("/internal/process-interaction/:id", async (req: Request, res: Response) => {
  const callerKind = requireInternalOrAdmin(req, res);
  if (!callerKind) return;

  const id = String(req.params.id);
  const ok = await resolveAndGateInteraction(id, callerKind, req, res);
  if (!ok) return;

  res.json({ status: "queued", id });

  setImmediate(async () => {
    await processInteraction(id);
  });
});

router.post("/internal/retry-extraction/:id", async (req: Request, res: Response) => {
  const callerKind = requireInternalOrAdmin(req, res);
  if (!callerKind) return;

  const id = String(req.params.id);
  const ok = await resolveAndGateInteraction(id, callerKind, req, res);
  if (!ok) return;

  res.json({ status: "queued", id });

  setImmediate(async () => {
    await processInteraction(id);
  });
});

export default router;
