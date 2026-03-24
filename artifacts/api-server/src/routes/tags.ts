import { Router, type IRouter, type Request, type Response } from "express";
import { db, tagsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

router.get("/tags", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const tags = await db
    .select()
    .from(tagsTable)
    .where(eq(tagsTable.accountId, accountId))
    .orderBy(tagsTable.name);

  res.json({ tags });
});

router.post("/tags", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { name, color } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [tag] = await db
    .insert(tagsTable)
    .values({ accountId, name, color })
    .returning();

  res.status(201).json(tag);
});

export default router;
