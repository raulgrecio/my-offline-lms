import { type IFavoritesRepository, type FavoriteType } from "../../domain/ports/IFavoritesRepository";

export interface GetIsFavoriteRequest {
  id: string;
  type: FavoriteType;
}

export const getIsFavorite = (
  favoritesRepo: IFavoritesRepository,
  request: GetIsFavoriteRequest
): boolean => {
  return favoritesRepo.getIsFavorite(request);
};
