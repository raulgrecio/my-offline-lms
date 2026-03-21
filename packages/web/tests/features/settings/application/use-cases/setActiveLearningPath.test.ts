import { describe, it, expect, vi } from "vitest";

import { setActiveLearningPath } from "@features/settings/application/use-cases/setActiveLearningPath";
import type { ISettingsRepository } from "@features/settings/domain/ports/ISettingsRepository";

describe("setActiveLearningPath use case", () => {
  it("should update the repository with the provided id", () => {
    const mockRepo: ISettingsRepository = {
      getActiveLearningPath: vi.fn(),
      setActiveLearningPath: vi.fn(),
    };
    setActiveLearningPath(mockRepo, { id: "new-path" });
    expect(mockRepo.setActiveLearningPath).toHaveBeenCalledWith("new-path");
  });
});
