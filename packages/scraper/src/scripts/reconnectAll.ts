import { db } from "@db/schema";
import { verifyCourseDownloads } from "./verifyDownloads";

/**
 * Reconnects all courses by running verifyCourseDownloads with repair = true.
 */
async function reconnectAll() {
    console.log("🚀 Starting reconnection of all courses...");
    
    const courses = db.prepare("SELECT id FROM Courses").all() as { id: string }[];
    
    console.log(`found ${courses.length} courses to verify.`);
    
    for (const course of courses) {
        try {
            verifyCourseDownloads({ courseId: course.id, repair: true });
        } catch (error) {
            console.error(`❌ Error reconnecting course ${course.id}:`, error);
        }
    }
    
    console.log("\n✨ Reconnection process finished.");
}

if (require.main === module) {
    reconnectAll();
}
