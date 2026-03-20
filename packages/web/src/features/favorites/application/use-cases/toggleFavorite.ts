import { type IFavoritesRepository, type FavoriteType } from "../../domain/ports/IFavoritesRepository";

export interface ToggleFavoriteRequest {
  id: string;
  type: FavoriteType;
}

export const toggleFavorite = (
  favoritesRepo: IFavoritesRepository,
  request: ToggleFavoriteRequest
): void => {
  favoritesRepo.toggleFavorite(request);
};
