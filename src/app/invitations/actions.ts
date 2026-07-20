"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function acceptInvitationAction(invitationId: string) {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc(
    "accept_collaboration_invite_by_id" as never,
    { invitation_id: invitationId } as never,
  );
  if (error) redirect(`/invitations?error=${encodeURIComponent(error.message)}`);
  redirect(`/branches/${data as string}/community#comments`);
}
