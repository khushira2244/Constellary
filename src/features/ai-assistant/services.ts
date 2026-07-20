import "server-only";

import OpenAI from "openai";

import { createAIContributionDraft } from "@/features/ai-contributions/services";
import { getBranchPageData } from "@/features/branch-reading/services";
import type { BranchPageData } from "@/features/branch-reading/types";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { requireBranchAccess } from "@/lib/permissions/branches";
import { fail, ok } from "@/lib/services/result";
import type { AppSupabaseClient, Json } from "@/types/database";
import type { AIAssistantRequest, AIAssistantResponse, AIContextKind } from "./types";
import {
  MAX_AI_CONTEXT_CHARACTERS,
  parseAIAllowlist,
  validateAIAssistantInput,
} from "./validation";

const rateLimit = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_REQUESTS = 5;

function underRateLimit(userId: string, now = Date.now()) {
  const recent = (rateLimit.get(userId) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_REQUESTS) return false;
  recent.push(now);
  rateLimit.set(userId, recent);
  return true;
}

const object = (value: Json | null) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, Json>
    : {};
const noteText = (value: Json) => {
  const content = object(value);
  return typeof content.text === "string" ? content.text : JSON.stringify(value);
};

function selectedContext(
  kind: AIContextKind,
  data: BranchPageData,
) {
  switch (kind) {
    case "summary":
      return ["Full Summary", data.fullSummary?.content ?? data.shortSummary?.content ?? "No summary"];
    case "visual":
      return ["Visual Summary", data.notes.filter((item) => object(item.content).kind === "visual_summary").map((item) => JSON.stringify(object(item.content).document ?? {})).join("\n") || "No visual summary"];
    case "notes":
      return ["Notes", data.notes.filter((item) => item.item_type !== "voice_note").map((item) => noteText(item.content)).join("\n") || "No notes"];
    case "voice":
      return ["Voice Notes", data.notes.filter((item) => item.item_type === "voice_note").map((item) => JSON.stringify(object(item.content).metadata ?? {})).join("\n") || "No voice notes"];
    case "sources":
      return ["Sources", data.sources.map((source) => `${source.title}: ${source.url ?? source.doi ?? "no locator"}`).join("\n") || "No sources"];
    case "files":
      return ["File metadata", data.files.map((file) => `${file.file_name} (${file.mime_type}, ${file.file_size} bytes)`).join("\n") || "No files"];
    case "links":
      return ["Linked Branches", data.linkedBranches.map((link) => `${link.branch.title} (${link.relationshipType})`).join("\n") || "No linked branches"];
    case "collaborators":
      return ["Collaborator roles", data.collaborators.map((entry) => entry.role).join(", ") || "No collaborators"];
    case "comments":
      return ["Comments", data.comments.map((comment) => comment.content).join("\n") || "No comments"];
    case "privacy":
      return ["Privacy", data.branch.privacy];
    case "ai":
      return ["AI Role", `AI ${data.branch.ai_enabled ? "enabled" : "disabled"}; ${data.aiAttribution.length} recorded contributions`];
    case "status":
      return ["Status", data.branch.status];
    case "activity":
      return ["Activity", data.activity.slice(0, 30).map((event) => `${event.event_type} at ${event.created_at}`).join("\n") || "No activity"];
  }
}

export async function assertAIRequestAccess(
  branchId: string,
  client: AppSupabaseClient,
) {
  if (process.env.AI_ACCESS_MODE !== "allowlist") {
    return fail("FORBIDDEN", "AI access is not enabled for this account.");
  }
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const email = user.data.email?.trim().toLowerCase();
  const allowlist = parseAIAllowlist(process.env.AI_ALLOWED_USER_EMAILS);
  if (!email || !allowlist.has(email)) {
    return fail("FORBIDDEN", "AI access is not enabled for this account.");
  }
  const branch = await requireBranchAccess(branchId, "edit", client);
  if (!branch.ok) return branch;
  const membership = await client
    .from("branch_collaborators")
    .select("role")
    .eq("branch_id", branchId)
    .eq("user_id", user.data.id)
    .maybeSingle();
  if (membership.error) return fail("DATABASE_ERROR", "AI authorization could not be verified.");
  const role = branch.data.owner_id === user.data.id ? "owner" : membership.data?.role;
  if (role !== "owner" && role !== "editor") {
    return fail("FORBIDDEN", "AI access is not enabled for this account.");
  }
  if (!branch.data.ai_enabled) {
    return fail("FORBIDDEN", "AI is disabled for this branch.");
  }
  if (!process.env.OPENAI_API_KEY) {
    return fail("CONFIGURATION_ERROR", "AI is not configured for this environment.");
  }
  if (!underRateLimit(user.data.id)) {
    return fail("FORBIDDEN", "AI request limit reached. Please wait before trying again.");
  }
  return ok({ user: user.data, branch: branch.data });
}

export async function requestAIAssistance(
  input: AIAssistantRequest,
  client: AppSupabaseClient,
) {
  const valid = validateAIAssistantInput(input);
  if (!valid.ok) return fail("VALIDATION_ERROR", valid.message);
  const access = await assertAIRequestAccess(input.branchId, client);
  if (!access.ok) return access;
  const page = await getBranchPageData(input.branchId, client);
  if (!page.ok) return page;
  if (valid.data.context.includes("summary") && !page.data.fullSummary?.content.trim()) {
    return fail("VALIDATION_ERROR", "Save a Full Summary before adding it to AI context.");
  }

  const selected = valid.data.context.map((kind) => selectedContext(kind, page.data));
  const contextText = selected.map(([label, content]) => `## ${label}\n${content}`).join("\n\n");
  if (contextText.length > MAX_AI_CONTEXT_CHARACTERS) {
    return fail("VALIDATION_ERROR", "Selected AI context is too large. Remove some context items.");
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.6";
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: 30_000,
  });
  try {
    const response = await openai.responses.create({
      model,
      max_output_tokens: 900,
      instructions: [
        "You are Constellary's research assistant.",
        "Use only the explicitly selected context below.",
        "Do not claim that generated text has been applied or approved.",
        "Clearly distinguish evidence, inference, and suggestions.",
      ].join(" "),
      input: `Branch: ${page.data.branch.title}\n\nSelected context:\n${contextText || "No optional context selected."}\n\nUser request:\n${valid.data.prompt}`,
    });
    const output = response.output_text.trim();
    if (!output) return fail("DATABASE_ERROR", "The AI response was empty.");
    const contribution = await createAIContributionDraft(
      input.branchId,
      valid.data.contributionKind,
      selected.map(([label]) => label).join(", ") || "No optional context",
      output,
      client,
      { modelName: model },
    );
    if (!contribution.ok) return contribution;
    return ok<AIAssistantResponse>({
      contributionId: contribution.data.id,
      text: output,
      model,
      contextLabels: selected.map(([label]) => label),
      generatedAt: contribution.data.created_at,
    });
  } catch {
    return fail(
      "DATABASE_ERROR",
      "The AI response could not be generated. Your research was not changed.",
    );
  }
}
