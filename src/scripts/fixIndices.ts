import { db } from "../db/schema";

const courseId = process.argv[2] || "77517";

console.log(`[FixIndices] Recovering missing order_index for course: ${courseId}`);

const rows = db.prepare("SELECT rowid, id, metadata FROM Course_Assets WHERE course_id = ? AND type = 'video' ORDER BY rowid ASC").all(courseId) as any[];

let index = 1;
for (const row of rows) {
    const meta = JSON.parse(row.metadata || "{}");
    
    // Only update if it's missing or null
    if (!meta.order_index) {
        meta.order_index = index;
        
        db.prepare("UPDATE Course_Assets SET metadata = ? WHERE id = ?").run(JSON.stringify(meta), row.id);
        console.log(`Updated ${row.id} with order_index: ${index} (${meta.title})`);
    } else {
        console.log(`Skipped ${row.id}, already has order_index: ${meta.order_index}`);
    }
    index++;
}

console.log(`[FixIndices] Accomplished.`);
