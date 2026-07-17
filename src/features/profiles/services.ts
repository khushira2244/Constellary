import { requireCurrentUser } from "@/lib/auth/current-user";
import { databaseFailure, fail, ok, type ServiceResult } from "@/lib/services/result";
import type { AppSupabaseClient, Profile } from "@/types/database";

export async function getCurrentProfile(
  client: AppSupabaseClient,
): Promise<ServiceResult<Profile | null>> {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.data.id)
    .maybeSingle();
  if (error) return databaseFailure(error.message);
  return ok(data);
}

export async function ensureCurrentProfile(
  client: AppSupabaseClient,
): Promise<ServiceResult<Profile>> {
  const profile = await getCurrentProfile(client);
  if (!profile.ok) return profile;
  if (!profile.data) {
    return fail(
      "PROFILE_MISSING",
      "The auth profile trigger did not create this user's profile. Normal users cannot bypass RLS to create it.",
    );
  }
  return ok(profile.data);
}
