import { Router, type IRouter, type Request, type Response } from "express";
import { db, accountUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_ROLES = new Set(["owner", "admin"]);

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!requireAuth(req, res)) return false;
  if (!ADMIN_ROLES.has(req.user!.role)) {
    res.status(403).json({ error: "Forbidden: admin or owner role required" });
    return false;
  }
  return true;
}

router.get("/users", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { accountId } = req.user!;

  const users = await db
    .select()
    .from(accountUsersTable)
    .where(eq(accountUsersTable.accountId, accountId))
    .orderBy(accountUsersTable.createdAt);

  res.json({ users });
});

router.post("/users", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { accountId } = req.user!;

  const { email, name, role } = req.body;
  if (!email || !role) { res.status(400).json({ error: "email and role are required" }); return; }

  const [user] = await db
    .insert(accountUsersTable)
    .values({ accountId, email, name, role })
    .returning();

  res.status(201).json(user);
});

export default router;
