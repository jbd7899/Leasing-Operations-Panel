import { Router, type IRouter, type Request, type Response } from "express";
import { processInteraction } from "../lib/processInteraction";

const router: IRouter = Router();

router.post("/internal/process-interaction/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  res.json({ status: "queued", id });

  setImmediate(async () => {
    await processInteraction(id);
  });
});

router.post("/internal/retry-extraction/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  res.json({ status: "queued", id });

  setImmediate(async () => {
    await processInteraction(id);
  });
});

export default router;
