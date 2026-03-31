import readline from "readline";

import { type ILogger } from '@core/logging';

import { type IUseCase } from '@scraper/features/shared';
import { type IBrowserProvider } from "@scraper/platform/browser";

import { type IAuthSessionStorage } from "../domain/ports/IAuthSessionStorage";

export interface AuthSessionInput {
  baseUrl: string;
  interactive?: boolean;
}

export interface AuthSessionOptions {
  browserProvider: IBrowserProvider;
  authStorage: IAuthSessionStorage;
  logger: ILogger;
}

export class AuthSession implements IUseCase<AuthSessionInput, void> {
  private browserProvider: IBrowserProvider;
  private authStorage: IAuthSessionStorage;
  private logger: ILogger;

  constructor(options: AuthSessionOptions) {
    this.browserProvider = options.browserProvider;
    this.authStorage = options.authStorage;
    this.logger = options.logger.withContext("AuthSession");
  }

  async execute(input: AuthSessionInput): Promise<void> {
    const { baseUrl, interactive = true } = input;
    await this.authStorage.ensureAuthDir();

    this.logger.info(`Iniciando navegador interactivo para: ${baseUrl}`);
    const context = await this.browserProvider.getHeadfulContext(false);
    const page = await context.newPage();

    this.logger.info(`Navegando a ${baseUrl}`);
    this.logger.info("Por favor, realiza el login (incluyendo 2FA) en la ventana del navegador.");

    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    const saveSession = async (): Promise<boolean> => {
      this.logger.info("Guardando estado de la sesión y cookies...");
      try {
        await context.storageState({ path: await this.authStorage.getAuthFile() });
        const cookies = await context.cookies();
        await this.authStorage.saveCookies(cookies);
        this.logger.info("✅ Sesión y cookies guardadas con éxito.");
        return true;
      } catch (e) {
        this.logger.error("❌ Error al guardar sesión:", e);
        return false;
      }
    };

    if (interactive) {
      // Autoguardado silencioso cada 15 minutos en CLI
      const autoSaveInterval = setInterval(() => {
        saveSession();
      }, 15 * 60 * 1000);

      this.logger.info("========================================================", "");
      this.logger.info("👉 PRESIONA 'ENTER' PARA GUARDAR LA SESIÓN");
      this.logger.info("👉 PRESIONA 'ESC' o 'Ctrl+C' PARA SALIR Y CERRAR EL NAVEGADOR");
      this.logger.info("========================================================", "");

      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }

      await new Promise<void>((resolve) => {
        process.stdin.on("keypress", async (str, key) => {
          if ((key.ctrl && key.name === "c") || key.name === "escape") {
            if (process.stdin.isTTY) process.stdin.setRawMode(false);
            this.logger.info("Saliendo y cerrando navegador...");
            clearInterval(autoSaveInterval);
            resolve();
          } else if (key.name === "return" || key.name === "enter") {
            await saveSession();
          }
        });
      });
    } else {
      // Modo Web: Inyectamos un botón de control en la página
      this.logger.info("Modo Web detectado. Inyectando botón de control en el navegador...");

      await context.exposeFunction('finishAuthSession', async () => {
        this.logger.info("Botón de 'Finalizar' pulsado en el navegador.");
        return await saveSession();
      });

      // Inject UI on every page load
      const injectUI = async () => {
        try {
          await page.evaluate(() => {
            if (document.getElementById('my-lms-auth-btn')) return;
            if (!document.body) return;

            // Inject simple animation core
            if (!document.getElementById('my-lms-auth-styles')) {
              const style = document.createElement('style');
              style.id = 'my-lms-auth-styles';
              style.innerHTML = `
                @keyframes my-lms-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                #my-lms-auth-btn svg { flex-shrink: 0; }
              `;
              document.head.appendChild(style);
            }

            const btn = document.createElement('button');
            btn.id = 'my-lms-auth-btn';

            const checkIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            const loadIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation: my-lms-spin 1s linear infinite"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;

            btn.innerHTML = `${checkIcon} <span>FINALIZAR Y GUARDAR</span>`;

            // Use cssText with !important to overpower site styles
            btn.style.cssText = `
              position: fixed !important;
              top: 20px !important;
              left: 20px !important;
              z-index: 2147483647 !important;
              padding: 12px 24px !important;
              background-color: #ef4444 !important;
              color: white !important;
              border: none !important;
              border-radius: 10px !important;
              font-weight: bold !important;
              cursor: pointer !important;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
              font-family: sans-serif !important;
              display: flex !important;
              align-items: center !important;
              gap: 8px !important;
              transition: all 0.2s !important;
            `;

            btn.onclick = async (e) => {
              e.preventDefault();
              e.stopPropagation();
              btn.innerHTML = `${loadIcon} <span>Guardando...</span>`;
              btn.style.setProperty('opacity', '0.8', 'important');
              btn.disabled = true;

              const success = await (window as any).finishAuthSession();

              if (success) {
                btn.innerHTML = `${checkIcon} <span>Sesión guardada</span>`;
                btn.style.setProperty('background-color', '#10b981', 'important');
                btn.style.setProperty('opacity', '1', 'important');
              } else {
                btn.innerHTML = `<span>❌ Error al guardar</span>`;
                btn.style.setProperty('background-color', '#f97316', 'important');
                btn.style.setProperty('opacity', '1', 'important');
                btn.disabled = false;
              }
            };

            document.body.appendChild(btn);

            // Persistency: re-inject if the site removes it (common in SPAs)
            const observer = new MutationObserver(() => {
              if (!document.getElementById('my-lms-auth-btn') && document.body) {
                document.body.appendChild(btn);
              }
            });
            observer.observe(document.body, { childList: true });
          });
        } catch (e) {
          // Ignore evaluation errors
        }
      };

      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) injectUI();
      });
      page.on('load', () => injectUI());

      // Wait until browser closes (either by button or manual close)
      await new Promise<void>((resolve) => {
        page.on('close', async () => {
          await saveSession();
          resolve();
        });
      });
    }

    await this.browserProvider.close();
  }
}
