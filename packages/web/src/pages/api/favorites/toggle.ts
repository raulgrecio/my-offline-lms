export const prerender = false;

import type { APIContext, APIRoute } from 'astro';
import { toggleFavorite } from '@web/features/favorites';
import type { FavoriteType } from '@web/features/favorites/domain/ports/IFavoritesRepository';
import { logger } from '@web/platform/logging';

export const POST: APIRoute = async ({ request }: APIContext): Promise<Response> => {
  try {
    const body = await request.json() as { id: string; type: FavoriteType };
    const { id, type } = body;

    const types: FavoriteType[] = ['course', 'learning-path'];
    if (!id || !types.includes(type)) {
      return new Response(JSON.stringify({ error: 'invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    toggleFavorite({ id: String(id), type });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logger.error('API Favorites Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
