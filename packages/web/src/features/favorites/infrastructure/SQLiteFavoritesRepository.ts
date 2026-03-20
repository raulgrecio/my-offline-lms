import { type IDatabase } from "@my-offline-lms/core";
import { type IFavoritesRepository, type FavoriteType } from "../domain/ports/IFavoritesRepository";

export class SQLiteFavoritesRepository implements IFavoritesRepository {
  constructor(private db: IDatabase) {}

  getAll(): { id: string; type: FavoriteType }[] {
    return this.db
      .prepare("SELECT id, type FROM UserFavorites")
      .all() as { id: string; type: FavoriteType }[];
  }

  getIsFavorite({ id, type }: { id: string; type: FavoriteType }): boolean {
    const row = this.db
      .prepare("SELECT 1 FROM UserFavorites WHERE id = ? AND type = ?")
      .get(id, type);
    return !!row;
  }

  toggleFavorite({ id, type }: { id: string; type: FavoriteType }): void {
    const exists = this.getIsFavorite({ id, type });
    if (exists) {
      this.db
        .prepare("DELETE FROM UserFavorites WHERE id = ? AND type = ?")
        .run(id, type);
    } else {
      this.db
        .prepare("INSERT INTO UserFavorites (id, type) VALUES (?, ?)")
        .run(id, type);
    }
  }
}
