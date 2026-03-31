import { getDb } from "@scraper/platform/database";
import { logger } from "@scraper/platform/logging";

async function main() {
  const courseId = process.argv[2] || "77517";

  logger.info(`[FixIndices] Recovering missing order_index for course: ${courseId}`);

  const db = await getDb();

  const rows = db.prepare("SELECT rowid, id, metadata FROM Course_Assets WHERE course_id = ? AND type = 'video' ORDER BY rowid ASC").all(courseId) as any[];

  let index = 1;
  for (const row of rows) {
    const meta = JSON.parse(row.metadata || "{}");

    // Only update if it's missing or null
    if (!meta.order_index) {
      meta.order_index = index;

      db.prepare("UPDATE Course_Assets SET metadata = ? WHERE id = ?").run(JSON.stringify(meta), row.id);
      logger.info(`Updated ${row.id} with order_index: ${index} (${meta.name})`);
    } else {
      logger.info(`Skipped ${row.id}, already has order_index: ${meta.order_index}`);
    }
    index++;
  }

  logger.info(`[FixIndices] Accomplished.`);
}

main();
