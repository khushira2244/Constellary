import type { Json } from "@/types/database";

const labels: Record<string, string> = {
  branch_confirmed: "Confirmed a branch",
  original_idea_locked: "Locked the original idea",
  summary_created: "Created a summary",
  summary_updated: "Updated the full summary",
  summary_approved: "Approved a summary",
  workspace_item_created: "Added a note",
  workspace_item_updated: "Updated a workspace item",
  source_added: "Added a source",
  branch_linked: "Linked another branch",
  collaborator_joined: "Added a collaborator",
  comment_added: "Added a comment",
  ai_content_generated: "Generated an AI contribution",
  ai_content_approved: "Approved an AI contribution",
  privacy_changed: "Changed branch privacy",
  status_changed: "Changed branch status",
  file_uploaded: "Added a file",
};

export function activityLabel(eventType: string) {
  return labels[eventType] ?? "Updated research";
}

export function currentDraftStep(progress: Json) {
  if (!progress || Array.isArray(progress) || typeof progress !== "object") return "Title";
  const steps = [
    ["title", "Title"],
    ["originalIdea", "Original Idea"],
    ["origin", "Origin"],
    ["shortSummary", "Short Summary"],
    ["previousWork", "Linked Branches"],
    ["people", "Collaborators"],
    ["privacyAndAI", "Privacy & AI"],
  ] as const;
  return steps.find(([key]) => progress[key] !== true)?.[1] ?? "Review";
}

export function safeArchiveFilters(input: Record<string, string | string[] | undefined>) {
  const one = (key: string) => {
    const value = input[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  return {
    query: one("q")?.slice(0, 100),
    status: one("status"),
    privacy: one("privacy"),
    year: one("year"),
    month: one("month"),
    relationship: one("relationship"),
  };
}
