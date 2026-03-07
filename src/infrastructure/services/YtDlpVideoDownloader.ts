import { spawn } from "child_process";
import { IVideoDownloader } from "@domain/services/IVideoDownloader";
import { IAuthSessionStorage } from "@domain/repositories/IAuthSessionStorage";

export class YtDlpVideoDownloader implements IVideoDownloader {
  constructor(private authSessionStorage: IAuthSessionStorage) {}

  download(url: string, outputPath: string, referer?: string, retryCount = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      const cookiesFile = this.authSessionStorage.getCookiesFile();
      const args = [
        "--cookies", cookiesFile,
        "-o", outputPath,
        "-f", "bestvideo+bestaudio/best",
        "--merge-output-format", "mp4",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs", "es.*,en.*",
        "--embed-subs"
      ];
      if (referer) args.push("--referer", referer);
      args.push(url);

      const ytDlpProcess = spawn("yt-dlp", args, { stdio: "inherit" });
      
      ytDlpProcess.on("close", (code) => {
        if (code === 0) {
            resolve();
        } else {
            if (retryCount < 3) {
                const delay = 5000 * (retryCount + 1);
                console.log(`[YtDlpVideoDownloader] ⚠️ yt-dlp devolvió error ${code}. Reintentando en ${delay/1000} segundos... (Intento ${retryCount + 1}/3)`);
                setTimeout(() => {
                    this.download(url, outputPath, referer, retryCount + 1).then(resolve).catch(reject);
                }, delay);
            } else {
                reject(new Error(`yt-dlp error ${code} después de 3 reintentos`));
            }
        }
      });
      ytDlpProcess.on("error", (err) => reject(err));
    });
  }
}
