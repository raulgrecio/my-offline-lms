import { test, expect } from "@playwright/test";

test.describe("E2E Favorites Interaction", () => {
  test("should allow a user to toggle favorite status on a course", async ({ page }) => {
    // Navigate to homepage or courses page
    await page.goto("/");

    // Assuming we have at least one favorite button on the page
    const favoriteButton = page.getByRole("button", { name: /añadir a favoritos/i }).first();
    
    // Check initial state (should be present if not favorited)
    await expect(favoriteButton).toBeVisible();

    // Click to add to favorite
    await favoriteButton.click();

    // Check if the label changed (indicating state change)
    const unfavoriteButton = page.getByRole("button", { name: /quitar de favoritos/i }).first();
    await expect(unfavoriteButton).toBeVisible();

    // Click again to remove from favorite
    await unfavoriteButton.click();

    // Should return to initial state
    await expect(page.getByRole("button", { name: /añadir a favoritos/i }).first()).toBeVisible();
  });
});
