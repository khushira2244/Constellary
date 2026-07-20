import Link from "next/link";

import { AuthenticatedHeader } from "@/components/layout/authenticated-header";
import { FeatureBranchButton } from "@/components/branches/feature-branch-button";
import { ErrorState } from "@/components/ui/feedback";
import { WelcomePage } from "@/components/welcome/welcome-page";
import { safeArchiveFilters } from "@/features/dashboard/model";
import { getDashboardData } from "@/features/dashboard/services";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const date = (value: string) =>
  new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(value));

const statusLabel = (value: string) =>
  value.split("_").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const client = await createServerSupabaseClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return <WelcomePage />;

  const filters = safeArchiveFilters(params);
  const result = await getDashboardData(client, filters);

  if (!result.ok) {
    return (
      <div className="home-atmosphere">
        <AuthenticatedHeader />
        <main className="centered-state">
          <ErrorState title="Could not load Home" message="Your accessible research could not be loaded safely. Please try again." />
        </main>
      </div>
    );
  }
  const data = result.data;

  return (
    <div className="home-atmosphere">
      <AuthenticatedHeader />
      <main className="dashboard-shell">
        {params.dashboardError ? (
          <div className="dashboard-alert">That action could not be completed. Your existing research was not changed.</div>
        ) : null}

        <section className="profile-overview" id="profile">
          <div className="profile-overview__avatar" aria-hidden={data.profile.avatarUrl ? undefined : true}>
            {data.profile.avatarUrl
              ? <span
                  className="profile-avatar-image"
                  role="img"
                  aria-label={`${data.profile.displayName} profile`}
                  style={{ backgroundImage: `url("${data.profile.avatarUrl}")` }}
                />
              : data.profile.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="profile-overview__body">
            <h1>{data.profile.displayName}</h1>
            <p className="profile-overview__username">@{data.profile.username}</p>
            {data.profile.headline ? <p className="profile-overview__headline">{data.profile.headline}</p> : null}
            {data.profile.bio ? <p className="profile-overview__bio">{data.profile.bio}</p> : null}
            {data.profile.focusTags.length ? (
              <div className="profile-focus" aria-label="Research focus">
                {data.profile.focusTags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            ) : null}
            <dl className="profile-counts" aria-label="Accessible research counts">
              <div><dt>Branches</dt><dd>{data.profile.counts.accessibleBranches}</dd></div>
              <div><dt>Collaborators</dt><dd>{data.profile.counts.collaborators}</dd></div>
              <div><dt>Linked branches</dt><dd>{data.profile.counts.linkedBranches}</dd></div>
            </dl>
          </div>
          {data.profile.canEdit ? (
            <Link
              className="profile-edit-icon"
              href="/profile"
              aria-label="Edit Profile"
              title="Edit Profile"
            >
              ✎
            </Link>
          ) : null}
        </section>

        <section className="dashboard-section">
          <header className="dashboard-section__heading">
            <div><span className="dashboard-kicker">Pinned by you</span><h2>Featured Branches</h2></div>
          </header>
          {data.featuredBranches.length ? (
            <div className="featured-branch-grid">
              {data.featuredBranches.map((branch) => (
                <article className="featured-branch-card" key={branch.id}>
                  <header>
                    <div>
                      <small>{branch.parentTitle ? `From ${branch.parentTitle}` : "Main branch"}</small>
                      <h3>{branch.title}</h3>
                    </div>
                    <FeatureBranchButton branchId={branch.id} initialFeatured />
                  </header>
                  <p>{branch.summary ?? "No short summary."}</p>
                  <div className="dashboard-card__badges">
                    <i className={`dashboard-badge dashboard-badge--${branch.status}`}>{statusLabel(branch.status)}</i>
                    <i className="dashboard-badge">{statusLabel(branch.privacy)}</i>
                  </div>
                  <div className="featured-branch-card__footer">
                    <span>{branch.linkedBranchCount} linked</span>
                    <span>{branch.collaboratorCount} collaborators</span>
                    <time>{date(branch.updatedAt)}</time>
                    <Link href={`/branches/${branch.id}`}>Open Branch</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="featured-placeholder">
              <span aria-hidden="true">☆</span>
              <div><strong>No featured branches yet</strong><p>Feature important branches from Branch View to keep them here.</p></div>
            </div>
          )}
        </section>

        <section className="dashboard-lower" id="archive">
          <div className="dashboard-section archive-section">
            <header className="dashboard-section__heading">
              <div><span className="dashboard-kicker">Accessible confirmed research</span><h2>Branch Archive</h2></div>
              <small>Showing up to 25 results</small>
            </header>
            <form className="archive-filters" method="get">
              <label><span>Search titles</span><input name="q" defaultValue={filters.query} placeholder="Search branch titles…" /></label>
              <label><span>Status</span><select name="status" defaultValue={filters.status ?? ""}><option value="">All statuses</option>{["new","exploring","testing","active","needs_evidence","awaiting_review","archived_with_learning"].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>
              <label><span>Privacy</span><select name="privacy" defaultValue={filters.privacy ?? ""}><option value="">All privacy</option><option value="private">Private</option><option value="public">Public</option><option value="shared">Shared</option></select></label>
              <label><span>Year</span><select name="year" defaultValue={filters.year ?? ""}><option value="">All years</option>{[new Date().getUTCFullYear(), new Date().getUTCFullYear() - 1].map((year) => <option key={year}>{year}</option>)}</select></label>
              <label><span>Month</span><select name="month" defaultValue={filters.month ?? ""}><option value="">All months</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(2026, index, 1))}</option>)}</select></label>
              <label><span>Relationship</span><select name="relationship" defaultValue={filters.relationship ?? ""}><option value="">All branches</option><option value="main">Main branches</option><option value="subbranch">Subbranches</option></select></label>
              <button className="button button--primary" type="submit">Apply</button>
              <Link className="archive-clear" href="/#archive">Clear Filters</Link>
            </form>
            {data.archive.length ? (
              <div className="archive-table">
                <div className="archive-table__head"><span>Branch</span><span>Summary</span><span>Status</span><span>Privacy</span><span>Signals</span><span>Updated</span><span /></div>
                {data.archive.map((branch) => (
                  <article className="archive-row" key={branch.id}>
                    <div><strong>{branch.title}</strong><small>{branch.parentTitle ? `From ${branch.parentTitle}` : "Main branch"}</small></div>
                    <p>{branch.summary ?? "No short summary."}</p>
                    <span><i className={`dashboard-badge dashboard-badge--${branch.status}`}>{statusLabel(branch.status)}</i></span>
                    <span>{statusLabel(branch.privacy)}</span>
                    <span>{branch.commentCount} comments · {branch.sourceFileCount} sources/files</span>
                    <time>{date(branch.updatedAt)}</time>
                    <Link aria-label={`Open ${branch.title}`} href={`/branches/${branch.id}`}>•••</Link>
                  </article>
                ))}
              </div>
            ) : <div className="dashboard-empty">No accessible branches match these filters.</div>}
          </div>

          <aside className="dashboard-section activity-section">
            <header className="dashboard-section__heading"><div><span className="dashboard-kicker">Provenance pulse</span><h2>Recent Activity</h2></div></header>
            {data.activity.length ? (
              <ol className="activity-list">
                {data.activity.map((event) => (
                  <li key={event.id}>
                    <span className="activity-list__node" aria-hidden="true" />
                    <div><strong>{event.label}</strong><Link href={`/branches/${event.branchId}`}>{event.branchTitle}</Link><small>{event.actorName ? `${event.actorName} · ` : ""}{date(event.createdAt)}</small></div>
                  </li>
                ))}
              </ol>
            ) : <div className="dashboard-empty">No accessible activity yet.</div>}
          </aside>
        </section>
      </main>
    </div>
  );
}
