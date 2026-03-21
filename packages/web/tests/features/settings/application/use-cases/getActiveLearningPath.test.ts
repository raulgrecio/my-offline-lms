import { describe, it, expect, vi } from "vitest";

import { getActiveLearningPath } from "@features/settings/application/use-cases/getActiveLearningPath";
import type { ISettingsRepository } from "@features/settings/domain/ports/ISettingsRepository";

describe("getActiveLearningPath use case", () => {
  it("should return the result from the repository", () => {
    const mockRepo: ISettingsRepository = {
      getActiveLearningPath: vi.fn().mockReturnValue("path-123"),
      setActiveLearningPath: vi.fn(),
    };
    const result = getActiveLearningPath(mockRepo);
    expect(result).toBe("path-123");
    expect(mockRepo.getActiveLearningPath).toHaveBeenCalled();
  });
});
