import { db } from "../db/schema";
import fs from "fs";
import path from "path";

/**
 * Lee un JSON interceptado guardado en \`data/debug/\` y vuelca la información en la Base de Datos.
 */
export function processCourseMetadata(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const json = JSON.parse(content);

  const courseData = json.data;
  if (!courseData || !courseData.id || !courseData.modules) {
    console.log("[courseMapper] ⚠️ " + filePath + " no parece un metadato de curso válido. Saltando.");
    return;
  }

  const courseId = courseData.id;
  const courseSlug = courseData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const courseTitle = courseData.name;

  console.log("[courseMapper] 📚 Procesando Curso: " + courseTitle + " (" + courseId + ")");

  // 1. Guardar el curso
  const insertCourse = db.prepare(`
    INSERT INTO Courses (id, slug, title) 
    VALUES (?, ?, ?) 
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, slug = excluded.slug
  `);
  insertCourse.run(courseId, courseSlug, courseTitle);

  const insertAsset = db.prepare(`
    INSERT INTO Course_Assets (id, course_id, type, url, metadata, status)
    VALUES (?, ?, ?, ?, ?, 'PENDING')
    ON CONFLICT(id) DO NOTHING
  `);

  let videosCount = 0;
  let pdfsCount = 0;

  // 2. Extraer Vídeos (components)
  for (const mod of courseData.modules) {
    for (const comp of mod.components) {
      if (comp.typeId === "1") { // 1 = Video
        const assetId = "video_" + comp.id;
        const meta = {
          name: comp.name,
          duration: comp.duration,
          moduleName: mod.name
        };

        const targetUrl = comp.videoId ? "brightcove:" + comp.videoId : "https://mylearn.oracle.com/ou/course/" + courseSlug + "/" + courseId + "/" + comp.id;

        insertAsset.run(assetId, courseId, "video", targetUrl, JSON.stringify(meta));
        videosCount++;
      }
    }
  }

  // 3. Extraer PDFs (eKits)
  if (courseData.eKits && Array.isArray(courseData.eKits)) {
    for (const kit of courseData.eKits) {
      const assetId = "pdf_" + kit.id;
      const meta = {
        name: kit.name,
        ekitId: kit.ekitId,
        url: kit.url,
        fileType: kit.fileType
      };

      insertAsset.run(assetId, courseId, "guide", kit.url, JSON.stringify(meta));
      pdfsCount++;
    }
  }

  console.log("[courseMapper] ✅ Curso guardado. Se han añadido " + videosCount + " vídeos y " + pdfsCount + " PDFs listos para descarga.");
}

// Para ejecutar individualmente y probar
if (require.main === module) {
  const targetFile = process.argv[2];
  if (targetFile && fs.existsSync(targetFile)) {
    processCourseMetadata(targetFile);
  } else {
    // Si no se le pasa archivo, busca automáticamente los json de metadatos de cursos
    const debugDir = path.resolve(__dirname, "../../data/debug");
    const files = fs.readdirSync(debugDir)
                    .filter(f => f.includes("content_courses_") && f.endsWith("metadata.json"));
    
    for (const file of files) {
      processCourseMetadata(path.join(debugDir, file));
    }
  }
}
