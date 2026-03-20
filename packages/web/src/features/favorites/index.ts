import { getDb } from "../../platform/db/database";
import { FavoriteManager } from "./application/FavoriteManager";
import { type GetIsFavoriteRequest } from "./application/use-cases/getIsFavorite";
import { type ToggleFavoriteRequest } from "./application/use-cases/toggleFavorite";
import { SQLiteFavoritesRepository } from "./infrastructure/SQLiteFavoritesRepository";

// 1. Types
export type { FavoriteType } from "./domain/ports/IFavoritesRepository";
export type { GetIsFavoriteRequest, ToggleFavoriteRequest };

// 2. Wiring
const repo = new SQLiteFavoritesRepository(getDb());
const manager = new FavoriteManager(repo);

// 3. Public API
export const getAllFavorites = () => manager.getAll();

export const getIsFavorite = ({ id, type }: GetIsFavoriteRequest) =>
  manager.getIsFavorite({ id, type });

export const toggleFavorite = ({ id, type }: ToggleFavoriteRequest) =>
  manager.toggleFavorite({ id, type });