import { getDb } from "../../platform/db/database";
import { ManageFavorites } from "./application/ManageFavorites";
import type { FavoriteType } from "./domain/ports/IFavoritesRepository";
import { SQLiteFavoritesRepository } from "./infrastructure/SQLiteFavoritesRepository";

const favoritesRepository = new SQLiteFavoritesRepository(getDb());
const manageFavorites = new ManageFavorites(favoritesRepository);

export const toggleFavorite = (id: string, type: FavoriteType) => manageFavorites.toggleFavorite(id, type);
export const getIsFavorite = (id: string, type: FavoriteType) => manageFavorites.getIsFavorite(id, type);
export const getAllFavorites = () => manageFavorites.getAll();
