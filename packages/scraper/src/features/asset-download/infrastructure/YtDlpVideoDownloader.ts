import { spawn } from "child_process";

import { type ILogger } from '@core/logging';

import { type IVideoDownloader } from "@scraper/features/asset-download/domain/ports/IVideoDownloader";
import { type IAuthSessionStorage } from "@scraper/features/auth-session/domain/ports/IAuthSessionStorage";

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
      // Pipe subprocess output to main process to show progress
      const ytDlpProcess = spawn("yt-dlp", args);
      let stderr = "";

      ytDlpProcess.stdout.pipe(process.stdout);

      ytDlpProcess.stderr.on("data", (data: any) => {
        const msg = data.toString();
        stderr += msg;
        process.stderr.write(data);
      });

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
