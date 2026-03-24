import { type Request, type Response, type NextFunction } from "express";

const PUBLIC_PATHS = new Set([
  "/api/healthz",
  "/api/login",
  "/api/callback",
  "/api/logout",
  "/api/auth/user",
]);

const PUBLIC_PREFIXES = [
  "/api/webhooks/",
  "/api/mobile-auth/",
];

export function globalAuthGate(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  if (PUBLIC_PATHS.has(path)) {
    next();
    return;
  }

  for (const prefix of PUBLIC_PREFIXES) {
    if (path.startsWith(prefix)) {
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
