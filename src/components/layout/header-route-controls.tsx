"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { createFreshMainBranch } from "@/app/dashboard-actions";

export function HeaderRouteControls({
  canCreateBranch,
}: {
  canCreateBranch: boolean;
}) {
  const pathname = usePathname();
  const homeActive = pathname === "/";
  const createActive =
    /^\/branches\/[^/]+\/new(?:\/|$)/.test(pathname)
    || /^\/branches\/drafts\/[^/]+\/workspace(?:\/|$)/.test(pathname);
  return (
    <div className="header-route-controls">
      <Link
        className={`header-home-control${homeActive ? " header-control--active" : ""}`}
        href="/"
        aria-current={homeActive ? "page" : undefined}
      >
        Home
      </Link>
      {canCreateBranch ? (
        <form action={createFreshMainBranch}>
          <button
            className={`header-icon-action${createActive ? " header-control--active" : ""}`}
            type="submit"
            aria-label="Create Branch"
            title="Create Branch"
          >
            <span aria-hidden="true">⑂＋</span>
          </button>
        </form>
      ) : null}
    </div>
  );
}
