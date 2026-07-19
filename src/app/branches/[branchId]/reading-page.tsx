import Link from "next/link";
import type { ReactNode } from "react";

import type { BranchPageData } from "@/features/branch-reading/types";

export function BranchReadingPage({
  data,
  title,
  eyebrow,
  children,
}: {
  data: BranchPageData;
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <main className="branch-reading-shell">
      <header className="branch-reading-header">
        <Link href={`/branches/${data.path[0]?.id ?? data.branch.id}`}>← Back to Branch View</Link>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{data.branch.parent_branch_id && data.parent ? `From ${data.parent.title}` : "Main branch"} · {data.branch.title}</p>
      </header>
      {children}
    </main>
  );
}

export function ReadingIdentity({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  return (
    <span className="reading-identity">
      <i style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined}>
        {avatarUrl ? "" : name.slice(0, 1).toUpperCase()}
      </i>
      <span>{name}</span>
    </span>
  );
}
