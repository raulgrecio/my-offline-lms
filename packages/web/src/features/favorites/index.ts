import { getDb } from "@platform/db/database";
import { createLazyService } from "@platform/utils/lazy";
import { FavoriteManager } from "./application/FavoriteManager";
import { type GetIsFavoriteRequest } from "./application/use-cases/getIsFavorite";
import { type ToggleFavoriteRequest } from "./application/use-cases/toggleFavorite";
import { SQLiteFavoritesRepository } from "./infrastructure/SQLiteFavoritesRepository";

// 1. Types
export type { FavoriteType } from "./domain/ports/IFavoritesRepository";
export type { GetIsFavoriteRequest, ToggleFavoriteRequest };

// 2. Wiring (Lazy)
const getManager = createLazyService(async () => {
  const db = await getDb();
  const repo = new SQLiteFavoritesRepository(db);
  return new FavoriteManager(repo);
});

// 3. Public API
export const getAllFavorites = async () => (await getManager()).getAll();

export const getIsFavorite = async ({ id, type }: GetIsFavoriteRequest) =>
  (await getManager()).getIsFavorite({ id, type });

export const toggleFavorite = async ({ id, type }: ToggleFavoriteRequest) =>
  (await getManager()).toggleFavorite({ id, type });