import Link from "next/link";

import { getCurrentProfile } from "@/features/profiles/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createFreshMainBranch } from "@/app/dashboard-actions";

function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "C";
}

export async function AuthenticatedHeader() {
  const client = await createServerSupabaseClient();
  const profile = await getCurrentProfile(client);
  const name = profile.ok
    ? profile.data?.display_name ?? profile.data?.username ?? "Researcher"
    : "Researcher";

  return (
    <header className="authenticated-header">
      <Link className="authenticated-header__brand" href="/">
        <span className="constellary-mark" aria-hidden="true">✦</span>
        Constellary
      </Link>
      <nav className="authenticated-header__nav" aria-label="Primary navigation">
        <Link href="/">Home</Link>
        <form action={createFreshMainBranch}>
          <button className="header-create" type="submit">
            <span aria-hidden="true">＋</span> Create Branch
          </button>
        </form>
        <details className="profile-control">
          <summary aria-label={`Profile menu for ${name}`}>{initials(name)}</summary>
          <div className="profile-menu">
            <strong>{name}</strong>
            <SignOutButton />
          </div>
        </details>
      </nav>
    </header>
  );
}
