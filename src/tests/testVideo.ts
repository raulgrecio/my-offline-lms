import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import path from "path";
import { requireValidSession } from "../utils/auth";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();
chromium.use(stealth());

const STATE_FILE = path.resolve(__dirname, "../../data/.auth/state.json");

async function testVideoExtarctor(url: string) {
  console.log("=== INICIANDO TEST DE VIDEO EXTRACTOR ===");
  console.log(`Objetivo: ${url}`);
  
  await requireValidSession();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: STATE_FILE });
  const page = await context.newPage();

  page.on("request", (req) => {
    const reqUrl = req.url();
    const type = req.resourceType();
    
    if (type === "xhr" || type === "fetch" || type === "media") {
       if (!reqUrl.includes(".png") && !reqUrl.includes(".jpg") && !reqUrl.includes(".woff")) {
         console.log(`[NET ${type.toUpperCase()}] ${reqUrl}`);
       }
    }
  });

  try {
    console.log(`\nNavegando...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    console.log(`\nEsperando a que la SPA de Oracle renderice el video (15s)...`);
    await page.waitForTimeout(15000); 

    const rawHtml = await page.content();
    console.log(`\n[HTML] Tamaño: ${rawHtml.length} bytes`);
    fs.writeFileSync(path.resolve(__dirname, "../../data/debug/test_159015.html"), rawHtml);

    const iframes = await page.locator('iframe').all();
    console.log(`\n[IFRAMES] Se encontraron ${iframes.length} iframes.`);
    for (const fr of iframes) {
       console.log(`  - SRC: ${await fr.getAttribute('src')}`);
    }

    console.log(`\n=== PRUEBA DE INTERACCIÓN ===`);
    // Intento localizar y clickar algo que active el video
    const videoId = url.split('/').pop();
    if (videoId) {
        const videoLinkSelector = `a[href*="/${videoId}"]`;
        const linkLocator = page.locator(videoLinkSelector).first();
        if (await linkLocator.isVisible({ timeout: 2000 })) {
            console.log(`🖱️  Clickando en el enlace de la lista para forzar reproductor...`);
            await linkLocator.click();
            await page.waitForTimeout(10000);
        } else {
            console.log(`No se vio enlace de video en la playlist.`);
            // Buscar un botón de play genérico en brightcove
            const playButton = page.locator('.vjs-big-play-button').first();
            if (await playButton.isVisible({ timeout: 2000 })) {
                console.log(`🖱️  Encontrado botón de Play de VideoJS/Brightcove, clickeando...`);
                await playButton.click();
                await page.waitForTimeout(10000);
            }
        }
    }

  } catch (err) {
    console.error(`❌ Error en prueba:`, err);
  } finally {
    await browser.close();
    console.log("=== FIN ===");
  }
}

testVideoExtarctor("https://mylearn.oracle.com/ou/course/oracle-database-19c-sql-workshop/105208/159015").catch(console.error);
