import { describe, it, expect, vi } from "vitest";
import { FavoriteManager } from "@web/features/favorites/application/FavoriteManager";
import { type IFavoritesRepository } from "@web/features/favorites/domain/ports/IFavoritesRepository";

describe("FavoriteManager", () => {
  const mockRepo: IFavoritesRepository = {
    getAll: vi.fn(),
    getIsFavorite: vi.fn(),
    toggleFavorite: vi.fn(),
  };

  const manager = new FavoriteManager(mockRepo);

  it("should get all favorites from repository", () => {
    const favorites = [{ id: "1", type: "course" as const }];
    vi.mocked(mockRepo.getAll).mockReturnValue(favorites);

    const result = manager.getAll();
    expect(result).toEqual(favorites);
    expect(mockRepo.getAll).toHaveBeenCalled();
  });

  it("should check if an item is favorite", () => {
    vi.mocked(mockRepo.getIsFavorite).mockReturnValue(true);
    
    const isFav = manager.getIsFavorite({ id: "123", type: "course" });
    expect(isFav).toBe(true);
    expect(mockRepo.getIsFavorite).toHaveBeenCalledWith({ id: "123", type: "course" });
  });

  it("should toggle favorite status", () => {
    manager.toggleFavorite({ id: "abc", type: "learning-path" });
    expect(mockRepo.toggleFavorite).toHaveBeenCalledWith({ id: "abc", type: "learning-path" });
  });
});
