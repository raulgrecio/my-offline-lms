import { type IFileSystem, type IPath } from "@my-offline-lms/core/filesystem";
import { type ILogger } from '@my-offline-lms/core/logging';

import { PLATFORM } from "@config/platform";

import { IInterceptedDataRepository, InterceptedPayload } from "@features/platform-sync/domain/ports/IInterceptedDataRepository";

export class DiskInterceptedDataRepository implements IInterceptedDataRepository {
  private interceptedDir: string | undefined;
  private logger: ILogger;
  private baseDirArg?: string;
  private fs: IFileSystem;
  private path: IPath;
  private getInterceptedDirFn: () => Promise<string>;

  constructor(deps: {
    fs: IFileSystem,
    path: IPath,
    getInterceptedDir: () => Promise<string>,
    baseDir?: string,
    logger: ILogger
  }) {
    this.fs = deps.fs;
    this.path = deps.path;
    this.getInterceptedDirFn = deps.getInterceptedDir;
    this.baseDirArg = deps.baseDir;
    this.logger = deps.logger.withContext("DiskInterceptedDataRepository");
  }

  private async ensureInitialized(): Promise<void> {
    if (this.interceptedDir) return;
    this.interceptedDir = this.baseDirArg || (await this.getInterceptedDirFn());
  }

  private async initDir(): Promise<void> {
    await this.ensureInitialized();
    if (!(await this.fs.exists(this.interceptedDir!))) {
      await this.fs.mkdir(this.interceptedDir!, { recursive: true });
    }
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
    const allFiles = await this.fs.readdir(this.interceptedDir!);
    const files = allFiles.filter(
        file => pattern.test(file) && (!id || file.includes(id))
      );

    return Promise.all(files.map(async file => {
      const filePath = this.path.join(this.interceptedDir!, file);
      const content = await this.fs.readFile(filePath, "utf-8");
      return { filePath, content };
    }));
  }

  async getPendingForCourse(courseId: string): Promise<InterceptedPayload[]> {
    return this.getPayloads(PLATFORM.INTERCEPTOR.FILES.COURSE, courseId);
  }

  async deletePayload(filePath: string): Promise<void> {
    try {
      if (await this.fs.exists(filePath)) {
        await this.fs.unlink(filePath);
      }
    } catch (e) {
      // Ignored if file doesn't exist
    }
  }

  async markAsProcessed(filePath: string): Promise<void> {
    try {
      const newPath = `${filePath}.processed`;
      await this.fs.rename(filePath, newPath);
    } catch (e) {
      this.logger.warn(`Could not mark as processed ${filePath}`);
    }
  }

  async deleteWorkspace(): Promise<void> {
    await this.ensureInitialized();
    try {
      if (this.fs.rm) {
        await this.fs.rm(this.interceptedDir!, { recursive: true, force: true });
      } else {
        this.logger.warn(`FileSystem does not support 'rm' operation. Cannot delete workspace: ${this.interceptedDir}`);
      }
    } catch (e) {
      this.logger.error(`Failed to delete workspace directory ${this.interceptedDir}:`, e);
    }
  }
}
