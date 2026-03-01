import { db } from "../db/schema";
import { parsePlatform } from "./mapper";
import { processCourseMetadata } from "./courseMapper";
import { downloadGuide } from "./guideDownloader";
import path from "path";
import fs from "fs";

/**
 * Orquestador principal de un Learning Path.
 * Recibe un path_id y procede a descargar recursivamente todos sus cursos y metadatos.
 */
async function downloadLearningPath(pathId: string) {
  console.log(`\n======================================================`);
  console.log(`🚀 [PathDownloader] Iniciando procesamiento del Learning Path: ${pathId}`);
  console.log(`======================================================`);

  // 1. Obtener la lista de cursos ordenados para este Learning Path
  const courses = db.prepare(`
    SELECT course_id, title, slug, order_index
    FROM LearningPath_Courses
    JOIN Courses ON course_id = id
    WHERE path_id = ?
    ORDER BY order_index ASC
  `).all(pathId) as any[];

  if (courses.length === 0) {
    console.warn(`⚠️ No se encontraron cursos para el path_id ${pathId}.`);
    console.log(`Asegúrate de haber mapeado la URL del path con 'mapper.ts' y haber procesado su JSON con 'learningPathMapper.ts' antes de usar este descargador masivo.`);
    process.exit(1);
  }

  console.log(`📚 Encontrados ${courses.length} cursos listos para revisar/descargar.\n`);

  // 2. Iterar ordenadamente por cada curso
  for (const course of courses) {
    console.log(`\n------------------------------------------------------`);
    console.log(`➤ Procesando: [${course.order_index}/${courses.length}] ${course.title} (ID: ${course.course_id})`);
    console.log(`------------------------------------------------------`);

    // Comprobar si ya tenemos metadatos cacheados para este curso en Course_Assets
    const assetsCountResult = db.prepare(`
      SELECT COUNT(*) as count FROM Course_Assets WHERE course_id = ?
    `).get(course.course_id) as { count: number };

    // Si el conteo es 0, no hay PDFs ni vídeos registrados para ese curso, toca usar el mapper
    if (assetsCountResult.count === 0) {
      console.log(`⚠️ [PathDownloader] No se detectan metadatos de recursos para este curso.`);
      console.log(`🔄 [PathDownloader] Invocando 'mapper.ts' sobre el curso para rashear la estructura interna...`);

      // Ejecutar scraper del curso en backend (abrirá el Chromium)
      const courseUrlTail = `ou/course/${course.slug}/${course.course_id}`;
      try {
        await parsePlatform(courseUrlTail);
      } catch (e) {
        console.error(`❌ [PathDownloader] Error mapeando el curso ${course.course_id}. Saltando...`, e);
        continue;
      }

      console.log(`🔄 [PathDownloader] Mapeo completado. Procesando y guardando los JSON interceptados con 'courseMapper.ts'...`);
      
      // Buscar el JSON recién descargado en la carpeta data/debug
      const debugDir = path.resolve(__dirname, "../../data/debug");
      if (fs.existsSync(debugDir)) {
        const metadataFiles = fs.readdirSync(debugDir).filter(f => f.includes(`content_courses_${course.course_id}_metadata.json`));
        if (metadataFiles.length > 0) {
          // Si hay varios, usar el más reciente (último)
          const targetMetadataFile = path.join(debugDir, metadataFiles[metadataFiles.length - 1]);
          try {
            processCourseMetadata(targetMetadataFile);
            console.log(`✅ [PathDownloader] Metadatos SQLite actualizados para ${course.course_id}.`);
          } catch(e) {
             console.error(`❌ [PathDownloader] Fallo procesando el JSON en db: ${targetMetadataFile}`, e);
          }
        } else {
           console.log(`❌ [PathDownloader] No se generó el archivo '*_content_courses_${course.course_id}_metadata.json' tras el scraping. Imposible descargar guías.`);
           continue; // Saltar a siguiente curso
        }
      }
    } else {
       console.log(`✅ [PathDownloader] Ya existen metadatos de recursos para el curso en SQLite.`);
    }

    // 3. Ya tenemos la BD llena con los Assets del curso (ya fuesen viejos o nuevos). 
    // Llamar al subrutinario guideDownloader para bajar SOLO las guías (PDFs)
    const guides = db.prepare(`
      SELECT id, metadata FROM Course_Assets WHERE course_id = ? AND type = 'guide' AND status != 'COMPLETED'
    `).all(course.course_id) as any[];

    if (guides.length > 0) {
      console.log(`📥 [PathDownloader] Encontradas ${guides.length} guías pendientes. Iniciando descarga con 'guideDownloader'...`);
      for (const guide of guides) {
         try {
           const metaObj = JSON.parse(guide.metadata);
           if (!metaObj.ekitId) {
              console.log(`⚠️ [PathDownloader] No hay ekitId válido para ${guide.id}`);
              continue;
           }
           // Re-aprovechar tu infraestructura robusta de guideDownloader (navegador y conversión PDF)
           await downloadGuide(course.course_id, metaObj.ekitId);
         } catch (e) {
           console.error(`❌ [PathDownloader] Error descargando guía ${guide.id}:`, e);
         }
      }
    } else {
      console.log(`✅ [PathDownloader] No hay guías pendientes por descargar para este curso. Todas están en 'COMPLETED' o no existen.`);
    }

    // FIN del procesamiento del curso; pasamos al siguiente
  }

  console.log(`\n======================================================`);
  console.log(`🎉 [PathDownloader] ¡PROCESAMIENTO RUTA ${pathId} COMPLETADO!`);
  console.log(`======================================================`);
}

// Ejecución CLI directa
if (require.main === module) {
  const pathId = process.argv[2];
  if (!pathId) {
    console.error("❌ Por favor indica el identificador del Learning Path.");
    console.log("Uso: pnpm exec ts-node src/scraper/pathDownloader.ts <pathId>");
    process.exit(1);
  }
  
  downloadLearningPath(pathId).catch(err => {
    console.error(`[PathDownloader] Error Crítico Fatal:`, err);
    process.exit(1);
  });
}
