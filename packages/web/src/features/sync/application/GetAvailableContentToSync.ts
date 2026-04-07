import type { ICourseRepository } from "@web/features/courses/domain/ports/ICourseRepository";
import type { ILearningPathRepository } from "@web/features/learning-paths/domain/ports/ILearningPathRepository";
import { NodeFileSystem, NodePath } from "@core/filesystem";
import { getInterceptedDir } from "@scraper/config";
import type { IPlatformUrlProvider } from "@scraper/features/platform-sync";
import { logger } from "@web/platform/logging";

export class GetAvailableContentToSync {
  constructor(
    private courseRepo: ICourseRepository,
    private pathRepo: ILearningPathRepository,
    private urlProvider: IPlatformUrlProvider
  ) { }

  async execute() {
    const dbCourses = this.courseRepo.getCoursesWithSyncStatus();
    const dbPaths = this.pathRepo.getAllLearningPaths();

    // 1. Get courses from DB
    const coursesMap = new Map<string, any>();
    dbCourses.forEach(c => {
      coursesMap.set(c.id, {
        ...c,
        type: 'course',
        url: (c as any).url || this.urlProvider.getCourseUrl({ slug: c.slug, id: c.id }),
        localUrl: `/viewer/course/${c.id}`,
        isComplete: c.totalAssets > 0 && c.totalAssets === c.downloadedAssets,
        source: 'database'
      });
    });

    // 2. Discover intercepted courses in filesystem
    try {
      const fs = new NodeFileSystem();
      const path = new NodePath();
      const interceptedDir = await getInterceptedDir();

      if (await fs.exists(interceptedDir)) {
        const folders = await fs.readdir(interceptedDir);
        for (const folder of folders) {
          const folderPath = path.join(interceptedDir, folder);
          if (!(await fs.stat(folderPath)).isDirectory()) continue;

          const files = await fs.readdir(folderPath);
          // Look for metadata files (even processed ones)
          const metadataFile = files.find(f => f.includes('_metadata.json'));
          if (metadataFile) {
            try {
              const content = await fs.readFile(path.join(folderPath, metadataFile), 'utf-8');
              const json = JSON.parse(content);
              const courseData = json.data || json; // Handle wrapped or unwrapped payloads

              if (courseData && courseData.id && !coursesMap.has(courseData.id)) {
                // Count videos/guides in the JSON
                let totalVideos = 0;
                let totalGuides = 0;

                (courseData.modules || []).forEach((m: any) => {
                  (m.components || []).forEach((c: any) => {
                    if (c.typeId === '1') totalVideos++;
                    if (c.typeId === '2') totalGuides++;
                  });
                });

                coursesMap.set(courseData.id, {
                  id: courseData.id,
                  title: courseData.name || courseData.title || folder,
                  slug: courseData.slug || '',
                  url: this.urlProvider.getCourseUrl({ slug: courseData.slug || 'path', id: courseData.id }),
                  localUrl: '',
                  totalAssets: totalVideos + totalGuides,
                  downloadedAssets: 0,
                  totalVideos,
                  downloadedVideos: 0,
                  totalGuides,
                  downloadedGuides: 0,
                  isComplete: false,
                  type: 'course',
                  source: 'intercepted'
                });
              }
            } catch (e) {
              // Ignore corrupt JSON
            }
          }
        }
      }
    } catch (err) {
      logger.error('[Discovery Error]:', err);
    }

    return {
      courses: Array.from(coursesMap.values()),
      paths: dbPaths.map(p => ({
        ...p,
        type: 'path',
        url: (p as any).url || this.urlProvider.getLearningPathUrl({ slug: p.slug || 'path', id: p.id }),
        localUrl: `/learning-path/${p.id}`
      }))
    };
  }
}
