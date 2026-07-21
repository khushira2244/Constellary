import { NextRequest, NextResponse } from "next/server";

import { safeInternalReturnPath } from "@/features/auth/model";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnTo = safeInternalReturnPath(
    request.nextUrl.searchParams.get("returnTo"),
  );

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(returnTo, request.url));
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("confirmation", "failed");
  return NextResponse.redirect(login);
}
