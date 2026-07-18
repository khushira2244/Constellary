import { describe, expect, test } from "vitest";

import {
  MAX_AI_CONTEXT_ITEMS,
  MAX_AI_PROMPT_LENGTH,
  parseAIAllowlist,
  validateAIAssistantInput,
} from "@/features/ai-assistant/validation";

describe("AI Assistant server validation", () => {
  test("normalizes the server-side email allowlist", () => {
    expect([...parseAIAllowlist(" Judge@Example.com, owner@example.com , ")])
      .toEqual(["judge@example.com", "owner@example.com"]);
    expect(parseAIAllowlist(undefined).size).toBe(0);
  });

  test("rejects empty and oversized prompts", () => {
    expect(validateAIAssistantInput({
      prompt: " ",
      context: [],
      contributionKind: "rough_note_clarification",
    }).ok).toBe(false);
    expect(validateAIAssistantInput({
      prompt: "x".repeat(MAX_AI_PROMPT_LENGTH + 1),
      context: [],
      contributionKind: "rough_note_clarification",
    }).ok).toBe(false);
  });

  test("rejects forged context and unsupported contribution types", () => {
    expect(validateAIAssistantInput({
      prompt: "Help",
      context: ["another_user_private_file"],
      contributionKind: "rough_note_clarification",
    }).ok).toBe(false);
    expect(validateAIAssistantInput({
      prompt: "Help",
      context: [],
      contributionKind: "arbitrary_system_prompt",
    }).ok).toBe(false);
  });

  test("deduplicates valid explicit context and caps selection count", () => {
    const valid = validateAIAssistantInput({
      prompt: "  Identify open questions. ",
      context: ["summary", "notes", "summary"],
      contributionKind: "next_direction_suggestion",
    });
    expect(valid).toEqual({
      ok: true,
      data: {
        prompt: "Identify open questions.",
        context: ["summary", "notes"],
        contributionKind: "next_direction_suggestion",
      },
    });
    expect(validateAIAssistantInput({
      prompt: "Help",
      context: Array.from({ length: MAX_AI_CONTEXT_ITEMS + 1 }, (_, index) =>
        index % 2 ? "summary" : `invalid-${index}`),
      contributionKind: "full_summary_draft",
    }).ok).toBe(false);
  });
});
