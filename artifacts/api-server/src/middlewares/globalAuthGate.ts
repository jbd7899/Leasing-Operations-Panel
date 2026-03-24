import { type Request, type Response, type NextFunction } from "express";

const PUBLIC_PATHS = new Set([
  "/api/healthz",
  "/api/login",
  "/api/callback",
  "/api/logout",
  "/api/auth/user",
]);

const WEBHOOK_PREFIXES = [
  "/api/webhooks/",
  "/api/mobile-auth/",
];

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

export function globalAuthGate(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  if (PUBLIC_PATHS.has(path)) {
    next();
    return;
  }

  for (const prefix of WEBHOOK_PREFIXES) {
    if (path.startsWith(prefix)) {
      next();
      return;
    }
  }

  if (path.startsWith("/api/internal/")) {
    const header = req.headers["x-internal-secret"];
    if (INTERNAL_SECRET && header === INTERNAL_SECRET) {
      next();
      return;
    }
  }

  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
