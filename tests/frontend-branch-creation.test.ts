import { describe, expect, test } from "vitest";

import {
  AI_ROLE_IDS,
  progressWithAIRole,
  type DraftSnapshot,
} from "@/features/branch-creation/model";

const snapshot: DraftSnapshot = {
  title: "  Memory as a control signal  ",
  originalIdea: "Explore whether memory can adapt control behavior.",
  shortSummary: "A compact description.",
  privacy: "private",
  aiRole: "directions",
  progress: {},
};

describe("fresh main-branch creation model", () => {
  test("marks required and intentionally deferred steps complete", () => {
    expect(progressWithAIRole(snapshot)).toMatchObject({
      origin: true,
      originalIdea: true,
      title: true,
      shortSummary: true,
      previousWork: true,
      people: true,
      privacyAndAI: true,
    });
  });

  test("persists exactly one intended AI role without creating AI attribution data", () => {
    const progress = progressWithAIRole(snapshot);
    expect(AI_ROLE_IDS.filter((role) => progress[`aiRole_${role}`])).toEqual(["directions"]);
  });

  test("does not mark missing required writing as complete", () => {
    const progress = progressWithAIRole({
      ...snapshot,
      title: " ",
      originalIdea: "",
      shortSummary: "\n",
    });
    expect(progress.title).toBe(false);
    expect(progress.originalIdea).toBe(false);
    expect(progress.shortSummary).toBe(false);
  });
});
