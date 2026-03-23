import fs from "fs";
import path from "path";

import { ILogger } from '@my-offline-lms/core/logging';

import { getInterceptedDir } from "@config/paths";
import { PLATFORM } from "@config/platform";

import { IInterceptedDataRepository, InterceptedPayload } from "@features/platform-sync/domain/ports/IInterceptedDataRepository";

export class DiskInterceptedDataRepository implements IInterceptedDataRepository {
  private interceptedDir: string | undefined;
  private logger: ILogger;
  private baseDirArg?: string;

  constructor(deps: {
    baseDir?: string,
    logger: ILogger
  }) {
    this.baseDirArg = deps.baseDir;
    this.logger = deps.logger.withContext("DiskInterceptedDataRepository");
  }

  private async ensureInitialized(): Promise<void> {
    if (this.interceptedDir) return;
    this.interceptedDir = this.baseDirArg || (await getInterceptedDir());
  }

  private async initDir(): Promise<void> {
    await this.ensureInitialized();
    await fs.promises.mkdir(this.interceptedDir!, { recursive: true });
  }

  async getPendingLearningPaths(): Promise<InterceptedPayload[]> {
    return this.getPayloads(PLATFORM.INTERCEPTOR.FILES.LEARNING_PATH);
  }

  async getPendingForLearningPath(pathId: string): Promise<InterceptedPayload[]> {
    return this.getPayloads(PLATFORM.INTERCEPTOR.FILES.LEARNING_PATH, pathId);
  }

  async getPendingCourses(): Promise<InterceptedPayload[]> {
    return this.getPayloads(PLATFORM.INTERCEPTOR.FILES.COURSE);
  }

  private async getPayloads(pattern: RegExp, id?: string): Promise<InterceptedPayload[]> {
    await this.initDir();
    const allFiles = await fs.promises.readdir(this.interceptedDir!);
    const files = allFiles.filter(
        file => pattern.test(file) && (!id || file.includes(id))
      );

    return Promise.all(files.map(async file => {
      const filePath = path.join(this.interceptedDir!, file);
      const content = await fs.promises.readFile(filePath, "utf-8");
      return { filePath, content };
    }));
  }

  async getPendingForCourse(courseId: string): Promise<InterceptedPayload[]> {
    return this.getPayloads(PLATFORM.INTERCEPTOR.FILES.COURSE, courseId);
  }

  async deletePayload(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (e) {
      // Ignored if file doesn't exist
    }
  }

  async markAsProcessed(filePath: string): Promise<void> {
    try {
      const newPath = `${filePath}.processed`;
      await fs.promises.rename(filePath, newPath);
    } catch (e) {
      this.logger.warn(`Could not mark as processed ${filePath}`);
    }
  }

  async deleteWorkspace(): Promise<void> {
    await this.ensureInitialized();
    try {
      await fs.promises.rm(this.interceptedDir!, { recursive: true, force: true });
    } catch (e) {
      this.logger.error(`Failed to delete workspace directory ${this.interceptedDir}:`, e);
    }
  }
}
