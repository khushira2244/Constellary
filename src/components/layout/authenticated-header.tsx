import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { getHeaderNavigationData } from "@/features/dashboard/services";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCurrentProfile } from "@/features/profiles/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ResearchDrawer } from "./research-drawer";
import { HeaderRouteControls } from "./header-route-controls";

function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "C";
}

export async function AuthenticatedHeader() {
  const client = await createServerSupabaseClient();
  const user = await getCurrentUser(client);
  const isAuthenticated = user.ok && Boolean(user.data);

  if (!isAuthenticated) {
    return (
      <header className="authenticated-header">
        <Link className="authenticated-header__brand" href="/">
          <span className="constellary-mark" aria-hidden="true">✦</span>Constellary
        </Link>
        <nav className="authenticated-header__nav" aria-label="Primary navigation">
          <Link className="header-sign-in" href="/login">Sign in</Link>
        </nav>
      </header>
    );
  }

  const [profile, navigation] = await Promise.all([
    getCurrentProfile(client),
    getHeaderNavigationData(client),
  ]);
  const profileData = profile.ok ? profile.data : null;
  const name = profileData?.display_name ?? profileData?.username ?? "Researcher";
  const canCreateBranch = Boolean(profileData);
  const drawer = navigation.ok
    ? navigation.data
    : { drafts: [], recentBranches: [], workspaceTarget: null };

  return (
    <header className="authenticated-header">
      <div className="authenticated-header__left">
        <ResearchDrawer drafts={drawer.drafts} recentBranches={drawer.recentBranches} />
        <Link className="authenticated-header__brand" href="/">
          <span className="constellary-mark" aria-hidden="true">✦</span>Constellary
        </Link>
      </div>
      <nav className="authenticated-header__nav" aria-label="Primary navigation">
        <HeaderRouteControls
          canCreateBranch={canCreateBranch}
        />
        <details className="profile-control">
          <summary aria-label={`Profile menu for ${name}`}>
            {profileData?.avatar_url
              ? <span className="profile-avatar-image" style={{ backgroundImage: `url("${profileData.avatar_url}")` }} />
              : initials(name)}
          </summary>
          <div className="profile-menu">
            <strong>{name}</strong>
            <Link href="/#profile">View profile</Link>
            <Link href="/invitations">Invitations</Link>
            <SignOutButton />
          </div>
        </details>
      </nav>
    </header>
  );
}
