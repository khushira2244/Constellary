import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../supabase/database.types";

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Integration tests require ${name}.`);
  return value;
};

export const localUrl = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

export const createTestAdmin = () =>
  createClient<Database>(localUrl(), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export const createAnonymousClient = () =>
  createClient<Database>(
    localUrl(),
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

export async function createTestUser(
  admin: SupabaseClient<Database>,
  label: string,
) {
  const email = `block1-${label}-${crypto.randomUUID()}@constellary.test`;
  const password = `Test-${crypto.randomUUID()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Block 1 ${label}` },
  });
  if (error || !data.user) throw error ?? new Error("Could not create test user.");

  const client = createAnonymousClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { id: data.user.id, email, client };
}

export async function cleanupTestUsers(
  admin: SupabaseClient<Database>,
  userIds: string[],
) {
  for (const id of userIds.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;
  }
}

export async function createConfirmedBranch(
  client: SupabaseClient<Database>,
  userId: string,
  privacy: Database["public"]["Enums"]["privacy_level"],
  title: string,
) {
  const { data: draft, error: draftError } = await client
    .from("branch_drafts")
    .insert({
      creator_id: userId,
      title,
      original_idea: `${title} original idea`,
      origin_type: "own_idea",
      short_summary: `${title} approved short summary`,
      privacy,
    })
    .select("id")
    .single();
  if (draftError) throw draftError;
  const { data, error } = await client.rpc("confirm_branch_draft", {
    draft_id: draft.id,
  });
  if (error) throw error;
  const branchId = (data as { branch_id: string }).branch_id;
  return { branchId, draftId: draft.id };
}
