import { type IFavoritesRepository, type FavoriteType } from "../../domain/ports/IFavoritesRepository";

export const getAllFavorites = (favoritesRepo: IFavoritesRepository): { id: string; type: FavoriteType }[] => {
  return favoritesRepo.getAll();
};
