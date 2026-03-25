import { type Request, type Response, type NextFunction } from "express";
import twilio from "twilio";
import { logger } from "../lib/logger";

const GLOBAL_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const IS_DEV = process.env.NODE_ENV === "development";

function buildUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host = (req.headers["x-forwarded-host"] as string | undefined) ?? req.headers.host ?? "";
  return `${proto}://${host}${req.originalUrl}`;
}

function validateWithToken(authToken: string, req: Request): boolean {
  const signature = req.headers["x-twilio-signature"] as string | undefined;
  if (!signature) return false;
  const url = buildUrl(req);
  const params = req.body as Record<string, string>;
  return twilio.validateRequest(authToken, signature, url, params);
}

export function validateTwilioSignature(req: Request, res: Response, next: NextFunction) {
  if (!GLOBAL_AUTH_TOKEN) {
    if (IS_DEV) {
      logger.warn("TWILIO_AUTH_TOKEN not set — skipping signature validation (dev mode only)");
      next();
      return;
    }
    logger.error("TWILIO_AUTH_TOKEN not configured — rejecting webhook (fail-closed)");
    res.status(403).json({ error: "Webhook authentication not configured" });
    return;
  }

  const signature = req.headers["x-twilio-signature"] as string | undefined;
  if (!signature) {
    res.status(403).json({ error: "Missing X-Twilio-Signature header" });
    return;
  }

  const isValid = validateWithToken(GLOBAL_AUTH_TOKEN, req);

  if (!isValid) {
    const url = buildUrl(req);
    logger.warn({ url }, "Invalid Twilio signature — rejecting webhook");
    res.status(403).json({ error: "Invalid Twilio signature" });
    return;
  }

  next();
}

export type AuthTokenResolver = (req: Request) => Promise<string | null>;

export function validateTwilioSignatureWithToken(
  resolveAuthToken: AuthTokenResolver,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    resolveAuthToken(req)
      .then((authToken) => {
        if (!authToken) {
          if (IS_DEV) {
            logger.warn(
              "No account auth token resolved — skipping signature validation (dev mode only)",
            );
            next();
            return;
          }
          logger.error("Could not resolve Twilio auth token — rejecting webhook (fail-closed)");
          res.status(403).json({ error: "Webhook authentication not configured" });
          return;
        }

        const signature = req.headers["x-twilio-signature"] as string | undefined;
        if (!signature) {
          res.status(403).json({ error: "Missing X-Twilio-Signature header" });
          return;
        }

        const isValid = validateWithToken(authToken, req);
        if (!isValid) {
          const url = buildUrl(req);
          logger.warn({ url }, "Invalid Twilio signature — rejecting webhook");
          res.status(403).json({ error: "Invalid Twilio signature" });
          return;
        }

        next();
      })
      .catch((err) => {
        logger.error({ err }, "Error resolving Twilio auth token for signature validation");
        res.status(500).json({ error: "Internal error" });
      });
  };
}
