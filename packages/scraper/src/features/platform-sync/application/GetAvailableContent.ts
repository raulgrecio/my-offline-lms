import { type ICourseRepository } from '../domain/ports/ICourseRepository';
import { type ILearningPathRepository } from '../domain/ports/ILearningPathRepository';
import { type IPlatformUrlProvider } from '../domain/ports/IPlatformUrlProvider';
import { type IFileSystem, type IPath } from '@core/filesystem';
import { getInterceptedDir } from '@scraper/config';

export interface AvailableContent {
  courses: any[];
  paths: any[];
}

export class GetAvailableContent {
  constructor(
    private readonly courseRepo: ICourseRepository,
    private readonly pathRepo: ILearningPathRepository,
    private readonly urlProvider: IPlatformUrlProvider,
    private readonly fs: IFileSystem,
    private readonly path: IPath
  ) { }

  async execute(): Promise<AvailableContent> {
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
      const interceptedDir = await getInterceptedDir();
      
      if (await this.fs.exists(interceptedDir)) {
        const folders = await this.fs.readdir(interceptedDir);
        for (const folder of folders) {
          const folderPath = this.path.join(interceptedDir, folder);
          const stat = await this.fs.stat(folderPath);
          if (!stat.isDirectory()) continue;

          const files = await this.fs.readdir(folderPath);
          // Look for metadata files (even processed ones)
          const metadataFile = files.find(f => f.includes('_metadata.json'));
          if (metadataFile) {
            try {
              const content = await this.fs.readFile(this.path.join(folderPath, metadataFile), 'utf-8');
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
      console.error('[Discovery Error]:', err);
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
