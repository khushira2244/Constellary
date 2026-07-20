import type { AIContributionKind } from "@/features/ai-contributions/types";
import { aiContextKinds, type AIContextKind } from "./types";

export const MAX_AI_PROMPT_LENGTH = 2_000;
export const MAX_AI_CONTEXT_CHARACTERS = 12_000;
export const MAX_AI_CONTEXT_ITEMS = 8;

const contributionKinds = new Set<AIContributionKind>([
  "full_summary_draft",
  "linked_branch_context_summary",
  "next_direction_suggestion",
  "reference_suggestion",
  "visual_summary_structure",
  "rough_note_clarification",
]);
const contextKinds = new Set<string>(aiContextKinds);

export function parseAIAllowlist(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function validateAIAssistantInput(input: {
  prompt: string;
  context: string[];
  contributionKind: string;
}) {
  const prompt = input.prompt.trim();
  if (!prompt) return { ok: false as const, message: "Enter a prompt." };
  if (prompt.length > MAX_AI_PROMPT_LENGTH) {
    return { ok: false as const, message: `Prompt must be ${MAX_AI_PROMPT_LENGTH} characters or fewer.` };
  }
  const context = [...new Set(input.context)];
  if (context.length === 0) {
    return {
      ok: false as const,
      message: "Add a Workspace item to AI context before asking GPT-5.6.",
    };
  }
  if (context.length > MAX_AI_CONTEXT_ITEMS || context.some((kind) => !contextKinds.has(kind))) {
    return { ok: false as const, message: "Selected AI context is invalid or too large." };
  }
  if (!contributionKinds.has(input.contributionKind as AIContributionKind)) {
    return { ok: false as const, message: "Unsupported AI request type." };
  }
  return {
    ok: true as const,
    data: {
      prompt,
      context: context as AIContextKind[],
      contributionKind: input.contributionKind as AIContributionKind,
    },
  };
}
