import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { db } from "../db/schema";
import dotenv from "dotenv";

dotenv.config();

chromium.use(stealth());

const STATE_FILE = path.resolve(__dirname, "../../data/.auth/state.json");
const ASSETS_BASE_DIR = path.resolve(__dirname, "../../data/assets");

// Configuraciones desde el entorno
const CREATE_PDF = process.env.CREATE_PDF === "true";
const IMAGE_QUALITY = parseInt(process.env.IMAGE_QUALITY || "80", 10);
const KEEP_TEMP_IMAGES = process.env.KEEP_TEMP_IMAGES === "true";
const OPTIMIZE_IMAGES = process.env.OPTIMIZE_IMAGES === "true";
const PLATFORM_BASE_URL = process.env.PLATFORM_BASE_URL;

// Helper para crear directorios si no existen
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export interface PDFOptions {
  optimize: boolean;
  quality: number;
}

/**
 * Combina las imágenes de un directorio en un PDF
 */
export async function buildPDF(sourceDir: string, outputPath: string, options: PDFOptions = { optimize: false, quality: 80 }) {
  const images = fs.readdirSync(sourceDir)
    .filter(f => f.endsWith(".jpg") || f.endsWith(".png"))
    .sort((a, b) => {
      // Ordenar numéricamente "1.jpg", "2.jpg"
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      return numA - numB;
    });

  if (images.length === 0) {
    console.log("[buildPDF] No hay imágenes para construir el PDF en " + sourceDir);
    return;
  }

  const doc = new PDFDocument({ autoFirstPage: false });
  const writeStream = fs.createWriteStream(outputPath);
  
  // Promesa para esperar a que el stream finalice
  const pdfFinished = new Promise<void>((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  doc.pipe(writeStream);

  for (const imgName of images) {
    const imgPath = path.join(sourceDir, imgName);
    let imgData: string | Buffer = imgPath;
    
    if (options.optimize) {
      console.log(`[buildPDF] Optimizando imagen: ${imgName}`);
      imgData = await sharp(imgPath)
        .jpeg({ quality: options.quality, mozjpeg: true })
        .toBuffer();
    }

    // Añadir cada imagen usando el tamaño de la propia imagen detectado
    doc.addPage({ margin: 0 }).image(imgData, 0, 0, { fit: [doc.page.width, doc.page.height], align: 'center', valign: 'center' });
  }

  doc.end();
  
  await pdfFinished;
}

export async function downloadGuide(courseId: string, ekitId: string, learnerId: string = "38560") {
  if (!PLATFORM_BASE_URL) {
    throw new Error("PLATFORM_BASE_URL no está definido en el archivo .env");
  }
  // Crear estructura: data/assets/<courseId>/guides
  const courseBaseDir = path.join(ASSETS_BASE_DIR, String(courseId));
  ensureDir(courseBaseDir);
  
  const courseGuidesDir = path.join(courseBaseDir, "guides");
  ensureDir(courseGuidesDir);

  const tempDir = path.join(courseGuidesDir, ".temp_" + ekitId);
  ensureDir(tempDir);

  // Extraer metadata original de la BD para sacar el nombre del archivo  
  let pdfFilename = `Course_${courseId}_Guide_${ekitId}.pdf`;
  try {
    const row = db.prepare("SELECT metadata FROM Course_Assets WHERE id = ?").get(`pdf_${ekitId}`) as { metadata: string } | undefined;
    if (row && row.metadata) {
      const meta = JSON.parse(row.metadata);
      if (meta.url) {
        // e.g. "D106548GC10/D106548GC10_sg.pdf" -> "D106548GC10_sg.pdf"
        const parts = meta.url.split('/');
        pdfFilename = parts[parts.length - 1] || pdfFilename;
      }
    }
  } catch (err) {
    console.log("[GuideDownloader] No se pudo leer metadata de SQLite para el nombre original del archivo.");
  }

  const pdfPath = path.join(courseGuidesDir, pdfFilename);
  
  if (fs.existsSync(pdfPath)) {
    console.log("[GuideDownloader] El PDF ya existe: " + pdfPath);
    return;
  }

  // Usar la base de la plataforma extraída del .env para no depender de hardcodes.
  // Notar que el courseId y el ekitId lo proporcionamos nostros extraido en el courseMapper
  const urlBase = new URL(PLATFORM_BASE_URL).origin; 
  const ekitUrl = urlBase + "/ou/ekit/" + courseId + "/" + learnerId + "/" + ekitId + "/course";
  
  console.log("[GuideDownloader] Obteniendo visor de guía en: " + ekitUrl);

  if (!fs.existsSync(STATE_FILE)) {
    console.error("[GuideDownloader] ❌ Error: No existe sesion guardada. Ejecute el login primero.");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: STATE_FILE });
  const page = await context.newPage();

  try {
    await page.goto(ekitUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    
    // Esperar al frame que contiene la URL directa
    const iframeElement = await page.waitForSelector("#ekitIframe", { timeout: 30000 });
    const iframeSrc = await iframeElement.getAttribute("src");
    
    if (!iframeSrc) {
      throw new Error("No se pudo extraer el atributo src de #ekitIframe");
    }

    console.log("[GuideDownloader] Encontrado visor base URL: " + iframeSrc);
    
    // Analizar la base URL del iframe del object storage
    const baseUrl = iframeSrc.split('mobile/index.html')[0].split('index.html')[0];
    
    console.log("[GuideDownloader] Descargando páginas...");
    let pageNum = 1;
    let consecutiveMissingPages = 0;
    const MAX_CONSECUTIVE_MISSING = 3;

    // Bucle para iterar las imágenes hasta que devuelva 404 (Fin de documento)
    while (consecutiveMissingPages < MAX_CONSECUTIVE_MISSING) { // Tolerancia por si se salta un número
      const imgUrl = baseUrl + "files/mobile/" + pageNum + ".jpg?ts=" + Date.now();
      
      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await context.request.get(imgUrl);
        if (response.status() === 200) {
          const buffer = await response.body();
          const savePath = path.join(tempDir, String(pageNum).padStart(3, '0') + ".jpg");
          
          fs.writeFileSync(savePath, buffer);
          console.log(`   -> Salvada página ${pageNum}` + (attempt > 1 ? ` (intento ${attempt})` : ""));
          success = true;
          break;
        } else {
          if (attempt === 3) {
            console.log(`   -> Error ${response.status()} al buscar la página ${pageNum} tras 3 intentos`);
          } else {
            // Espera corta antes de reintentar
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }

      if (success) {
        consecutiveMissingPages = 0;
      } else {
        consecutiveMissingPages++;
      }
      pageNum++;
    }

    const lastPageNum = pageNum - 1 - MAX_CONSECUTIVE_MISSING;
    let missingPages: number[] = [];
    for (let i = 1; i <= lastPageNum; i++) {
       const savePath = path.join(tempDir, String(i).padStart(3, '0') + ".jpg");
       if (!fs.existsSync(savePath)) {
          missingPages.push(i);
       }
    }

    if (missingPages.length > 0) {
       console.log(`[GuideDownloader] Detectadas ${missingPages.length} páginas faltantes. Reintentando pase final...`);
       const remainingMissing: number[] = [];
       for (const missingPage of missingPages) {
          const imgUrl = baseUrl + "files/mobile/" + missingPage + ".jpg?ts=" + Date.now();
          const response = await context.request.get(imgUrl);
          if (response.status() === 200) {
             const buffer = await response.body();
             const savePath = path.join(tempDir, String(missingPage).padStart(3, '0') + ".jpg");
             fs.writeFileSync(savePath, buffer);
             console.log(`   -> Recuperada exitosamente página faltante ${missingPage}`);
          } else {
             console.log(`   -> Fallo definitivo al recuperar página ${missingPage}`);
             remainingMissing.push(missingPage);
          }
       }
       missingPages = remainingMissing;
    }

    if (missingPages.length > 0) {
       console.log(`[GuideDownloader] ❌ Faltan páginas irreparables: ${missingPages.join(", ")}. Abortando creación de PDF.`);
       console.log(`[GuideDownloader] Las imágenes descargadas se mantienen en: ${tempDir}`);
       try {
         db.prepare("UPDATE Course_Assets SET status = 'FAILED' WHERE id = ?").run("pdf_" + ekitId);
       } catch(e) {}
       await browser.close();
       return;
    }

    if (CREATE_PDF) {
      console.log("[GuideDownloader] Finalizada descarga extractora. Montando PDF...");
      await buildPDF(tempDir, pdfPath, { optimize: OPTIMIZE_IMAGES, quality: IMAGE_QUALITY });
      console.log("[GuideDownloader] ✅ PDF Guardado en: " + pdfPath);

      // Limpieza o Mantenimiento de las imágenes según configuración en .env
      if (!KEEP_TEMP_IMAGES) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log("[GuideDownloader] Borrado directorio temporal: " + tempDir);
      } else {
        console.log("[GuideDownloader] Mantenidas las imágenes intactas en: " + tempDir);
      }
    } else {
      console.log("[GuideDownloader] CREATE_PDF es false. Omitiendo generación de PDF.");
      console.log("[GuideDownloader] Las imágenes generadas se mantienen en: " + tempDir);
    }
    
    // Actualizar BD si existe
    const updateAsset = db.prepare("UPDATE Course_Assets SET status = 'COMPLETED' WHERE id = ?");
    updateAsset.run("pdf_" + ekitId);

  } catch (err) {
    console.error("[GuideDownloader] ❌ Error extrayendo guía " + ekitId + ":", err);
    try {
      db.prepare("UPDATE Course_Assets SET status = 'FAILED' WHERE id = ?").run("pdf_" + ekitId);
    } catch(e) {}
  } finally {
    await browser.close();
  }
}

export async function downloadCourseGuides(courseId: string) {
  console.log(`[BatchDownloader] Iniciando descarga masiva de guías para el curso: ${courseId}`);
  try {
    const rows = db.prepare("SELECT metadata FROM Course_Assets WHERE course_id = ? AND type = 'guide'").all(courseId) as { metadata: string }[];
    
    if (rows.length === 0) {
      console.log(`[BatchDownloader] No se encontraron guías en la base de datos para el curso ${courseId}.`);
      console.log("Asegúrate de haber interceptado y mapeado los metadatos primero.");
      return;
    }
    
    console.log(`[BatchDownloader] Se encontraron ${rows.length} guías. Comenzando descargas...`);
    for (const row of rows) {
      try {
        const kit = JSON.parse(row.metadata);
        if (kit && kit.ekitId) {
          console.log(`\n======================================================`);
          console.log(`[BatchDownloader] Descargando: ${kit.name || kit.ekitId}`);
          await downloadGuide(courseId, kit.ekitId, kit.learnerId || "38560");
        }
      } catch(e) {
        console.error(`[BatchDownloader] Error interpretando metadato:`, e);
      }
    }
    console.log(`\n======================================================`);
    console.log(`[BatchDownloader] 🎉 Finalizada la descarga de las ${rows.length} guías del curso ${courseId}.`);
  } catch (err) {
    console.error("[BatchDownloader] Error consultando SQLite:", err);
  }
}

// Interfaz para ejecución por terminal
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--build-pdf') {
    if (args.length < 3) {
      console.log("Uso: ts-node src/scraper/guideDownloader.ts --build-pdf <tempDir> <outputPath>");
      process.exit(1);
    }
    const tempDir = args[1];
    const outputPath = args[2];
    console.log(`[GuideDownloader] Construyendo PDF desde directorio: ${tempDir} (Optimize: ${OPTIMIZE_IMAGES}, Quality: ${IMAGE_QUALITY})`);
    buildPDF(tempDir, outputPath, { optimize: OPTIMIZE_IMAGES, quality: IMAGE_QUALITY })
      .then(() => console.log(`[GuideDownloader] ✅ PDF Guardado en: ${outputPath}`))
      .catch(console.error);
  } else if (args.length === 1 && args[0] !== '--build-pdf') {
    downloadCourseGuides(args[0]).catch(console.error);
  } else {
    if (args.length < 2) {
      console.log("Uso descargas individuales: ts-node src/scraper/guideDownloader.ts <courseId> <ekitId> [learnerId]");
      console.log("Uso descarga masiva curso:  ts-node src/scraper/guideDownloader.ts <courseId>");
      console.log("Uso compilación manual:     ts-node src/scraper/guideDownloader.ts --build-pdf <tempDir> <outputPath>");
      console.log("Ej (Individual): pnpm exec ts-node src/scraper/guideDownloader.ts 77517 594144ed-4db7-453c-a110-0cb40f5b0f87");
      console.log("Ej (Masiva):     pnpm exec ts-node src/scraper/guideDownloader.ts 77517");
      process.exit(1);
    }
    
    downloadGuide(args[0], args[1], args[2] || "38560").catch(console.error);
  }
}
