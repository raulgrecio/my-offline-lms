import fs from "fs";
import path from "path";

import { ILogger } from "@my-offline-lms/core";

import { INTERCEPTED_DIR } from "@config/paths";
import { PLATFORM } from "@config/platform";

import { IInterceptedDataRepository, InterceptedPayload } from "@features/platform-sync/domain/ports/IInterceptedDataRepository";

export class DiskInterceptedDataRepository implements IInterceptedDataRepository {
  private interceptedDir: string;
  private logger: ILogger;

  constructor(deps: {
    baseDir?: string,
    logger: ILogger
  }) {
    this.interceptedDir = deps.baseDir || INTERCEPTED_DIR;
    this.logger = deps.logger.withContext("DiskInterceptedDataRepository");
  }

  private initDir(): void {
    if (!fs.existsSync(this.interceptedDir)) {
      fs.mkdirSync(this.interceptedDir, { recursive: true });
    }
  }

  getPendingLearningPaths(): InterceptedPayload[] {
    return this.getPayloads(PLATFORM.INTERCEPTOR.FILES.LEARNING_PATH);
  }

  getPendingForLearningPath(pathId: string): InterceptedPayload[] {
    return this.getPayloads(PLATFORM.INTERCEPTOR.FILES.LEARNING_PATH, pathId);
  }

  getPendingCourses(): InterceptedPayload[] {
    return this.getPayloads(PLATFORM.INTERCEPTOR.FILES.COURSE);
  }

  private getPayloads(pattern: RegExp, id?: string): InterceptedPayload[] {
    this.initDir();
    let files = fs.readdirSync(this.interceptedDir)
      .filter(
        file => pattern.test(file) && (!id || file.includes(id))
      );

    return files.map(file => {
      const filePath = path.join(this.interceptedDir, file);
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
      this.logger.warn(`Could not delete ${filePath}`);
    }
  }

  markAsProcessed(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        const newPath = `${filePath}.processed`;
        fs.renameSync(filePath, newPath);
      }
    } catch (e) {
      this.logger.warn(`Could not mark as processed ${filePath}`);
    }
  }

  deleteWorkspace(): void {
    try {
      if (fs.existsSync(this.interceptedDir)) {
        fs.rmSync(this.interceptedDir, { recursive: true, force: true });
      }
    } catch (e) {
      this.logger.error(`Failed to delete workspace directory ${this.interceptedDir}:`, e);
    }
  }
}
