import type { APIRoute } from 'astro';

import { getDb } from '@scraper/platform/database/database';

import { GetAvailableContentToSync } from '@web/features/sync/application/GetAvailableContentToSync';
import { SQLiteCourseRepository } from '@web/features/courses/infrastructure/SQLiteCourseRepository';
import { SQLiteLearningPathRepository } from '@web/features/learning-paths/infrastructure/SQLiteLearningPathRepository';

export const GET: APIRoute = async () => {
  try {
    const db = await getDb();

    // DDD: Instantiate repositories and Use Case
    const courseRepo = new SQLiteCourseRepository(db);
    const pathRepo = new SQLiteLearningPathRepository(db);

    const useCase = new GetAvailableContentToSync(courseRepo, pathRepo);
    const data = await useCase.execute();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[API Available Error]:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch available content' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
