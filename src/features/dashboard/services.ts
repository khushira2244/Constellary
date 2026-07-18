import { getCurrentProfile } from "@/features/profiles/services";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { databaseFailure, ok, type ServiceResult } from "@/lib/services/result";
import type { AppSupabaseClient, Branch, Enums, Tables } from "@/types/database";
import { activityLabel, currentDraftStep } from "./model";
import type {
  ArchiveFilters,
  DashboardActivity,
  DashboardBranch,
  DashboardData,
  DashboardDraft,
} from "./types";

const FEATURED_BRANCH_ID = "d0000000-0000-4000-8000-000000000001";
const ARCHIVE_LIMIT = 25;

type RelatedRows = {
  summaries: Tables<"branch_summaries">[];
  collaborators: Pick<Tables<"branch_collaborators">, "branch_id" | "user_id" | "role">[];
  comments: Pick<Tables<"comments">, "branch_id">[];
  links: Pick<Tables<"branch_links">, "source_branch_id" | "target_branch_id">[];
  sources: Pick<Tables<"sources">, "branch_id">[];
  files: Pick<Tables<"files">, "branch_id">[];
};

const count = <T>(rows: T[], predicate: (row: T) => boolean) =>
  rows.reduce((total, row) => total + Number(predicate(row)), 0);

function composeBranches(
  branches: Branch[],
  allAccessible: Branch[],
  related: RelatedRows,
  userId: string,
): DashboardBranch[] {
  const titles = new Map(allAccessible.map((branch) => [branch.id, branch.title]));
  return branches.map((branch) => {
    const membership = related.collaborators.find(
      (row) => row.branch_id === branch.id && row.user_id === userId,
    );
    const role = membership?.role ?? (branch.owner_id === userId ? "owner" : null);
    return {
      id: branch.id,
      title: branch.title,
      parentId: branch.parent_branch_id,
      parentTitle: branch.parent_branch_id ? titles.get(branch.parent_branch_id) ?? null : null,
      summary: related.summaries.find((row) => row.branch_id === branch.id)?.content ?? null,
      status: branch.status,
      privacy: branch.privacy,
      updatedAt: branch.updated_at,
      collaboratorCount: count(related.collaborators, (row) => row.branch_id === branch.id),
      commentCount: count(related.comments, (row) => row.branch_id === branch.id),
      linkedBranchCount: count(
        related.links,
        (row) => row.source_branch_id === branch.id || row.target_branch_id === branch.id,
      ),
      sourceFileCount:
        count(related.sources, (row) => row.branch_id === branch.id) +
        count(related.files, (row) => row.branch_id === branch.id),
      childCount: count(allAccessible, (row) => row.parent_branch_id === branch.id),
      capabilities: {
        canEdit: role === "owner" || role === "editor",
        canManage: role === "owner",
      },
    };
  });
}

async function relatedRows(ids: string[], client: AppSupabaseClient) {
  if (!ids.length) {
    return {
      ok: true as const,
      data: {
        summaries: [], collaborators: [], comments: [], links: [], sources: [], files: [],
      } satisfies RelatedRows,
    };
  }
  const [summaries, collaborators, comments, links, sources, files] = await Promise.all([
    client.from("branch_summaries").select("*").in("branch_id", ids)
      .eq("summary_type", "short").eq("is_current", true),
    client.from("branch_collaborators").select("branch_id,user_id,role").in("branch_id", ids),
    client.from("comments").select("branch_id").in("branch_id", ids)
      .neq("status", "deleted").is("deleted_at", null),
    client.from("branch_links").select("source_branch_id,target_branch_id")
      .or(`source_branch_id.in.(${ids.join(",")}),target_branch_id.in.(${ids.join(",")})`),
    client.from("sources").select("branch_id").in("branch_id", ids),
    client.from("files").select("branch_id").in("branch_id", ids).is("deleted_at", null),
  ]);
  const error = summaries.error ?? collaborators.error ?? comments.error ??
    links.error ?? sources.error ?? files.error;
  if (error) return { ok: false as const, error };
  return {
    ok: true as const,
    data: {
      summaries: summaries.data ?? [],
      collaborators: collaborators.data ?? [],
      comments: comments.data ?? [],
      links: links.data ?? [],
      sources: sources.data ?? [],
      files: files.data ?? [],
    } satisfies RelatedRows,
  };
}

export async function getDashboardData(
  client: AppSupabaseClient,
  filters: ArchiveFilters = {},
): Promise<ServiceResult<DashboardData>> {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const profile = await getCurrentProfile(client);
  if (!profile.ok) return profile;

  let branchesQuery = client.from("branches").select("*").order("updated_at", { ascending: false });
  if (filters.query) branchesQuery = branchesQuery.ilike("title", `%${filters.query}%`);
  if (filters.status) branchesQuery = branchesQuery.eq(
    "status",
    filters.status as Enums<"branch_status">,
  );
  if (filters.privacy) branchesQuery = branchesQuery.eq(
    "privacy",
    filters.privacy as Enums<"privacy_level">,
  );
  if (filters.relationship === "main") branchesQuery = branchesQuery.is("parent_branch_id", null);
  if (filters.relationship === "subbranch") branchesQuery = branchesQuery.not("parent_branch_id", "is", null);
  if (filters.year && /^\d{4}$/.test(filters.year)) {
    const month = filters.month && /^(?:[1-9]|1[0-2])$/.test(filters.month)
      ? Number(filters.month) - 1
      : 0;
    const start = new Date(Date.UTC(Number(filters.year), month, 1));
    const end = filters.month
      ? new Date(Date.UTC(Number(filters.year), month + 1, 1))
      : new Date(Date.UTC(Number(filters.year) + 1, 0, 1));
    branchesQuery = branchesQuery.gte("updated_at", start.toISOString()).lt("updated_at", end.toISOString());
  }
  const { data: queriedBranches, error: branchError } = await branchesQuery.limit(100);
  if (branchError) return databaseFailure(branchError.message);

  const { data: allAccessible, error: allError } = await client
    .from("branches").select("*").order("updated_at", { ascending: false }).limit(200);
  if (allError) return databaseFailure(allError.message);
  const accessible = allAccessible ?? [];
  const ids = accessible.map((branch) => branch.id);
  const related = await relatedRows(ids, client);
  if (!related.ok) return databaseFailure(related.error.message);

  const composed = composeBranches(accessible, accessible, related.data, user.data.id);
  const featured = composed.find((branch) => branch.id === FEATURED_BRANCH_ID) ??
    composed.find((branch) => !branch.parentId) ?? null;
  const recent = composed
    .filter((branch) =>
      branch.id !== featured?.id &&
      (!branch.parentId || branch.parentId === featured?.id),
    )
    .slice(0, 4);

  const { data: draftRows, error: draftError } = await client
    .from("branch_drafts").select("*").eq("creator_id", user.data.id)
    .is("confirmed_branch_id", null).order("updated_at", { ascending: false }).limit(8);
  if (draftError) return databaseFailure(draftError.message);
  const titleMap = new Map(accessible.map((branch) => [branch.id, branch.title]));
  const drafts: DashboardDraft[] = (draftRows ?? []).map((draft) => ({
    id: draft.id,
    title: draft.title?.trim() || "Untitled Branch",
    parentId: draft.parent_branch_id,
    parentTitle: draft.parent_branch_id ? titleMap.get(draft.parent_branch_id) ?? null : null,
    updatedAt: draft.updated_at,
    currentStep: currentDraftStep(draft.creation_progress),
  }));

  const archiveRows = (queriedBranches ?? []).slice(0, ARCHIVE_LIMIT);
  const archive = composeBranches(archiveRows, accessible, related.data, user.data.id);

  const { data: activityRows, error: activityError } = ids.length
    ? await client.from("activity_events").select("*").in("branch_id", ids)
      .order("created_at", { ascending: false }).limit(8)
    : { data: [] as Tables<"activity_events">[], error: null };
  if (activityError) return databaseFailure(activityError.message);
  const actorIds = [...new Set((activityRows ?? []).flatMap((event) => event.actor_id ? [event.actor_id] : []))];
  const { data: actors, error: actorError } = actorIds.length
    ? await client.from("profiles").select("id,display_name,username").in("id", actorIds)
    : { data: [], error: null };
  if (actorError) return databaseFailure(actorError.message);
  const actorNames = new Map((actors ?? []).map((actor) => [
    actor.id, actor.display_name ?? actor.username,
  ]));
  const branchTitles = new Map(accessible.map((branch) => [branch.id, branch.title]));
  const activity: DashboardActivity[] = (activityRows ?? []).flatMap((event) => {
    const branchTitle = branchTitles.get(event.branch_id);
    return branchTitle ? [{
      id: event.id,
      label: activityLabel(event.event_type),
      branchId: event.branch_id,
      branchTitle,
      actorName: event.actor_id ? actorNames.get(event.actor_id) ?? null : null,
      createdAt: event.created_at,
    }] : [];
  });

  const collaboratorUsers = new Set(related.data.collaborators
    .filter((row) => ids.includes(row.branch_id) && row.user_id !== user.data.id)
    .map((row) => row.user_id));
  return ok({
    profileName: profile.data?.display_name ?? profile.data?.username ?? "Researcher",
    overview: {
      mainBranches: accessible.filter((branch) => !branch.parent_branch_id).length,
      totalBranches: accessible.length,
      collaborators: collaboratorUsers.size,
      linkedBranches: related.data.links.length,
      unfinishedDrafts: drafts.length,
    },
    featured,
    recent,
    drafts,
    archive,
    activity,
  });
}
