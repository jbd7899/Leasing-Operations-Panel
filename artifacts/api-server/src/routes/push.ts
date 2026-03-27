import { Router, type IRouter, type Request, type Response } from "express";
import { db, accountUsersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.post("/push-token", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const user = req.user!;

  const { token } = req.body as { token?: string };
  if (!token || !token.startsWith("ExponentPushToken[")) {
    res.status(400).json({ error: "Invalid Expo push token" });
    return;
  }

  await db
    .update(accountUsersTable)
    .set({ expoPushToken: token, updatedAt: new Date() })
    .where(and(eq(accountUsersTable.accountId, user.accountId), eq(accountUsersTable.id, user.id)));

  res.json({ ok: true });
});

router.delete("/push-token", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const user = req.user!;

  await db
    .update(accountUsersTable)
    .set({ expoPushToken: null, updatedAt: new Date() })
    .where(and(eq(accountUsersTable.accountId, user.accountId), eq(accountUsersTable.id, user.id)));

  res.json({ ok: true });
});

export default router;
