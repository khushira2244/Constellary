import Link from "next/link";

import { AuthenticatedHeader } from "@/components/layout/authenticated-header";
import { ErrorState } from "@/components/ui/feedback";
import { getCurrentProfile } from "@/features/profiles/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateProfileAction } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const client = await createServerSupabaseClient();
  const profile = await getCurrentProfile(client);
  if (!profile.ok || !profile.data) {
    return <><AuthenticatedHeader /><main className="centered-state"><ErrorState title="Profile unavailable" message="Your profile could not be loaded safely." /></main></>;
  }
  const error = (await searchParams).error;
  return (
    <>
      <AuthenticatedHeader />
      <main className="profile-edit-shell">
        <form className="panel profile-edit-panel" action={updateProfileAction}>
          <span className="dashboard-kicker">Personal profile</span>
          <h1>Edit Profile</h1>
          <p>Keep this compact. These details appear only where your profile is permitted to be read.</p>
          {error ? <div className="auth-error">Profile changes could not be saved. Check the field lengths and try again.</div> : null}
          <label className="field"><span className="field__label">Display name</span><input className="input" name="displayName" required maxLength={100} defaultValue={profile.data.display_name} /></label>
          <label className="field"><span className="field__label">Role or job title</span><input className="input" name="headline" maxLength={160} defaultValue={profile.data.headline ?? ""} /></label>
          <label className="field"><span className="field__label">Short bio</span><textarea className="textarea textarea--compact" name="bio" maxLength={600} defaultValue={profile.data.bio ?? ""} /></label>
          <label className="field"><span className="field__label">Research focus</span><span className="field__hint">Separate focus areas with commas.</span><input className="input" name="discipline" maxLength={200} defaultValue={profile.data.discipline ?? ""} /></label>
          <label className="field"><span className="field__label">Avatar URL</span><input className="input" name="avatarUrl" type="url" maxLength={500} defaultValue={profile.data.avatar_url ?? ""} /></label>
          <div className="panel-actions"><Link className="button button--ghost dashboard-button-link" href="/#profile">Cancel</Link><button className="button button--primary" type="submit">Save Profile</button></div>
        </form>
      </main>
    </>
  );
}
