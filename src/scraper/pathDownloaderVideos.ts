import { db } from "../db/schema";
import { downloadCourseVideos } from "../downloader/videos";
import dotenv from "dotenv";

dotenv.config();

async function downloadLearningPathCourses(pathId: string) {
    console.log(`=== INICIANDO DESCARGA DEL LEARNING PATH: ${pathId} ===`);

    const titleRow = db.prepare(`SELECT title FROM LearningPaths WHERE id = ?`).get(pathId) as any;
    if (titleRow) {
        console.log(`Título: ${titleRow.title}`);
    }

    // Fetch courses strictly belonging to this learning path, ordered sequentially
    const courses = db.prepare(`
        SELECT c.id, c.title 
        FROM Courses c
        JOIN LearningPath_Courses lpc ON c.id = lpc.course_id
        WHERE lpc.path_id = ?
        ORDER BY lpc.order_index ASC
    `).all(pathId) as { id: string, title: string }[];
    
    if (courses.length === 0) {
        console.log(`No se encontraron cursos activos para el Learning Path ${pathId}.`);
        console.log("Asegúrate de haber corrido src/scraper/learningPathMapper.ts y src/scraper/courseMapper.ts previamente.");
        return;
    }

    console.log(`Se descargarán ${courses.length} cursos en orden secuencial.\n`);

    let successCount = 0;
    
    for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        console.log(`\n========================================================`);
        console.log(`[>>] RUTA ${pathId} | CURSO ${i + 1}/${courses.length}: ${course.title} (ID: ${course.id})`);
        console.log(`========================================================`);
        
        try {
            await downloadCourseVideos(course.id);
            successCount++;
        } catch (error: any) {
            console.error(`\n[ERROR GLOBAL] Falló la descarga del sub-curso ${course.id}:`, error.message);
            console.log(`Continuando con el siguiente curso en 5 segundos...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    console.log(`\n=== DESCARGA DEL LEARNING PATH ${pathId} FINALIZADA ===`);
    console.log(`Cursos procesados: ${successCount}/${courses.length}`);
}

const args = process.argv.slice(2);
const targetPath = args[0];

if (!targetPath) {
    console.error("Uso: pnpm exec ts-node src/downloadLearningPath.ts <ID_DEL_PATH>");
    console.error("Ejemplo: pnpm exec ts-node src/downloadLearningPath.ts 80836");
    process.exit(1);
}

downloadLearningPathCourses(targetPath).catch(console.error);
