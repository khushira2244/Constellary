import { redirect } from "next/navigation";

import { safeInternalReturnPath } from "@/features/auth/model";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const query = await searchParams;
  const returnTo = safeInternalReturnPath(
    Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo,
  );
  const client = await createServerSupabaseClient();
  const user = await getCurrentUser(client);

  if (user.ok && user.data) redirect(returnTo);

  return <SignupForm returnTo={returnTo} />;
}
