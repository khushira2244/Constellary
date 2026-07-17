import { beforeAll, describe, expect, test } from "vitest";

import {
  addDraftCollaborator,
  getDraftCollaborators,
  removeDraftCollaborator,
  updateDraftCollaboratorRole,
} from "@/features/branch-drafts/collaborators";
import {
  createMainBranchDraft,
  createSubbranchDraft,
  deleteBranchDraft,
  getBranchDraft,
  updateBranchDraftTitle,
} from "@/features/branch-drafts/services";
import {
  addDraftLinkedBranch,
  getDraftLinkedBranches,
  removeDraftLinkedBranch,
  searchAccessibleBranches,
} from "@/features/branch-links/services";
import { ensureCurrentProfile } from "@/features/profiles/services";
import { requireCurrentUser } from "@/lib/auth/current-user";
import {
  createAnonymousClient,
  createConfirmedBranch,
  createTestAdmin,
  createTestUser,
} from "./helpers/local-supabase";

const hasLocalSupabaseCredentials = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

describe.sequential("Backend Block 1 against local Supabase", () => {
  let admin: ReturnType<typeof createTestAdmin>;
  let owner: Awaited<ReturnType<typeof createTestUser>>;
  let other: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    if (
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      return;
    }
    admin = createTestAdmin();
    owner = await createTestUser(admin, "owner");
    other = await createTestUser(admin, "other");
  });

  test.skipIf(!hasLocalSupabaseCredentials)(
    "auth, profiles, draft ownership, links, collaborators and deletion",
    async () => {
    const anonymousAuth = await requireCurrentUser(createAnonymousClient());
    expect(anonymousAuth.ok).toBe(false);
    if (!anonymousAuth.ok) expect(anonymousAuth.error.code).toBe("AUTH_REQUIRED");

    const profile = await ensureCurrentProfile(owner.client);
    expect(profile.ok).toBe(true);
    if (profile.ok) expect(profile.data.id).toBe(owner.id);

    const main = await createMainBranchDraft(owner.client);
    expect(main.ok).toBe(true);
    if (!main.ok) return;
    expect(main.data.parent_branch_id).toBeNull();

    const hiddenFromOwner = await createConfirmedBranch(
      other.client,
      other.id,
      "private",
      "Hidden parent",
    );
    const deniedSubbranch = await createSubbranchDraft(
      hiddenFromOwner.branchId,
      owner.client,
    );
    expect(deniedSubbranch.ok).toBe(false);

    const publicBranch = await createConfirmedBranch(
      other.client,
      other.id,
      "public",
      `Readable research ${crypto.randomUUID()}`,
    );
    const subbranch = await createSubbranchDraft(publicBranch.branchId, owner.client);
    expect(subbranch.ok).toBe(true);
    if (subbranch.ok) expect(subbranch.data.parent_branch_id).toBe(publicBranch.branchId);

    const hiddenDraft = await getBranchDraft(main.data.id, other.client);
    expect(hiddenDraft.ok).toBe(false);

    const search = await searchAccessibleBranches("Readable research", owner.client);
    expect(search.ok).toBe(true);
    if (search.ok) expect(search.data.some((item) => item.id === publicBranch.branchId)).toBe(true);
    const hiddenSearch = await searchAccessibleBranches("Hidden parent", owner.client);
    expect(hiddenSearch.ok && hiddenSearch.data.length === 0).toBe(true);

    const linked = await addDraftLinkedBranch(
      main.data.id,
      {
        targetBranchId: publicBranch.branchId,
        relationshipType: "inspired_by",
        relationshipNote: "Relevant prior work",
      },
      owner.client,
    );
    expect(linked.ok).toBe(true);
    if (linked.ok) {
      expect(linked.data[0]?.snapshot.approved_short_summary?.content).toContain(
        "approved short summary",
      );
    }
    const duplicate = await addDraftLinkedBranch(
      main.data.id,
      {
        targetBranchId: publicBranch.branchId,
        relationshipType: "references",
      },
      owner.client,
    );
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.code).toBe("CONFLICT");

    const unreadable = await addDraftLinkedBranch(
      main.data.id,
      { targetBranchId: hiddenFromOwner.branchId, relationshipType: "references" },
      owner.client,
    );
    expect(unreadable.ok).toBe(false);

    const collaborators = await addDraftCollaborator(
      main.data.id,
      "COLLAB@example.com",
      "viewer",
      owner.client,
    );
    expect(collaborators.ok).toBe(true);
    const duplicateCollaborator = await addDraftCollaborator(
      main.data.id,
      "collab@example.com",
      "editor",
      owner.client,
    );
    expect(duplicateCollaborator.ok).toBe(false);
    const ownerRole = await addDraftCollaborator(
      main.data.id,
      "owner@example.com",
      "owner" as "viewer",
      owner.client,
    );
    expect(ownerRole.ok).toBe(false);
    const changedRole = await updateDraftCollaboratorRole(
      main.data.id,
      "collab@example.com",
      "commenter",
      owner.client,
    );
    expect(changedRole.ok).toBe(true);
    const removedCollaborator = await removeDraftCollaborator(
      main.data.id,
      "collab@example.com",
      owner.client,
    );
    expect(removedCollaborator.ok && removedCollaborator.data.length === 0).toBe(true);

    const currentLinks = await getDraftLinkedBranches(main.data.id, owner.client);
    expect(currentLinks.ok && currentLinks.data.length === 1).toBe(true);
    const removedLink = await removeDraftLinkedBranch(
      main.data.id,
      publicBranch.branchId,
      owner.client,
    );
    expect(removedLink.ok && removedLink.data.length === 0).toBe(true);

    const { error: confirmError } = await owner.client
      .from("branch_drafts")
      .update({
        title: "Confirmed immutable draft",
        original_idea: "Locked after confirmation",
        origin_type: "own_idea",
        short_summary: "Short approved summary",
      })
      .eq("id", main.data.id);
    expect(confirmError).toBeNull();
    const confirmation = await owner.client.rpc("confirm_branch_draft", {
      draft_id: main.data.id,
    });
    expect(confirmation.error).toBeNull();
    const immutable = await updateBranchDraftTitle(
      main.data.id,
      "Must not update",
      owner.client,
    );
    expect(immutable.ok).toBe(false);
    if (!immutable.ok) expect(immutable.error.code).toBe("CONFLICT");
    const immutableDelete = await deleteBranchDraft(main.data.id, owner.client);
    expect(immutableDelete.ok).toBe(false);
    if (!immutableDelete.ok) expect(immutableDelete.error.code).toBe("CONFLICT");

    const deletable = await createMainBranchDraft(owner.client);
    expect(deletable.ok).toBe(true);
    if (deletable.ok) {
      const deleted = await deleteBranchDraft(deletable.data.id, owner.client);
      expect(deleted.ok).toBe(true);
      const absent = await getBranchDraft(deletable.data.id, owner.client);
      expect(absent.ok).toBe(false);
    }

    const finalCollaborators = await getDraftCollaborators(main.data.id, owner.client);
    expect(finalCollaborators.ok).toBe(true);
    },
  );
});
