import { z } from "zod";

import { recordActivity } from "@/features/activity/services";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { requireBranchAccess } from "@/lib/permissions/branches";
import { databaseFailure, fail, ok } from "@/lib/services/result";
import type { AppSupabaseClient, TablesUpdate } from "@/types/database";
import type { SourceInput } from "./types";

const urlSchema = z.string().url();

function sourceValues(input: SourceInput) {
  const title = input.title.trim();
  if (!title) return fail("VALIDATION_ERROR", "Source title is required.");
  if (input.url && !urlSchema.safeParse(input.url).success) {
    return fail("VALIDATION_ERROR", "Source URL is invalid.");
  }
  if (!input.url && !input.doi?.trim() && !input.citation?.trim()) {
    return fail("VALIDATION_ERROR", "Source requires a URL, DOI, or citation.");
  }
  return ok({
    source_type: input.sourceType,
    title,
    authors: input.authors ?? [],
    publication: input.publication?.trim() || null,
    publication_year: input.publicationYear ?? null,
    url: input.url?.trim() || null,
    doi: input.doi?.trim() || null,
    citation_text: input.citation?.trim() || null,
    relationship_type: input.relationshipType?.trim() || null,
    description: input.notes?.trim() || null,
    visibility: input.visibility ?? "inherit",
  } satisfies TablesUpdate<"sources">);
}

export async function listBranchSources(branchId: string, client: AppSupabaseClient) {
  const branch = await requireBranchAccess(branchId, "view", client);
  if (!branch.ok) return branch;
  const result = await client.from("sources").select("*")
    .eq("branch_id", branch.data.id).order("created_at");
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

export async function createSource(branchId: string, input: SourceInput, client: AppSupabaseClient) {
  const values = sourceValues(input);
  if (!values.ok) return values;
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const branch = await requireBranchAccess(branchId, "edit", client);
  if (!branch.ok) return branch;
  const result = await client.from("sources").insert({
    ...values.data,
    branch_id: branch.data.id,
    added_by: user.data.id,
  }).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(branch.data.id, "source_added", { source_id: result.data.id }, client);
  return ok(result.data);
}

export async function updateSource(sourceId: string, input: SourceInput, client: AppSupabaseClient) {
  const values = sourceValues(input);
  if (!values.ok) return values;
  const existing = await client.from("sources").select("*").eq("id", sourceId).maybeSingle();
  if (existing.error) return databaseFailure(existing.error.message);
  if (!existing.data) return fail("NOT_FOUND", "Source not found.");
  const branch = await requireBranchAccess(existing.data.branch_id, "edit", client);
  if (!branch.ok) return branch;
  const result = await client.from("sources").update(values.data)
    .eq("id", existing.data.id).select("*").single();
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

export async function removeSource(sourceId: string, client: AppSupabaseClient) {
  const existing = await client.from("sources").select("*").eq("id", sourceId).maybeSingle();
  if (existing.error) return databaseFailure(existing.error.message);
  if (!existing.data) return fail("NOT_FOUND", "Source not found.");
  const branch = await requireBranchAccess(existing.data.branch_id, "edit", client);
  if (!branch.ok) return branch;
  const result = await client.from("sources").delete().eq("id", sourceId).select("id").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(existing.data.branch_id, "source_added", {
    source_id: sourceId,
    action: "removed",
  }, client);
  return ok(result.data);
}
