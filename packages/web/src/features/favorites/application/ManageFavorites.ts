import { type IFavoritesRepository, type FavoriteType } from "../domain/ports/IFavoritesRepository";

export class ManageFavorites {
  constructor(private favoritesRepo: IFavoritesRepository) { }

  getAll() {
    return this.favoritesRepo.getAll();
  }

  getIsFavorite(id: string, type: FavoriteType): boolean {
    return this.favoritesRepo.getIsFavorite(id, type);
  }

  toggleFavorite(id: string, type: FavoriteType): void {
    this.favoritesRepo.toggleFavorite(id, type);
  }
}
