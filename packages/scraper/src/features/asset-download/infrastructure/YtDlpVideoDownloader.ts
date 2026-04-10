import { spawn } from "child_process";

import { type ILogger } from '@core/logging';

import { type IAuthSessionStorage } from "@scraper/features/auth-session";

import { type IVideoDownloader } from "../domain/ports/IVideoDownloader";

export class YtDlpVideoDownloader implements IVideoDownloader {
  private logger: ILogger;
  private authSessionStorage: IAuthSessionStorage;

  constructor(deps: {
    authSessionStorage: IAuthSessionStorage,
    logger: ILogger
  }) {
    this.authSessionStorage = deps.authSessionStorage;
    this.logger = deps.logger.withContext("YtDlpVideoDownloader");
  }

  async download(url: string, outputPath: string, referer?: string, retryCount = 0): Promise<void> {
    const cookiesFile = await this.authSessionStorage.getCookiesFile();
    const args: string[] = [
      "--cookies", cookiesFile,
      "-o", outputPath,
      "-f", "bestvideo+bestaudio/best",
      "--merge-output-format", "mp4",
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs", "es.*,en.*",
      "--embed-subs",
      "--color", "always"
    ];
    if (referer) args.push("--referer", referer);
    args.push(url);

    return new Promise((resolve, reject) => {
      // Listen to subprocess output to show progress in LogConsole
      const ytDlpProcess = spawn("yt-dlp", args);
      let stderr = "";

      const stripAnsi = (str: string) => str.replace(/\x1B\[[0-9;]*[mK]/g, "");

      const handleOutput = (data: any, isError = false) => {
        const msg = data.toString();
        if (isError) stderr += msg;

        // Limpiamos la salida (yt-dlp usa retornos de carro \r para el progreso)
        // y enviamos cada línea significativa al logger
        const lines = msg.split(/[\r\n]+/).filter((line: string) => line.trim().length > 0);
        for (const line of lines) {
          const cleanLine = stripAnsi(line);
          if (isError) {
            this.logger.warn(cleanLine);
          } else {
            // Solo logueamos líneas de descarga o información útil para no saturar
            if (cleanLine.includes('[download]') || cleanLine.includes('[ffmpeg]') || cleanLine.includes('[info]')) {
              this.logger.info(cleanLine);
            }
          }
        }

        // Seguimos enviando a la terminal para el usuario del CLI
        if (isError) {
          process.stderr.write(data);
        } else {
          process.stdout.write(data);
        }
      };

      ytDlpProcess.stdout.on("data", (data) => handleOutput(data, false));
      ytDlpProcess.stderr.on("data", (data) => handleOutput(data, true));

      ytDlpProcess.on("close", (code: number | null) => {
        if (code === 0) {
          resolve();
          return;
        }
        // Detección de errores conocidos de sesión
        const isAuthError = stderr.includes("403") ||
          stderr.includes("Forbidden") ||
          stderr.includes("Sign in") ||
          stderr.includes("login") ||
          stderr.includes("Unauthorized");

        if (isAuthError) {
          reject(new Error(`yt-dlp error 403 / Login requerido. Tu sesión ha expirado o no es válida. Por favor, ejecuta 'pnpm cli login'.`));
          return;
        }

        if (retryCount >= 3) {
          this.logger.error(`yt-dlp falló tras 3 intentos (code ${code}). Error original:\n${stderr}`);
          reject(new Error(`yt-dlp error ${code} después de 3 reintentos`));
          return;
        }

        const delay = 5000 * (retryCount + 1);
        this.logger.warn(`yt-dlp falló (code ${code}). Reintentando en ${delay / 1000}s... (${retryCount + 1}/3)`);
        setTimeout(() => {
          this.download(url, outputPath, referer, retryCount + 1).then(resolve).catch(reject);
        }, delay);
      });
      ytDlpProcess.on("error", (err: Error) => reject(err));
    });
  }
}
