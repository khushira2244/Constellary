import type { AIContributionKind } from "@/features/ai-contributions/types";

export const aiContextKinds = [
  "summary",
  "visual",
  "notes",
  "voice",
  "sources",
  "files",
  "links",
  "collaborators",
  "comments",
  "privacy",
  "ai",
  "status",
  "activity",
] as const;

export type AIContextKind = (typeof aiContextKinds)[number];

export type AIAssistantRequest = {
  branchId: string;
  prompt: string;
  context: AIContextKind[];
  contributionKind: AIContributionKind;
};

export type AIAssistantResponse = {
  contributionId: string;
  text: string;
  model: string;
  contextLabels: string[];
};
