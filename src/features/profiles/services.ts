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

export async function updateCurrentProfile(
  values: {
    displayName: string;
    headline: string | null;
    bio: string | null;
    discipline: string | null;
    avatarUrl: string | null;
  },
  client: AppSupabaseClient,
): Promise<ServiceResult<Profile>> {
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const displayName = values.displayName.trim();
  if (!displayName || displayName.length > 100) {
    return fail("VALIDATION_ERROR", "Display name must be between 1 and 100 characters.");
  }
  const limited = (value: string | null, maximum: number) => {
    const clean = value?.trim() || null;
    return clean && clean.length <= maximum ? clean : clean ? undefined : null;
  };
  const headline = limited(values.headline, 160);
  const bio = limited(values.bio, 600);
  const discipline = limited(values.discipline, 200);
  const avatarUrl = limited(values.avatarUrl, 500);
  if ([headline, bio, discipline, avatarUrl].includes(undefined)) {
    return fail("VALIDATION_ERROR", "One or more profile fields are too long.");
  }
  const { data, error } = await client.from("profiles").update({
    display_name: displayName,
    headline,
    bio,
    discipline,
    avatar_url: avatarUrl,
  }).eq("id", user.data.id).select("*").single();
  if (error) return databaseFailure(error.message);
  return ok(data);
}
