import app from "./app";
import cron from "node-cron";
import { logger } from "./lib/logger";
import { computeAndSendDigests } from "./lib/dailyDigest";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Daily digest — runs at 8:03 AM server time
  cron.schedule("3 8 * * *", async () => {
    logger.info("Running daily digest job");
    try {
      await computeAndSendDigests();
    } catch (digestErr) {
      logger.error({ err: digestErr }, "Daily digest job failed");
    }
  });
});
