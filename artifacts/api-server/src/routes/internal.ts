import { Router, type IRouter, type Request, type Response } from "express";
import { processInteraction } from "../lib/processInteraction";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

const router: IRouter = Router();

function requireInternalOrAdmin(req: Request, res: Response): boolean {
  const secretHeader = req.headers["x-internal-secret"];
  if (INTERNAL_SECRET && secretHeader === INTERNAL_SECRET) {
    return true;
  }

  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const role = req.user!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin or owner role required" });
    return false;
  }
  return true;
}

router.post("/internal/process-interaction/:id", async (req: Request, res: Response) => {
  if (!requireInternalOrAdmin(req, res)) return;

  const { id } = req.params;

  res.json({ status: "queued", id });

  setImmediate(async () => {
    await processInteraction(id);
  });
});

router.post("/internal/retry-extraction/:id", async (req: Request, res: Response) => {
  if (!requireInternalOrAdmin(req, res)) return;

  const { id } = req.params;

  res.json({ status: "queued", id });

  setImmediate(async () => {
    await processInteraction(id);
  });
});

export default router;
