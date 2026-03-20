import { type IFavoritesRepository } from "../domain/ports/IFavoritesRepository";
import { getAllFavorites } from "./use-cases/getAllFavorites";
import { getIsFavorite, type GetIsFavoriteRequest } from "./use-cases/getIsFavorite";
import { toggleFavorite, type ToggleFavoriteRequest } from "./use-cases/toggleFavorite";

export class FavoriteManager {
  constructor(private repo: IFavoritesRepository) {}

  getAll() {
    return getAllFavorites(this.repo);
  }

  getIsFavorite(request: GetIsFavoriteRequest) {
    return getIsFavorite(this.repo, request);
  }

  toggleFavorite(request: ToggleFavoriteRequest) {
    return toggleFavorite(this.repo, request);
  }
}
