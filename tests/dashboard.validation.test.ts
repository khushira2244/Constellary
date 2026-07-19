import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import {
  activityLabel,
  currentDraftStep,
  safeArchiveFilters,
} from "@/features/dashboard/model";

describe("Home dashboard model", () => {
  test("uses readable activity labels without exposing event metadata", () => {
    expect(activityLabel("branch_confirmed")).toBe("Confirmed a branch");
    expect(activityLabel("ai_content_approved")).toBe("Approved an AI contribution");
    expect(activityLabel("unknown_internal_event")).toBe("Updated research");
  });

  test("finds the first incomplete creation step", () => {
    expect(currentDraftStep({ title: true, originalIdea: true })).toBe("Origin");
    expect(currentDraftStep({})).toBe("Title");
    expect(currentDraftStep({
      title: true,
      originalIdea: true,
      origin: true,
      shortSummary: true,
      previousWork: true,
      people: true,
      privacyAndAI: true,
    })).toBe("Review");
  });

  test("normalizes server archive filters and bounds title search", () => {
    const filters = safeArchiveFilters({
      q: `  ${"memory".repeat(30)}  `,
      status: ["testing", "active"],
      privacy: "private",
      year: "2026",
      month: "7",
      relationship: "subbranch",
    });
    expect(filters.query).toHaveLength(100);
    expect(filters).toMatchObject({
      status: "testing",
      privacy: "private",
      year: "2026",
      month: "7",
      relationship: "subbranch",
    });
  });
});

describe("Create versus Resume route regression", () => {
  const project = process.cwd();

  test("GET /branches/new does not create or resume a draft", () => {
    const source = readFileSync(resolve(project, "src/app/branches/new/page.tsx"), "utf8");
    expect(source).not.toContain("createMainBranchDraft");
    expect(source).not.toContain("getLatestEditableMainBranchDraft");
    expect(source).not.toContain("redirect(");
  });

  test("Create Branch is an explicit server action that creates a fresh draft", () => {
    const source = readFileSync(resolve(project, "src/app/dashboard-actions.ts"), "utf8");
    expect(source).toContain('"use server"');
    expect(source).toContain("createMainBranchDraft(client)");
    expect(source).toContain("/branches/drafts/${created.data.id}/workspace");
  });

  test("Resume points to the selected draft id", () => {
    const source = readFileSync(resolve(project, "src/components/layout/research-drawer.tsx"), "utf8");
    expect(source).toContain("/branches/drafts/${draft.id}/workspace");
    expect(source).toContain("drafts.slice(0, 3)");
  });

  test("archive filters remain server query constraints", () => {
    const source = readFileSync(resolve(project, "src/features/dashboard/services.ts"), "utf8");
    expect(source).toContain('.ilike("title"');
    expect(source).toContain('branchesQuery.eq(');
    expect(source).toContain('.gte("updated_at"');
    expect(source).toContain('.is("parent_branch_id", null)');
  });
});

describe("corrected authenticated Home and header", () => {
  const project = process.cwd();
  const header = readFileSync(resolve(project, "src/components/layout/authenticated-header.tsx"), "utf8");
  const headerControls = readFileSync(resolve(project, "src/components/layout/header-route-controls.tsx"), "utf8");
  const drawer = readFileSync(resolve(project, "src/components/layout/research-drawer.tsx"), "utf8");
  const home = readFileSync(resolve(project, "src/app/page.tsx"), "utf8");
  const branchView = readFileSync(resolve(project, "src/app/branches/[branchId]/branch-view.tsx"), "utf8");

  test("anonymous header renders only brand and Sign in", () => {
    expect(header).toContain('if (!isAuthenticated)');
    expect(header).toContain('href="/login">Sign in');
    const anonymousBlock = header.split("if (!isAuthenticated)")[1]?.split("const [profile")[0] ?? "";
    expect(anonymousBlock).not.toContain("Create Branch");
    expect(anonymousBlock).not.toContain("ResearchDrawer");
    expect(anonymousBlock).not.toContain("profile-control");
  });

  test("authenticated controls depend on server-derived profile capability", () => {
    expect(header).toContain("const canCreateBranch = Boolean(profileData)");
    expect(header).toContain("canCreateBranch={canCreateBranch}");
    expect(headerControls).toContain("{canCreateBranch ? (");
    expect(headerControls).toContain('aria-label="Create Branch"');
    expect(header).toContain("<ResearchDrawer");
    expect(headerControls).toContain('href="/"');
  });

  test("workspace control uses only the validated server target", () => {
    const services = readFileSync(resolve(project, "src/features/dashboard/services.ts"), "utf8");
    expect(headerControls).not.toContain('aria-label="Open Workspace"');
    expect(headerControls).not.toContain(">W</");
    expect(services).toContain('.eq("owner_id", user.data.id)');
    expect(services).toContain('.eq("role", "editor")');
    expect(services).toContain('canUserAccessBranch(workspaceCandidate.id, "edit", client)');
    expect(services.indexOf('.eq("owner_id", user.data.id)')).toBeLessThan(
      services.indexOf('.eq("role", "editor")'),
    );
  });

  test("anonymous header receives neither creation nor workspace controls", () => {
    const anonymousBlock = header.split("if (!isAuthenticated)")[1]?.split("const [profile")[0] ?? "";
    expect(anonymousBlock).not.toContain('aria-label="Create Branch"');
    expect(anonymousBlock).not.toContain('aria-label="Open Workspace"');
  });

  test("header active state is pathname-derived and controls stay compact", () => {
    expect(headerControls).toContain("usePathname()");
    expect(headerControls).toContain('const homeActive = pathname === "/"');
    expect(headerControls).toContain('pathname === "/branches/new"');
    expect(headerControls).toContain("header-control--active");
    expect(headerControls).not.toContain("const homeActive = true");
    const css = readFileSync(resolve(project, "src/app/globals.css"), "utf8");
    expect(css).toContain(".header-route-controls { display: flex; align-items: center; gap: 7px;");
  });

  test("Home alone owns the optimized atmospheric background and translucent sticky header", () => {
    const css = readFileSync(resolve(project, "src/app/globals.css"), "utf8");
    expect(home).toContain('className="home-atmosphere"');
    expect(css).toContain('url("/constellary-home-space.webp")');
    expect(css).toContain("background-size: cover");
    expect(css).toContain("background-position: center top");
    expect(css).toContain("background-repeat: no-repeat");
    expect(css).toContain("position: sticky");
    expect(css).toContain(".home-atmosphere > .authenticated-header");
    expect(css).toContain("rgba(5, 9, 16, .66)");
  });

  test("branch mutation controls require edit capability", () => {
    expect(branchView).toContain("{data.capabilities.canEdit ? (");
    expect(branchView).toContain("Edit Summary");
    expect(branchView).not.toContain("Open research tree edit view");
    expect(branchView).toContain("Create a subbranch from");
    expect(branchView).not.toContain("clientRole");
    expect(branchView).not.toContain("searchParams.role");
  });

  test("drawer closes outside, on Escape, and on navigation", () => {
    expect(drawer).toContain('event.key === "Escape"');
    expect(drawer).toContain("event.target === event.currentTarget");
    expect(drawer).toContain("onClick={() => setOpen(false)}");
  });

  test("drawer data is bounded and permission-safe service data", () => {
    expect(drawer).toContain("drafts.slice(0, 3)");
    expect(drawer).toContain("recentBranches.slice(0, 5)");
    const services = readFileSync(resolve(project, "src/features/dashboard/services.ts"), "utf8");
    expect(services).toContain('.eq("creator_id", user.data.id)');
    expect(services).toContain('client.from("branches")');
  });

  test("Home removes Recent Work and keeps search only in archive", () => {
    expect(home).not.toContain("Recent Work");
    expect(home).toContain("Featured Branches");
    expect(home).toContain("Feature important branches from Branch View to keep them here.");
    expect(home.match(/Search titles/g)).toHaveLength(1);
    expect(header).not.toContain("Search");
    expect(drawer).not.toContain("Search");
  });

  test("profile identity has real counts, no product tagline, and owner-only editing", () => {
    const services = readFileSync(resolve(project, "src/features/dashboard/services.ts"), "utf8");
    expect(home).not.toContain("Proof of how work grows.");
    expect(home).toContain("data.profile.counts.accessibleBranches");
    expect(home).toContain("data.profile.counts.collaborators");
    expect(home).toContain("data.profile.counts.linkedBranches");
    expect(home).toContain("data.profile.canEdit");
    expect(home).toContain('className="profile-edit-icon"');
    expect(home).toContain('aria-label="Edit Profile"');
    expect(home).not.toContain('className="button button--secondary dashboard-button-link" href="/profile"');
    expect(services).toContain("accessibleBranches: accessible.length");
    expect(services).toContain("collaborators: visibleCollaborators.size");
    expect(services).toContain("linkedBranches: related.data.links.length");
    expect(services).toContain("canEdit: profile.data?.id === user.data.id");
  });

  test("drafts stay in the private drawer and outside the main Home profile", () => {
    expect(drawer).toContain("<h2>Drafts</h2>");
    expect(drawer).toContain("/branches/drafts/${draft.id}/workspace");
    expect(home).not.toContain("data.drafts");
    expect(home).not.toContain("unfinished draft");
  });

  test("featured cards come from personal database rows and keep the empty state", () => {
    const services = readFileSync(resolve(project, "src/features/dashboard/services.ts"), "utf8");
    expect(services).toContain('.from("featured_branches")');
    expect(services).toContain('.eq("user_id", user.data.id)');
    expect(services).toContain(".limit(3)");
    expect(home).toContain("data.featuredBranches.length");
    expect(home).toContain("data.featuredBranches.map");
    expect(home).toContain("No featured branches yet");
    expect(home).toContain("Open Branch");
    expect(home).not.toContain("Open Workspace button");
  });

  test("feature control is authenticated, personal, and server authorized", () => {
    const featureButton = readFileSync(resolve(project, "src/components/branches/feature-branch-button.tsx"), "utf8");
    const featureService = readFileSync(resolve(project, "src/features/featured-branches/services.ts"), "utf8");
    expect(branchView).toContain("data.capabilities.authenticated");
    expect(featureButton).toContain("Feature branch");
    expect(featureButton).toContain("Remove from Featured Branches");
    expect(featureService).toContain("requireCurrentUser(client)");
    expect(featureService).toContain('canUserAccessBranch(branchId, "view", client)');
    expect(featureService).toContain('onConflict: "user_id,branch_id"');
    expect(featureService).toContain('.eq("user_id", user.data.id)');
  });

  test("demo seed owns exactly three deterministic featured rows", () => {
    const seed = readFileSync(resolve(project, "scripts/seed-demo.ts"), "utf8");
    expect(seed).toContain("branch_id: ids.featured");
    expect(seed).toContain("branch_id: ids.notebooks");
    expect(seed).toContain("branch_id: ids.traceability");
    expect(seed).toContain('onConflict: "user_id,branch_id"');
    expect(seed).toContain("counts.featured_branches !== 3");
  });
});
