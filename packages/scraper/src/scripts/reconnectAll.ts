import { db } from "@db/schema";
import { verifyCourseDownloads } from "./verifyDownloads";
import { logger } from "@platform/logging";

/**
 * Reconnects all courses by running verifyCourseDownloads with repair = true.
 */
async function reconnectAll() {
    logger.info("🚀 Starting reconnection of all courses...");
    
    const courses = db.prepare("SELECT id FROM Courses").all() as { id: string }[];
    
    logger.info(`found ${courses.length} courses to verify.`);
    
    for (const course of courses) {
        try {
            verifyCourseDownloads({ courseId: course.id, repair: true });
        } catch (error) {
            logger.error(`❌ Error reconnecting course ${course.id}:`, error);
        }
    }
    
    logger.info("\n✨ Reconnection process finished.");
}

if (require.main === module) {
    reconnectAll();
}
