export type FavoriteType = 'course' | 'learning-path';

export interface IFavoritesRepository {
  getAll(): { id: string; type: FavoriteType }[];
  getIsFavorite(params: { id: string; type: FavoriteType }): boolean;
  toggleFavorite(params: { id: string; type: FavoriteType }): void;
}
