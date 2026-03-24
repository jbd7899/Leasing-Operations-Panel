import { Router, type IRouter, type Request, type Response } from "express";
import { db, twilioNumbersTable } from "@workspace/db";
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

router.get("/twilio-numbers", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const twilioNumbers = await db
    .select()
    .from(twilioNumbersTable)
    .where(eq(twilioNumbersTable.accountId, accountId))
    .orderBy(twilioNumbersTable.phoneNumber);

  res.json({ twilioNumbers });
});

router.post("/twilio-numbers", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { phoneNumber, friendlyName, propertyId, purpose } = req.body;
  if (!phoneNumber) { res.status(400).json({ error: "phoneNumber is required" }); return; }

  const [number] = await db
    .insert(twilioNumbersTable)
    .values({ accountId, phoneNumber, friendlyName, propertyId, purpose })
    .returning();

  res.status(201).json(number);
});

router.patch("/twilio-numbers/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const accountId = getAccountId(req);
  if (!accountId) { res.status(403).json({ error: "No account" }); return; }

  const { id } = req.params;
  const { friendlyName, propertyId, purpose, isActive } = req.body;

  const updates: Record<string, unknown> = {};
  if (friendlyName !== undefined) updates.friendlyName = friendlyName;
  if (propertyId !== undefined) updates.propertyId = propertyId;
  if (purpose !== undefined) updates.purpose = purpose;
  if (isActive !== undefined) updates.isActive = isActive;

  const [number] = await db
    .update(twilioNumbersTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(twilioNumbersTable.id, id), eq(twilioNumbersTable.accountId, accountId)))
    .returning();

  if (!number) { res.status(404).json({ error: "Not found" }); return; }
  res.json(number);
});

export default router;
