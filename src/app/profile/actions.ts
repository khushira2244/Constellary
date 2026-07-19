"use server";

import { redirect } from "next/navigation";

import { updateCurrentProfile } from "@/features/profiles/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateProfileAction(formData: FormData) {
  const client = await createServerSupabaseClient();
  const result = await updateCurrentProfile({
    displayName: String(formData.get("displayName") ?? ""),
    headline: String(formData.get("headline") ?? "") || null,
    bio: String(formData.get("bio") ?? "") || null,
    discipline: String(formData.get("discipline") ?? "") || null,
    avatarUrl: String(formData.get("avatarUrl") ?? "") || null,
  }, client);
  redirect(result.ok ? "/#profile" : "/profile?error=1");
}
