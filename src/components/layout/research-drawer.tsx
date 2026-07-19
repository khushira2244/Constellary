"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type DrawerDraft = { id: string; title: string };
type DrawerBranch = { id: string; title: string; parentTitle: string | null };

export function ResearchDrawer({
  drafts,
  recentBranches,
}: {
  drafts: DrawerDraft[];
  recentBranches: DrawerBranch[];
}) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      <button
        className="drawer-menu-button"
        type="button"
        aria-expanded={open}
        aria-controls="research-drawer"
        aria-label="Open research menu"
        onClick={() => setOpen(true)}
      >
        ☰
      </button>
      {open ? (
        <div className="drawer-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <aside
            id="research-drawer"
            className="research-drawer"
            ref={panel}
            aria-label="Research navigation"
          >
            <header>
              <strong>Research menu</strong>
              <button type="button" aria-label="Close research menu" onClick={() => setOpen(false)}>×</button>
            </header>
            <nav>
              <Link href="/" onClick={() => setOpen(false)}>⌂ <span>Home</span></Link>
              <section>
                <h2>Drafts</h2>
                {drafts.length ? drafts.slice(0, 3).map((draft) => (
                  <Link key={draft.id} href={`/branches/drafts/${draft.id}/workspace`} onClick={() => setOpen(false)}>
                    <span>{draft.title}</span><small>Unfinished</small>
                  </Link>
                )) : <p>No unfinished drafts.</p>}
              </section>
              <section>
                <h2>Recent Branches</h2>
                {recentBranches.length ? recentBranches.slice(0, 5).map((branch) => (
                  <Link key={branch.id} href={`/branches/${branch.id}`} onClick={() => setOpen(false)}>
                    <span>{branch.title}</span>
                    <small>{branch.parentTitle ? `From ${branch.parentTitle}` : "Main branch"}</small>
                  </Link>
                )) : <p>No accessible branches.</p>}
              </section>
              <a href="#profile" onClick={() => setOpen(false)}>◎ <span>Profile</span></a>
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
