import fs from "fs";
import path from "path";

import { IInterceptedDataRepository, InterceptedPayload } from "@domain/repositories/IInterceptedDataRepository";
import { DEBUG_DIR } from "@config/paths";
import { PLATFORM } from "@config/platform";

export class DiskInterceptedDataRepository implements IInterceptedDataRepository {
  private debugDir: string;

  constructor(baseDir?: string) {
    this.debugDir = baseDir || DEBUG_DIR;
  }
  
  private initDir(): void {
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }
 
  getPendingLearningPaths(): InterceptedPayload[] {
    return this.getPayloads(PLATFORM.INTERCEPTOR.FILES.LEARNING_PATH);
  }

  getPendingCourses(): InterceptedPayload[] {
    return this.getPayloads(PLATFORM.INTERCEPTOR.FILES.COURSE);
  }

  private getPayloads(pattern: RegExp, id?: string): InterceptedPayload[] {
    this.initDir();
    let files = fs.readdirSync(this.debugDir)
      .filter(
        file => pattern.test(file) && (!id || file.includes(id))
      );

    return files.map(file => {
      const filePath = path.join(this.debugDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      return { filePath, content };
    });
  }

  getPendingForCourse(courseId: string): InterceptedPayload[] {
    return this.getPayloads(PLATFORM.INTERCEPTOR.FILES.COURSE, courseId);
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
  
  markAsProcessed(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        const newPath = `${filePath}.processed`;
        fs.renameSync(filePath, newPath);
      }
    } catch (e) {
      console.warn(`[DiskInterceptedDataRepository] Could not mark as processed ${filePath}`);
    }
  }
}
