export interface IVideoDownloader {
  download(url: string, outputPath: string, referer?: string): Promise<void>;
}
