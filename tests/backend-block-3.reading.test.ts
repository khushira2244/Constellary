import { describe, expect, test } from "vitest";

import {
  getBranchPageData,
  getChildBranches,
  getEditableBranchView,
  getLinkedBranches,
  getParentBranch,
  getPublicBranchView,
} from "@/features/branch-reading/services";
import type { AppSupabaseClient, Enums } from "@/types/database";

type TestRole = "anonymous" | Enums<"collaborator_role">;
type Row = Record<string, unknown>;

const parentId = "c3000000-0000-4000-8000-000000000001";
const publicId = "c3000000-0000-4000-8000-000000000002";
const childId = "c3000000-0000-4000-8000-000000000003";
const linkedPublicId = "c3000000-0000-4000-8000-000000000004";
const linkedPrivateId = "c3000000-0000-4000-8000-000000000005";
const privateId = "c3000000-0000-4000-8000-000000000006";
const ownerId = "c3000000-0000-4000-8000-000000000010";
const memberId = "c3000000-0000-4000-8000-000000000011";

const branch = (
  id: string,
  title: string,
  privacy: "public" | "private",
  parentBranchId: string | null = null,
) => ({
  id,
  owner_id: ownerId,
  parent_branch_id: parentBranchId,
  title,
  original_idea: `${title} idea`,
  origin_type: "own_idea",
  origin_details: {},
  status: "active",
  privacy,
  language: "en",
  original_idea_locked_at: "2026-07-17T00:00:00.000Z",
  confirmed_from_draft_id: null,
  created_at: "2026-07-17T00:00:00.000Z",
  updated_at: "2026-07-17T01:00:00.000Z",
  archived_at: null,
});

const branches = [
  branch(parentId, "Parent", "public"),
  branch(publicId, "Public branch", "public", parentId),
  branch(childId, "Child", "public", publicId),
  branch(linkedPublicId, "Visible provenance", "public"),
  branch(linkedPrivateId, "Hidden provenance", "private"),
  branch(privateId, "Private branch", "private"),
];

const profiles = [{
  id: ownerId,
  display_name: "Research Owner",
  username: "owner",
  avatar_url: null,
  headline: "Researcher",
  is_verified: true,
}];

const rows: Record<string, Row[]> = {
  branches,
  profiles,
  branch_links: [
    {
      id: "c3000000-0000-4000-8000-000000000020",
      source_branch_id: publicId,
      target_branch_id: linkedPublicId,
      relationship_type: "references",
      relationship_note: null,
      imported_summary_id: null,
      created_by: ownerId,
      created_at: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "c3000000-0000-4000-8000-000000000021",
      source_branch_id: publicId,
      target_branch_id: linkedPrivateId,
      relationship_type: "references",
      relationship_note: null,
      imported_summary_id: null,
      created_by: ownerId,
      created_at: "2026-07-17T00:00:00.000Z",
    },
  ],
  branch_summaries: [
    {
      id: "c3000000-0000-4000-8000-000000000030",
      branch_id: publicId,
      summary_type: "short",
      content: "Approved public short summary",
      status: "approved",
      visibility: "public",
      created_by: ownerId,
      approved_by: ownerId,
      approved_at: "2026-07-17T00:00:00.000Z",
      is_current: true,
      updated_at: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "c3000000-0000-4000-8000-000000000031",
      branch_id: publicId,
      summary_type: "full",
      content: "Private full working summary",
      status: "draft",
      visibility: "private",
      created_by: ownerId,
      approved_by: null,
      approved_at: null,
      is_current: true,
      updated_at: "2026-07-17T00:00:00.000Z",
    },
  ],
  workspace_items: [],
  sources: [],
  files: [],
  comments: [],
  branch_collaborators: [
    {
      id: "c3000000-0000-4000-8000-000000000040",
      branch_id: publicId,
      user_id: ownerId,
      role: "owner",
      access_scope: "entire_branch",
      created_at: "2026-07-17T00:00:00.000Z",
    },
  ],
  ai_contributions: [],
  activity_events: [{
    id: "c3000000-0000-4000-8000-000000000050",
    branch_id: publicId,
    actor_id: ownerId,
    event_type: "branch_confirmed",
    entity_type: "branch",
    entity_id: publicId,
    metadata: {},
    visibility: "public",
    created_at: "2026-07-17T00:00:00.000Z",
  }],
};

class Query {
  private current: Row[];

  constructor(data: Row[]) {
    this.current = [...data];
  }

  select() { return this; }
  order() { return this; }
  limit(count: number) { this.current = this.current.slice(0, count); return this; }
  or() { return this; }
  eq(column: string, value: unknown) {
    this.current = this.current.filter((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.current = this.current.filter((row) => row[column] !== value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.current = this.current.filter((row) => values.includes(row[column]));
    return this;
  }
  is(column: string, value: unknown) {
    this.current = this.current.filter((row) => row[column] === value);
    return this;
  }
  maybeSingle() {
    return Promise.resolve({ data: this.current[0] ?? null, error: null });
  }
  then(resolve: (value: { data: Row[]; error: null }) => unknown) {
    return Promise.resolve({ data: this.current, error: null }).then(resolve);
  }
}

function fakeClient(role: TestRole): AppSupabaseClient {
  const authenticated = role !== "anonymous";
  const canAccessPrivate = authenticated;
  return {
    auth: {
      getUser: async () => authenticated
        ? { data: { user: { id: role === "owner" ? ownerId : memberId } }, error: null }
        : { data: { user: null }, error: { message: "Auth session missing" } },
    },
    rpc: async (name: string) => {
      const value =
        name === "can_view_branch" ? true
        : name === "can_edit_branch" ? ["owner", "editor"].includes(role)
        : name === "can_manage_branch" ? role === "owner"
        : name === "can_comment_branch"
          ? ["owner", "editor", "reviewer", "commenter"].includes(role)
          : false;
      return { data: value, error: null };
    },
    from: (table: string) => {
      let data = [...(rows[table] ?? [])];
      if (table === "branches" && !canAccessPrivate) {
        data = data.filter((item) => item.privacy === "public");
      }
      if (table === "branch_links" && !canAccessPrivate) {
        data = data.filter((item) => item.target_branch_id === linkedPublicId);
      }
      if (["branch_summaries", "activity_events"].includes(table) && !authenticated) {
        data = data.filter((item) => item.visibility === "public");
      }
      if (table === "branch_collaborators" && authenticated && role !== "owner") {
        data = [{
          id: `membership-${role}`,
          branch_id: publicId,
          user_id: memberId,
          role,
          access_scope: "entire_branch",
          created_at: "2026-07-17T00:00:00.000Z",
        }];
      }
      return new Query(data);
    },
  } as unknown as AppSupabaseClient;
}

describe("Backend Block 3 privacy-aware reads", () => {
  test("builds a safe public branch response and rejects private branches", async () => {
    const client = fakeClient("anonymous");
    const result = await getPublicBranchView(publicId, client);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.shortSummary?.content).toBe("Approved public short summary");
    expect(result.data.fullSummary).toBeNull();
    expect(result.data.collaborators).toEqual([]);
    expect(result.data.aiAttribution).toEqual([]);
    expect(result.data.activity).toHaveLength(1);
    expect(result.data.capabilities.canEdit).toBe(false);
    expect(JSON.stringify(result.data)).not.toContain("invitee_email");
    expect(JSON.stringify(result.data)).not.toContain("storage_path");

    const privateResult = await getPublicBranchView(privateId, client);
    expect(privateResult.ok).toBe(false);
  });

  test.each([
    ["owner", true, true, true],
    ["editor", true, false, true],
    ["commenter", false, false, true],
    ["viewer", false, false, false],
  ] as const)("returns correct %s capabilities", async (role, edit, manage, comment) => {
    const result = await getBranchPageData(publicId, fakeClient(role));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.capabilities.canEdit).toBe(edit);
    expect(result.data.capabilities.canManage).toBe(manage);
    expect(result.data.capabilities.canComment).toBe(comment);
    expect(result.data.capabilities.role).toBe(role);
    expect(result.data.collaborators[0]).not.toHaveProperty("email");
  });

  test("keeps ancestry, children, and provenance separate and hides inaccessible links", async () => {
    const client = fakeClient("anonymous");
    const parent = await getParentBranch(publicId, client);
    const children = await getChildBranches(publicId, client);
    const linked = await getLinkedBranches(publicId, client);
    expect(parent.ok && parent.data?.id).toBe(parentId);
    expect(children.ok && children.data.map((item) => item.id)).toContain(childId);
    expect(linked.ok && linked.data.map((item) => item.branch.id)).toEqual([linkedPublicId]);
    if (linked.ok) expect(linked.data[0]?.branch.id).not.toBe(parentId);
  });

  test("requires editor or owner capability for editable view", async () => {
    expect((await getEditableBranchView(publicId, fakeClient("editor"))).ok).toBe(true);
    const viewer = await getEditableBranchView(publicId, fakeClient("viewer"));
    expect(viewer.ok).toBe(false);
    if (!viewer.ok) expect(viewer.error.code).toBe("FORBIDDEN");
  });
});
