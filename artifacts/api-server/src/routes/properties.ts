import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { propertiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

router.get("/properties", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { accountId } = req.user!;

  const properties = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.accountId, accountId))
    .orderBy(propertiesTable.name);

  res.json({ properties });
});

router.post("/properties", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { accountId } = req.user!;

  const { name, address1, address2, city, state, zip, status } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [property] = await db
    .insert(propertiesTable)
    .values({ accountId, name, address1, address2, city, state, zip, status: status ?? "active" })
    .returning();

  res.status(201).json(property);
});

router.patch("/properties/:id", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { accountId } = req.user!;

  const { id } = req.params;
  const { name, address1, address2, city, state, zip, status } = req.body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (address1 !== undefined) updates.address1 = address1;
  if (address2 !== undefined) updates.address2 = address2;
  if (city !== undefined) updates.city = city;
  if (state !== undefined) updates.state = state;
  if (zip !== undefined) updates.zip = zip;
  if (status !== undefined) updates.status = status;

  const [property] = await db
    .update(propertiesTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(propertiesTable.id, id), eq(propertiesTable.accountId, accountId)))
    .returning();

  if (!property) { res.status(404).json({ error: "Not found" }); return; }
  res.json(property);
});

export default router;
