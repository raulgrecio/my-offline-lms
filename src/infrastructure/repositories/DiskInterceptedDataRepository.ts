import fs from "fs";
import path from "path";
import { IInterceptedDataRepository, InterceptedPayload } from "@domain/repositories/IInterceptedDataRepository";

export class DiskInterceptedDataRepository implements IInterceptedDataRepository {
  private debugDir: string;

  constructor(baseDir?: string) {
    this.debugDir = baseDir || path.resolve(__dirname, "../../../data/debug");
  }

  private initDir(): void {
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }

  getPendingLearningPaths(): InterceptedPayload[] {
    return this.getPayloads("content_learning_path_", "_pagedata.json");
  }

  getPendingCourses(): InterceptedPayload[] {
    return this.getPayloads("content_courses_", "metadata.json");
  }

  private getPayloads(prefix: string, suffix: string): InterceptedPayload[] {
    this.initDir();
    const files = fs.readdirSync(this.debugDir)
      .filter(f => f.includes(prefix) && f.endsWith(suffix));

    return files.map(file => {
      const filePath = path.join(this.debugDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      return { filePath, content };
    });
  }

  deletePayload(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn(`[DiskInterceptedDataRepository] Could not delete ${filePath}`);
    }
  }
}
