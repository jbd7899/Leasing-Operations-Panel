import { type Request, type Response, type NextFunction } from "express";
import twilio from "twilio";
import { logger } from "../lib/logger";

const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

export function validateTwilioSignature(req: Request, res: Response, next: NextFunction) {
  if (!AUTH_TOKEN) {
    logger.warn("TWILIO_AUTH_TOKEN not set — skipping signature validation (dev mode)");
    next();
    return;
  }

  const signature = req.headers["x-twilio-signature"] as string | undefined;
  if (!signature) {
    res.status(403).json({ error: "Missing X-Twilio-Signature header" });
    return;
  }

  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host = (req.headers["x-forwarded-host"] as string | undefined) ?? req.headers.host ?? "";
  const url = `${proto}://${host}${req.originalUrl}`;

  const params = req.body as Record<string, string>;
  const isValid = twilio.validateRequest(AUTH_TOKEN, signature, url, params);

  if (!isValid) {
    logger.warn({ url }, "Invalid Twilio signature — rejecting webhook");
    res.status(403).json({ error: "Invalid Twilio signature" });
    return;
  }

  next();
}
