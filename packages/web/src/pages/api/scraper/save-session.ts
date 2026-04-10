import type { APIRoute } from "astro";
import { ScraperService } from "@scraper/index";

export const POST: APIRoute = async () => {
  try {
    const scraper = await ScraperService.create();
    const success = await scraper.saveActiveSession();

    if (success) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ success: false, error: "No hay ninguna sesión activa en el navegador para guardar." }), { status: 400 });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};
