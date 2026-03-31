/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestContainer } from "../utils/test-render";

// Mocking core filesystem
vi.mock("@core/filesystem", () => {
  return {
    AssetPathResolver: vi.fn().mockImplementation(function() {
      return {
        getAvailablePaths: vi.fn().mockResolvedValue([
          { label: 'Test Drive', path: '/mnt/test', available: true }
        ]),
      };
    }),
    NodeFileSystem: vi.fn(),
    NodePath: vi.fn(),
  };
});

// Mocking config paths
vi.mock("@web/config/paths", () => ({
  getAssetConfigPath: vi.fn().mockResolvedValue('/tmp/assets.json'),
  getMonorepoRoot: vi.fn().mockResolvedValue('/home/rgr/source/my-offline-lms'),
}));

// Mocking logger
vi.mock("@web/platform/logging", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// @ts-ignore
import SettingsPage from "../../src/pages/settings.astro";

describe("settings.astro", () => {
  it("should render current asset locations", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(SettingsPage);

    expect(html).toContain('Test Drive');
    expect(html).toContain('/mnt/test');
    expect(html).toContain('Conectado');
    expect(html).toContain('Ubicaciones actuales');
  });

  it("should render error message when loading fails", async () => {
    // Re-mock AssetPathResolver for this test
    const { AssetPathResolver } = await import("@core/filesystem");
    (AssetPathResolver as any).mockImplementationOnce(() => ({
      getAvailablePaths: vi.fn().mockRejectedValue(new Error('Failed to load')),
    }));

    const container = await createTestContainer();
    const html = await container.renderToString(SettingsPage);

    expect(html).toContain('No se pudieron cargar las ubicaciones actuales.');
  });
});
