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
const GUIDES_DIR = path.resolve(__dirname, "../../data/assets/guides");

// Configuraciones desde el entorno
const PLATFORM_BASE_URL = process.env.PLATFORM_BASE_URL;
const OPTIMIZE_IMAGES = process.env.OPTIMIZE_IMAGES === "true";
const KEEP_TEMP_IMAGES = process.env.KEEP_TEMP_IMAGES === "true";
const IMAGE_QUALITY = parseInt(process.env.IMAGE_QUALITY || "80", 10);

// Helper para crear directorios si no existen
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Combina las imágenes de un directorio en un PDF
 */
async function buildPDF(tempDir: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const images = fs.readdirSync(tempDir)
      .filter(f => f.endsWith(".jpg") || f.endsWith(".png"))
      .sort((a, b) => {
        // Ordenar numéricamente "1.jpg", "2.jpg"
        const numA = parseInt(a.replace(/\\D/g, ""), 10);
        const numB = parseInt(b.replace(/\\D/g, ""), 10);
        return numA - numB;
      });

    if (images.length === 0) {
      console.log("[buildPDF] No hay imágenes para construir el PDF en " + tempDir);
      return resolve();
    }

    const doc = new PDFDocument({ autoFirstPage: false });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    for (const imgName of images) {
      const imgPath = path.join(tempDir, imgName);
      // Añadir cada imagen usando el tamaño de la propia imagen detectado por pdfkit
      doc.addPage({ margin: 0 }).image(imgPath, 0, 0, { fit: [doc.page.width, doc.page.height], align: 'center', valign: 'center' });
    }

    doc.end();

    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

export async function downloadGuide(courseId: string, ekitId: string, learnerId: string = "38560") {
  if (!PLATFORM_BASE_URL) {
    throw new Error("PLATFORM_BASE_URL no está definido en el archivo .env");
  }
  ensureDir(GUIDES_DIR);
  
  const tempDir = path.join(GUIDES_DIR, ".temp_" + ekitId);
  ensureDir(tempDir);

  const pdfPath = path.join(GUIDES_DIR, "Course_" + courseId + "_Guide_" + ekitId + ".pdf");
  
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
    let consecutiveErrors = 0;

    // Bucle para iterar las imágenes hasta que devuelva 404 (Fin de documento)
    while (consecutiveErrors < 3) { // Tolerancia por si se salta un número
      const imgUrl = baseUrl + "files/mobile/" + pageNum + ".jpg?ts=" + Date.now();
      const response = await context.request.get(imgUrl);
      
      if (response.status() === 200) {
        const buffer = await response.body();
        const savePath = path.join(tempDir, String(pageNum).padStart(3, '0') + ".jpg");
        
        if (OPTIMIZE_IMAGES) {
          // Usar Sharp para recomprimir el JPG y rebajar calidad / peso
          await sharp(buffer)
            .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
            .toFile(savePath);
          console.log("   -> Salvada y Optimizada página " + pageNum);
        } else {
          fs.writeFileSync(savePath, buffer);
          console.log("   -> Salvada página " + pageNum);
        }
        
        pageNum++;
        consecutiveErrors = 0; // reset
      } else {
        console.log("   -> Error " + response.status() + " al buscar la página " + pageNum);
        consecutiveErrors++;
        pageNum++;
      }
    }

    console.log("[GuideDownloader] Finalizada descarga extractora. Montando PDF...");
    await buildPDF(tempDir, pdfPath);
    console.log("[GuideDownloader] ✅ PDF Guardado en: " + pdfPath);

    // Limpieza o Mantenimiento de las imágenes según configuración en .env
    if (!KEEP_TEMP_IMAGES) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log("[GuideDownloader] Borrado directorio temporal: " + tempDir);
    } else {
      console.log("[GuideDownloader] Mantenidas las imágenes intactas en: " + tempDir);
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

// Interfaz para ejecución por terminal
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Uso: ts-node src/scraper/guideDownloader.ts <courseId> <ekitId> [learnerId]");
    console.log("Ej:  ts-node src/scraper/guideDownloader.ts 77517 594144ed-4db7-453c-a110-0cb40f5b0f87");
    process.exit(1);
  }
  
  downloadGuide(args[0], args[1], args[2] || "38560").catch(console.error);
}
