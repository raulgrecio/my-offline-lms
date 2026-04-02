import { describe, it, expect, beforeEach, vi } from "vitest";

import type { ISettingsRepository } from "@web/features/settings/domain/ports/ISettingsRepository";
import { SettingManager } from "@web/features/settings/application/SettingManager";

describe("SettingManager", () => {
  let mockRepo: ISettingsRepository;
  let manager: SettingManager;

  beforeEach(() => {
    mockRepo = {
      getActiveLearningPath: vi.fn(),
      setActiveLearningPath: vi.fn(),
    };
    manager = new SettingManager(mockRepo);
  });

  describe("getActiveLearningPath", () => {
    it("should delegate to the use case", () => {
      vi.mocked(mockRepo.getActiveLearningPath).mockReturnValue("path-123");
      const result = manager.getActiveLearningPath();
      expect(result).toBe("path-123");
      expect(mockRepo.getActiveLearningPath).toHaveBeenCalled();
    });
  });

  describe("setActiveLearningPath", () => {
    it("should delegate to the use case", () => {
      manager.setActiveLearningPath({ id: "new-path" });
      expect(mockRepo.setActiveLearningPath).toHaveBeenCalledWith("new-path");
    });
  });
});
