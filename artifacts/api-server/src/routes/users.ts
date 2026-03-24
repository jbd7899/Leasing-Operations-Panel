import { Router, type IRouter, type Request, type Response } from "express";
import { db, accountUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

router.get("/users", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const users = await db
    .select()
    .from(accountUsersTable)
    .where(eq(accountUsersTable.accountId, accountId))
    .orderBy(accountUsersTable.createdAt);

  res.json({ users });
});

router.post("/users", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { email, name, role } = req.body;
  if (!email || !role) { res.status(400).json({ error: "email and role are required" }); return; }

  const [user] = await db
    .insert(accountUsersTable)
    .values({ accountId, email, name, role })
    .returning();

  res.status(201).json(user);
});

export default router;
