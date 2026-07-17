import type { User } from "@supabase/supabase-js";

import { fail, ok, type ServiceResult } from "@/lib/services/result";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/database";

const clientFor = async (client?: AppSupabaseClient) =>
  client ?? (await createServerSupabaseClient());

export async function getCurrentUser(
  client?: AppSupabaseClient,
): Promise<ServiceResult<User | null>> {
  try {
    const supabase = await clientFor(client);
    const { data, error } = await supabase.auth.getUser();
    if (error) return fail("AUTH_REQUIRED", "The session is not authenticated.", error.message);
    return ok(data.user);
  } catch (error) {
    return fail(
      "CONFIGURATION_ERROR",
      "Supabase authentication is not configured.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function requireCurrentUser(
  client?: AppSupabaseClient,
): Promise<ServiceResult<User>> {
  const result = await getCurrentUser(client);
  if (!result.ok) return result;
  if (!result.data) return fail("AUTH_REQUIRED", "Authentication is required.");
  return ok(result.data);
}
