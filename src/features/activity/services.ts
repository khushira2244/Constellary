import { requireCurrentUser } from "@/lib/auth/current-user";
import { requireBranchAccess } from "@/lib/permissions/branches";
import { databaseFailure, fail, ok, type ServiceResult } from "@/lib/services/result";
import type { AppSupabaseClient, Enums, Json, Tables } from "@/types/database";

const sensitiveKey = /(token|secret|password|email|storage_path|storage_bucket)/i;

function sanitize(value: Json): Json {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sensitiveKey.test(key))
        .map(([key, item]) => [key, item === undefined ? null : sanitize(item)]),
    );
  }
  return value;
}

export async function recordActivity(
  branchId: string,
  eventType: Enums<"activity_event_type">,
  metadata: Json,
  client: AppSupabaseClient,
): Promise<ServiceResult<Tables<"activity_events">>> {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const branch = await requireBranchAccess(branchId, "view", client);
  if (!branch.ok) return branch;
  const { data, error } = await client
    .from("activity_events")
    .insert({
      branch_id: branch.data.id,
      actor_id: user.data.id,
      event_type: eventType,
      entity_type: "branch",
      entity_id: branch.data.id,
      metadata: sanitize(metadata),
      visibility: "branch_members",
    })
    .select("*")
    .single();
  if (error) return databaseFailure(error.message);
  return ok(data);
}

export async function listBranchActivity(
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<Tables<"activity_events">[]>> {
  const branch = await requireBranchAccess(branchId, "view", client);
  if (!branch.ok) return branch;
  const { data, error } = await client
    .from("activity_events")
    .select("*")
    .eq("branch_id", branch.data.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return databaseFailure(error.message);
  return ok(data);
}

export const listWorkspaceActivity = async (
  branchId: string,
  client: AppSupabaseClient,
): Promise<ServiceResult<Tables<"activity_events">[]>> => {
  const activity = await listBranchActivity(branchId, client);
  if (!activity.ok) return activity;
  const workspaceEvents = new Set<Enums<"activity_event_type">>([
    "summary_created",
    "summary_updated",
    "summary_approved",
    "workspace_item_created",
    "workspace_item_updated",
    "source_added",
    "file_uploaded",
    "comment_added",
    "comment_resolved",
    "ai_content_generated",
    "ai_content_approved",
  ]);
  return ok(activity.data.filter((event) => workspaceEvents.has(event.event_type)));
};

export const activityFailure = (message: string) =>
  fail("DATABASE_ERROR", "The content changed but its activity event could not be recorded.", message);
