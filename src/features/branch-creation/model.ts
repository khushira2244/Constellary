import type { DraftProgress } from "@/features/branch-drafts/types";
import type { ServiceErrorCode } from "@/lib/services/result";
import type { Enums } from "@/types/database";

export const AI_ROLE_IDS = [
  "none",
  "organize",
  "summary",
  "references",
  "directions",
] as const;

export type IntendedAIRole = (typeof AI_ROLE_IDS)[number];

export type DraftSnapshot = {
  title: string;
  originalIdea: string;
  shortSummary: string;
  privacy: Enums<"privacy_level">;
  aiRole: IntendedAIRole;
  progress: DraftProgress;
};

export type DraftActionResult =
  | { ok: true; savedAt: string; branchId?: string; alreadyConfirmed?: boolean }
  | { ok: false; code: ServiceErrorCode; message: string };

export function progressWithAIRole(snapshot: DraftSnapshot): DraftProgress {
  return {
    ...snapshot.progress,
    origin: true,
    originalIdea: Boolean(snapshot.originalIdea.trim()),
    title: Boolean(snapshot.title.trim()),
    shortSummary: Boolean(snapshot.shortSummary.trim()),
    previousWork: true,
    people: true,
    privacyAndAI: true,
    ...Object.fromEntries(AI_ROLE_IDS.map((role) => [`aiRole_${role}`, role === snapshot.aiRole])),
  };
}
