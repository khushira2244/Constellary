import { createClient, type User } from "@supabase/supabase-js";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ids = {
  featured: "d0000000-0000-4000-8000-000000000001",
  decay: "d0000000-0000-4000-8000-000000000002",
  handover: "d0000000-0000-4000-8000-000000000003",
  compression: "d0000000-0000-4000-8000-000000000004",
  nasa: "d0000000-0000-4000-8000-000000000005",
  notebooks: "d0000000-0000-4000-8000-000000000006",
  traceability: "d0000000-0000-4000-8000-000000000007",
  cybersecurity: "d0000000-0000-4000-8000-000000000008",
  evidenceGraph: "d0000000-0000-4000-8000-000000000009",
  draft: "d0000000-0000-4000-8000-000000000010",
} as const;

const at = (daysAgo: number, hours = 12) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(hours, 0, 0, 0);
  return date.toISOString();
};
const uuid = (group: number, index: number) =>
  `d${String(group).padStart(3, "0")}0000-0000-4000-8000-${String(index).padStart(12, "0")}`;

type SeedReport = Record<string, { created: number; updated: number; reused: number; skipped: number }>;
const report: SeedReport = {};
const bucket = (name: string) =>
  report[name] ??= { created: 0, updated: 0, reused: 0, skipped: 0 };

async function allUsers() {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw result.error;
    users.push(...result.data.users);
    if (result.data.users.length < 1000) return users;
  }
}

async function ensureUser(
  role: "owner" | "editor" | "commenter" | "viewer",
  emailVariable: string,
  passwordVariable: string,
) {
  const email = required(emailVariable).toLowerCase();
  const existing = (await allUsers()).find((user) => user.email?.toLowerCase() === email);
  if (existing) {
    bucket("auth.users").reused += 1;
    console.log(`[user:${role}] reused ${email}`);
    return existing;
  }
  const password = process.env[passwordVariable]?.trim();
  if (!password) {
    bucket("auth.users").skipped += 1;
    throw new Error(`${email} does not exist and ${passwordVariable} was not provided.`);
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Demo ${role[0].toUpperCase()}${role.slice(1)}`,
      user_name: `demo_${role}`,
    },
  });
  if (created.error) throw created.error;
  bucket("auth.users").created += 1;
  console.log(`[user:${role}] created ${email}`);
  return created.data.user;
}

async function upsertRows(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const existing = await admin.from(table).select("id").in("id", rows.map((row) => row.id as string));
  if (existing.error) throw new Error(`${table}: ${existing.error.message}`);
  const known = new Set((existing.data ?? []).map((row) => row.id));
  const result = await admin.from(table).upsert(rows, { onConflict: "id" });
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  const stats = bucket(table);
  stats.created += rows.filter((row) => !known.has(row.id as string)).length;
  stats.updated += rows.filter((row) => known.has(row.id as string)).length;
}

async function preserveBranches(rows: Record<string, unknown>[]) {
  const existing = await admin.from("branches").select("id").in("id", rows.map((row) => row.id as string));
  if (existing.error) throw existing.error;
  const known = new Set((existing.data ?? []).map((row) => row.id));
  const missing = rows.filter((row) => !known.has(row.id as string));
  if (missing.length) {
    const inserted = await admin.from("branches").insert(missing);
    if (inserted.error) throw inserted.error;
  }
  bucket("branches").created += missing.length;
  bucket("branches").reused += rows.length - missing.length;
}

async function main() {
  const owner = await ensureUser("owner", "DEMO_OWNER_EMAIL", "DEMO_OWNER_PASSWORD");
  const editor = await ensureUser("editor", "DEMO_EDITOR_EMAIL", "DEMO_EDITOR_PASSWORD");
  const commenter = await ensureUser("commenter", "DEMO_COMMENTER_EMAIL", "DEMO_COMMENTER_PASSWORD");
  const viewer = await ensureUser("viewer", "DEMO_VIEWER_EMAIL", "DEMO_VIEWER_PASSWORD");
  const users = { owner, editor, commenter, viewer };

  await upsertRows("profiles", Object.entries(users).map(([role, user]) => ({
    id: user.id,
    username: `demo_${role}_${user.id.replaceAll("-", "").slice(0, 8)}`,
    display_name: `Demo ${role[0].toUpperCase()}${role.slice(1)}`,
    headline: `${role} account for Constellary judging`,
    discipline: "Research provenance",
    bio: "Controlled demo identity for the Constellary judging environment.",
    preferred_language: "en",
    is_verified: true,
  })));

  const rootIdea = "Can a provenance-aware memory system preserve how mission knowledge changes across long-duration space research?";
  const branch = (
    id: string,
    title: string,
    originalIdea: string,
    parentBranchId: string | null,
    status: string,
    privacy: "private" | "public",
    createdAt: string,
    originDetails: Record<string, string> = {},
    archivedAt: string | null = null,
  ) => ({
    id,
    owner_id: owner.id,
    parent_branch_id: parentBranchId,
    title,
    original_idea: originalIdea,
    origin_type: parentBranchId ? "existing_branch" : "own_idea",
    origin_details: originDetails,
    status,
    privacy,
    language: "en",
    original_idea_locked_at: createdAt,
    created_at: createdAt,
    updated_at: createdAt,
    archived_at: archivedAt,
    ai_enabled: true,
  });

  await preserveBranches([
    branch(ids.featured, "Adaptive Memory Models for Long-Duration Space Missions", rootIdea, null, "exploring", "private", at(18)),
    branch(ids.decay, "Memory Decay Under Communication Delay", "Long communication delays may cause mission knowledge to be revised without immediate external correction.", ids.featured, "testing", "private", at(15), { branch_topic: "Memory decay under delayed communication" }),
    branch(ids.handover, "Human–AI Knowledge Handover", "Long missions need an attributable handover process between crew judgment and AI-supported records.", ids.featured, "active", "private", at(13), { branch_topic: "Human–AI knowledge handover" }),
    branch(ids.compression, "Mission Knowledge Compression", "Mission archives must remain usable when bandwidth and attention are constrained.", ids.featured, "needs_evidence", "private", at(11), { branch_topic: "Mission knowledge compression" }),
    branch(ids.nasa, "NASA Analog Mission Data", "Analog mission records can test whether the memory-decay model reflects real operational handovers.", ids.decay, "awaiting_review", "private", at(8), { branch_topic: "NASA analog mission evidence" }),
    branch(ids.notebooks, "Provenance-Aware Scientific Notebooks", "How can scientific notebooks preserve the reasoning behind each revision?", null, "active", "public", at(28)),
    branch(ids.traceability, "Crew Decision Traceability", "How can mission decisions remain explainable across changing teams and evidence?", null, "exploring", "public", at(24)),
    branch(ids.cybersecurity, "Spacecraft Cybersecurity Threat Mapping", "Can provenance reveal how spacecraft threat assumptions change during mission planning?", null, "testing", "private", at(3)),
    branch(ids.evidenceGraph, "Distributed Research Evidence Graph", "Can distributed evidence retain attribution while research teams change?", null, "archived_with_learning", "public", at(390), {}, at(300)),
  ]);

  const visibleBranches = [
    ids.featured, ids.decay, ids.handover, ids.compression, ids.nasa,
    ids.notebooks, ids.traceability, ids.cybersecurity, ids.evidenceGraph,
  ];
  const titles = new Map([
    [ids.featured, "Adaptive Memory Models for Long-Duration Space Missions"],
    [ids.decay, "Memory Decay Under Communication Delay"],
    [ids.handover, "Human–AI Knowledge Handover"],
    [ids.compression, "Mission Knowledge Compression"],
    [ids.nasa, "NASA Analog Mission Data"],
    [ids.notebooks, "Provenance-Aware Scientific Notebooks"],
    [ids.traceability, "Crew Decision Traceability"],
    [ids.cybersecurity, "Spacecraft Cybersecurity Threat Mapping"],
    [ids.evidenceGraph, "Distributed Research Evidence Graph"],
  ]);
  const summaries = visibleBranches.flatMap((branchId, index) => {
    const title = titles.get(branchId)!;
    return [
      {
        id: uuid(100, index * 2 + 1), branch_id: branchId, summary_type: "short",
        content: `${title} examines a focused part of accountable, long-duration research memory.`,
        status: "approved", visibility: "inherit", created_by: owner.id, approved_by: owner.id,
        approved_at: at(7 - Math.min(index, 6)), is_current: true, created_at: at(12 - Math.min(index, 9)),
      },
      {
        id: uuid(100, index * 2 + 2), branch_id: branchId, summary_type: "full",
        content: `${title} is represented as a real demo research branch. It records how the question developed, which evidence influenced it, and which human or AI contribution changed the working direction. This seeded summary is demonstration content and does not claim a completed scientific result.`,
        status: "approved", visibility: "branch_members", created_by: owner.id, approved_by: owner.id,
        approved_at: at(6 - Math.min(index, 5)), is_current: true, created_at: at(11 - Math.min(index, 8)),
      },
    ];
  });
  await upsertRows("branch_summaries", summaries);

  const noteRows = [
    [ids.featured, "Open research questions", "Define which provenance signals matter during mission handover."],
    [ids.featured, "Evaluation criteria", "Compare recall quality, attribution quality, and correction latency."],
    [ids.decay, "Delay model", "Separate communication delay from ordinary forgetting."],
    [ids.decay, "Observation plan", "Track when evidence arrives after a decision has already changed."],
    [ids.handover, "Crew review", "Require visible human acceptance before AI text becomes branch content."],
    [ids.compression, "Compression risk", "Preserve dissenting evidence when producing compact mission summaries."],
    [ids.nasa, "Analog dataset checklist", "Verify data permissions and provenance before analysis."],
    [ids.cybersecurity, "Threat assumptions", "Record who changed each threat likelihood and why."],
  ].map(([branchId, title, note], index) => ({
    id: uuid(200, index + 1), branch_id: branchId, item_type: "note", title,
    content: { text: note }, visibility: "inherit", author_id: index % 3 === 0 ? editor.id : owner.id,
    position: index, created_at: at(9 - Math.min(index, 7)),
  }));
  await upsertRows("workspace_items", noteRows);

  const sources = [
    [ids.featured, "Mission memory source — verification required", "Demo locator: replace with a verified mission-memory source before research use."],
    [ids.decay, "Communication-delay evidence — verification required", "Demo locator: attach a verified communications source before analysis."],
    [ids.handover, "Human–AI handover evidence — verification required", "Demo locator: attach a verified human-factors source before analysis."],
    [ids.compression, "Knowledge-compression evidence — verification required", "Demo locator: attach a verified information-science source before analysis."],
    [ids.nasa, "NASA analog mission evidence — verification required", "Demo locator: verify the applicable NASA dataset and access terms."],
    [ids.cybersecurity, "Spacecraft cybersecurity evidence — verification required", "Demo locator: attach an authoritative security source before analysis."],
  ].map(([branchId, title, citation], index) => ({
    id: uuid(300, index + 1), branch_id: branchId, source_type: "external_reference",
    title, authors: [], citation_text: citation, relationship_type: "evidence_candidate",
    description: "Honest demonstration placeholder; not an academic citation.", visibility: "inherit",
    added_by: owner.id, created_at: at(10 - index),
  }));
  await upsertRows("sources", sources);

  await upsertRows("branch_links", [
    {
      id: uuid(400, 1), source_branch_id: ids.featured, target_branch_id: ids.notebooks,
      relationship_type: "inspired_by", relationship_note: "Notebook provenance informs revision tracking.",
      imported_summary_id: uuid(100, 11), created_by: owner.id, created_at: at(7),
    },
    {
      id: uuid(400, 2), source_branch_id: ids.handover, target_branch_id: ids.traceability,
      relationship_type: "references", relationship_note: "Decision traceability supports accountable handover.",
      imported_summary_id: uuid(100, 13), created_by: owner.id, created_at: at(5),
    },
  ]);

  const tree = [ids.featured, ids.decay, ids.handover, ids.compression, ids.nasa];
  const roles = [
    [owner.id, "owner"], [editor.id, "editor"], [commenter.id, "commenter"], [viewer.id, "viewer"],
  ];
  await upsertRows("branch_collaborators", tree.flatMap((branchId, branchIndex) =>
    roles.map(([userId, role], roleIndex) => ({
      id: uuid(500 + branchIndex, roleIndex + 1), branch_id: branchId, user_id: userId,
      role, access_scope: "entire_branch", added_by: owner.id, created_at: at(14 - branchIndex),
    })),
  ));

  const comments = [
    [ids.featured, editor.id, "The evaluation criteria should distinguish delayed correction from memory loss."],
    [ids.featured, commenter.id, "Could the branch record disagreement between crew members explicitly?"],
    [ids.decay, editor.id, "The delay model needs a measurable correction-latency baseline."],
    [ids.handover, commenter.id, "Human approval should remain visible after an AI-assisted rewrite."],
    [ids.nasa, owner.id, "Dataset permissions must be verified before using any analog mission record."],
  ].map(([branchId, authorId, content], index) => ({
    id: uuid(600, index + 1), branch_id: branchId, target_type: "branch",
    target_id: branchId, author_id: authorId, content, status: "open",
    visibility: "inherit", created_at: at(6 - index),
  }));
  await upsertRows("comments", comments);

  await upsertRows("ai_contributions", [
    {
      id: uuid(700, 1), branch_id: ids.featured, target_type: "branch", target_id: ids.featured,
      contribution_type: "summary_draft", model_name: "seeded-demo-model",
      input_context_summary: "Selected demo notes and approved short summary",
      generated_content: "Seeded demonstration output: proposed summary structure for human review.",
      requested_by: owner.id, approval_status: "approved", approved_by: owner.id,
      approved_at: at(3), created_at: at(4),
    },
    {
      id: uuid(700, 2), branch_id: ids.decay, target_type: "branch", target_id: ids.decay,
      contribution_type: "idea_suggestion", model_name: "seeded-demo-model",
      input_context_summary: "Selected delay-model note",
      generated_content: "Seeded demonstration output: a proposed direction that the researcher rejected.",
      requested_by: editor.id, approval_status: "rejected", created_at: at(3),
    },
    {
      id: uuid(700, 3), branch_id: ids.handover, target_type: "branch", target_id: ids.handover,
      contribution_type: "rewrite", model_name: "seeded-demo-model",
      input_context_summary: "Selected crew-review note",
      generated_content: "Seeded demonstration output awaiting explicit human review.",
      requested_by: editor.id, approval_status: "generated", created_at: at(2),
    },
  ]);

  const eventTypes = [
    "branch_confirmed", "original_idea_locked", "summary_created", "workspace_item_created",
    "source_added", "branch_linked", "collaborator_joined", "comment_added",
    "ai_content_generated", "ai_content_approved", "privacy_changed", "status_changed",
  ];
  await upsertRows("activity_events", eventTypes.map((eventType, index) => ({
    id: uuid(800, index + 1), branch_id: index > 7 ? ids.decay : ids.featured,
    actor_id: index % 4 === 0 ? editor.id : owner.id, event_type: eventType,
    entity_type: index < 2 ? "branch" : "demo_seed", entity_id: index < 2 ? ids.featured : null,
    metadata: { seeded_demo: true, sequence: index + 1 }, visibility: "branch_members",
    created_at: at(16 - index),
  })));

  await upsertRows("branch_drafts", [{
    id: ids.draft, creator_id: owner.id, parent_branch_id: null,
    title: "Radiation Event Knowledge Retention", original_idea: "How should mission memory preserve evolving radiation-event interpretations?",
    origin_type: "own_idea", origin_details: {}, short_summary: "An unfinished demonstration draft for the Home resume experience.",
    privacy: "private", language: "en", creation_progress: { title: true, originalIdea: true, origin: true, shortSummary: true },
    linked_branches_data: [], collaborators_data: [], ai_role_data: [],
    created_at: at(1), updated_at: at(1),
  }]);

  const counts: Record<string, number> = {};
  for (const table of [
    "profiles", "branch_drafts", "branches", "branch_links", "branch_summaries",
    "workspace_items", "sources", "branch_collaborators", "comments",
    "ai_contributions", "activity_events",
  ]) {
    const selectedIds = table === "profiles"
      ? Object.values(users).map((user) => user.id)
      : seededIdsFor(table);
    const count = await admin.from(table).select("*", { count: "exact", head: true })
      .in("id", selectedIds);
    if (count.error) throw count.error;
    counts[table] = count.count ?? 0;
  }

  const children = await admin.from("branches").select("id,parent_branch_id")
    .in("id", tree);
  if (children.error) throw children.error;
  const linkedChildren = (children.data ?? []).filter((row) =>
    row.id === ids.notebooks || row.id === ids.traceability);
  if (linkedChildren.length) throw new Error("Linked branches were incorrectly inserted into the branch tree.");

  console.log("\nSeed report");
  console.table(report);
  console.log("Seeded record counts");
  console.table(counts);
  console.log("Featured root:", ids.featured);
  console.log("Featured tree rows:", children.data?.length ?? 0);
  console.log("Files: skipped intentionally because no matching Storage objects were created.");
  console.log("Demo seed complete.");
}

function seededIdsFor(table: string) {
  const ranges: Record<string, string[]> = {
    profiles: [],
    branch_drafts: [ids.draft],
    branches: Object.values(ids).filter((id) => id !== ids.draft),
    branch_links: [uuid(400, 1), uuid(400, 2)],
    branch_summaries: Array.from({ length: 18 }, (_, index) => uuid(100, index + 1)),
    workspace_items: Array.from({ length: 8 }, (_, index) => uuid(200, index + 1)),
    sources: Array.from({ length: 6 }, (_, index) => uuid(300, index + 1)),
    branch_collaborators: Array.from({ length: 5 }, (_, branchIndex) =>
      Array.from({ length: 4 }, (_, roleIndex) => uuid(500 + branchIndex, roleIndex + 1))).flat(),
    comments: Array.from({ length: 5 }, (_, index) => uuid(600, index + 1)),
    ai_contributions: Array.from({ length: 3 }, (_, index) => uuid(700, index + 1)),
    activity_events: Array.from({ length: 12 }, (_, index) => uuid(800, index + 1)),
  };
  return ranges[table] ?? [];
}

main().catch((error) => {
  console.error(`Demo seed failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exitCode = 1;
});
