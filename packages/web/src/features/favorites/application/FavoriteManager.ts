import { type IFavoritesRepository, type FavoriteType } from "../domain/ports/IFavoritesRepository";
import { getAllFavorites } from "./use-cases/getAllFavorites";
import { getIsFavorite, type GetIsFavoriteRequest } from "./use-cases/getIsFavorite";
import { toggleFavorite, type ToggleFavoriteRequest } from "./use-cases/toggleFavorite";

export class FavoriteManager {
  constructor(private repo: IFavoritesRepository) {}

  getAll(): { id: string; type: FavoriteType }[] {
    return getAllFavorites(this.repo);
  }

  getIsFavorite(request: GetIsFavoriteRequest): boolean {
    return getIsFavorite(this.repo, request);
  }

  toggleFavorite(request: ToggleFavoriteRequest): void {
    return toggleFavorite(this.repo, request);
  }
}
