import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// pg-connection-string can't strip brackets from IPv6 literals before passing to getaddrinfo.
// If DATABASE_URL contains a bracketed IPv6 host, parse it manually into discrete options.
function buildPoolConfig(url: string): pg.PoolConfig {
  const ipv6Match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@\[([^\]]+)\]:(\d+)\/([^?]+)/);
  if (ipv6Match) {
    const [, user, password, host, portStr, database] = ipv6Match;
    return { user, password, host, port: Number(portStr), database, ssl: { rejectUnauthorized: false } };
  }
  return { connectionString: url };
}

export const pool = new Pool(buildPoolConfig(process.env.DATABASE_URL));
export const db = drizzle(pool, { schema });

export * from "./schema";
