import { db } from "../db/schema";
import fs from "fs";
import path from "path";

/**
 * Lee un JSON interceptado guardado en `data/debug/` de tipo _pagedata.json
 * y vuelca la información del Learning Path y sus Cursos en la Base de Datos.
 */
export function processLearningPathMetadata(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const json = JSON.parse(content);

  const lpData = json.data?.lpPageData;
  if (!lpData || !lpData.id || !lpData.containerChildren) {
    console.log(`[learningPathMapper] ⚠️ ${filePath} no parece un metadato de Learning Path válido. Saltando.`);
    return;
  }

  const pathId = lpData.id;
  const pathTitle = lpData.name;
  const pathSlug = pathTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  // La descripción viene con tags HTML <p>...</p>, se pueden guardar tal cual
  const pathDesc = lpData.description || "";

  console.log(`\n[learningPathMapper] 🧭 Procesando Learning Path: ${pathTitle} (${pathId})`);

  // 1. Guardar el Learning Path
  const insertPath = db.prepare(`
    INSERT INTO LearningPaths (id, slug, title, description) 
    VALUES (?, ?, ?, ?) 
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, slug = excluded.slug, description = excluded.description
  `);
  insertPath.run(pathId, pathSlug, pathTitle, pathDesc);

  // Declaraciones preparadas para Cursos y Relaciones
  const insertCourse = db.prepare(`
    INSERT INTO Courses (id, slug, title) 
    VALUES (?, ?, ?) 
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, slug = excluded.slug
  `);

  const insertRelation = db.prepare(`
    INSERT INTO LearningPath_Courses (path_id, course_id, order_index)
    VALUES (?, ?, ?)
    ON CONFLICT(path_id, course_id) DO UPDATE SET order_index = excluded.order_index
  `);

  let coursesAdded = 0;
  let orderIndex = 1;

  // 2. Extraer Cursos (containerChildren)
  for (const child of lpData.containerChildren) {
    // typeId == "22" identifica a un curso estándar ("Course").
    // typeId == "23" es Practice Exam.
    // typeId == "20" es Certificación.
    // Solo queremos los cursos.
    if (child.typeId !== "22") {
      console.log(`[learningPathMapper] ⏭️ Omitiendo item no-curso: ${child.name} (typeId: ${child.typeId})`);
      continue;
    }
    
    // Ignoramos nodos que no tengan ID o Titulo
    if (!child.id || !child.name) continue;

    const courseId = child.id;
    const courseTitle = child.name;
    const courseSlug = courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Insertar el curso en la tabla general de Courses
    insertCourse.run(courseId, courseSlug, courseTitle);

    // Insertar la relación (Mapping) de que este curso pertenece a este Path
    insertRelation.run(pathId, courseId, orderIndex);

    coursesAdded++;
    orderIndex++;
  }

  console.log(`[learningPathMapper] ✅ Learning Path guardado. Se han vinculado ${coursesAdded} cursos a esta ruta.`);
}

// Para ejecutar individualmente y probar
if (require.main === module) {
  const targetFile = process.argv[2];
  if (targetFile && fs.existsSync(targetFile)) {
    processLearningPathMetadata(targetFile);
  } else {
    // Si no se le pasa archivo explícito, busca automáticamente los json de metadatos de learning paths
    const debugDir = path.resolve(__dirname, "../../data/debug");
    const files = fs.readdirSync(debugDir)
                    .filter(f => f.includes("content_learning_path_") && f.endsWith("_pagedata.json"));
    
    if (files.length === 0) {
      console.log(`[learningPathMapper] 🤷 No se encontraron JSON de Learning Paths en ${debugDir}`);
    } else {
      for (const file of files) {
        processLearningPathMetadata(path.join(debugDir, file));
      }
    }
  }
}
