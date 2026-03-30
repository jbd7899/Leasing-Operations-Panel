import { db, accountUsersTable, prospectsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { runSeedForAccount } from "../seed";
import { logger } from "./logger";

export async function autoSeedIfEmpty(): Promise<void> {
  try {
    const owners = await db
      .select({ accountId: accountUsersTable.accountId })
      .from(accountUsersTable)
      .where(eq(accountUsersTable.role, "owner"));

    for (const { accountId } of owners) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(prospectsTable)
        .where(eq(prospectsTable.accountId, accountId));

      if (Number(total) === 0) {
        logger.info({ accountId }, "Auto-seeding empty account with test data");
        const result = await runSeedForAccount(accountId, (msg) => logger.info(msg));
        if (result.seeded) {
          logger.info(
            { accountId, properties: result.properties, prospects: result.prospects, interactions: result.interactions },
            "Auto-seed complete",
          );
        }
        return;
      }
    }
  } catch (err) {
    logger.warn({ err }, "Auto-seed check failed — server continues without test data");
  }
}
