export type FavoriteType = 'course' | 'learning-path';

export interface IFavoritesRepository {
  getAll(): { id: string, type: FavoriteType }[];
  getIsFavorite(id: string, type: FavoriteType): boolean;
  toggleFavorite(id: string, type: FavoriteType): void;
}
