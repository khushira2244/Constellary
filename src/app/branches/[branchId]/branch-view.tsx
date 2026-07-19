"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type FocusEvent,
  useMemo,
  useState,
  useTransition,
} from "react";

import type {
  BranchPageData,
  BranchTreeNode,
} from "@/features/branch-reading/types";
import {
  branchClassification,
  branchClassificationLabel,
  branchStatusLabel,
  connectorThickness,
  firstSummaryParagraph,
  flattenBranchTree,
} from "@/features/branch-view/model";
import { FeatureBranchButton } from "@/components/branches/feature-branch-button";
import { ShareBranchControl } from "@/components/branches/share-branch-control";
import {
  addLinkedBranchAction,
  deleteBranchNoteAction,
  deleteBranchAction,
  removeLinkedBranchAction,
  saveBranchNoteAction,
  saveBranchSummaryAction,
  searchBranchesAction,
  updateBranchPrivacyAction,
} from "./actions";

type SectionName =
  | "links"
  | "notes"
  | "summary"
  | "comments"
  | "collaborators"
  | "ai";
const primaryActions: { id: SectionName; label: string; icon: string }[] = [
  { id: "links", label: "Links", icon: "↗" },
  { id: "notes", label: "Notes", icon: "▤" },
  { id: "summary", label: "Summary", icon: "▥" },
  { id: "comments", label: "Comments", icon: "▢" },
  { id: "collaborators", label: "Collaborators", icon: "♧" },
  { id: "ai", label: "AI Role", icon: "✣" },
];

export function BranchView({ root }: { root: BranchTreeNode }) {
  const router = useRouter();
  const branches = useMemo(() => flattenBranchTree(root), [root]);
  const [preview, setPreview] = useState<BranchPageData | null>(null);
  const [open, setOpen] = useState<{ branchId: string; section: SectionName } | null>(null);
  const [deleting, setDeleting] = useState<BranchPageData | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(branchId: string, section: SectionName) {
    setOpen((current) =>
      current?.branchId === branchId && current.section === section
        ? null
        : { branchId, section },
    );
  }

  function confirmDelete() {
    if (!deleting || pending) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteBranchAction(deleting.branch.id);
      if (!result.ok) {
        setDeleteError(result.message);
        return;
      }
      if (!deleting.branch.parent_branch_id) {
        router.replace("/");
      } else {
        setDeleting(null);
        router.refresh();
      }
    });
  }

  return (
    <main className="branch-page-shell">
      <aside className={`branch-hover-preview ${preview ? "branch-hover-preview--visible" : ""}`}>
        {preview ? (
          <>
            <span>{preview.branch.parent_branch_id ? "Derived from parent" : "Main branch"}</span>
            <h2>{preview.branch.title}</h2>
            <p>{firstSummaryParagraph(preview.shortSummary?.content)}</p>
            <small>{branchStatusLabel(preview.branch.status)}</small>
          </>
        ) : null}
      </aside>

      <section className="provenance-region" aria-label="Branch provenance">
        <OriginalIdeaBox data={root.data} onDelete={() => setDeleting(root.data)} />
        <div className={`provenance-origin-node provenance--${branchClassification(root.data)}`} />

        <div className="provenance-tree">
          {branches.map(({ node, depth }) => (
            <BranchTreeItem
              key={node.data.branch.id}
              data={node.data}
              depth={depth}
              open={open?.branchId === node.data.branch.id ? open.section : null}
              onOpen={(section) => toggle(node.data.branch.id, section)}
              onPreview={setPreview}
              onDelete={() => {
                setDeleteError(null);
                setDeleting(node.data);
              }}
            />
          ))}
        </div>
      </section>

      {deleting ? (
        <DeleteBranchDialog
          data={deleting}
          error={deleteError}
          pending={pending}
          onCancel={() => {
            setDeleting(null);
            setDeleteError(null);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </main>
  );
}

function OriginalIdeaBox({
  data,
  onDelete,
}: {
  data: BranchPageData;
  onDelete: () => void;
}) {
  const kind = branchClassification(data);
  return (
    <article className={`original-idea-box provenance--${kind}`}>
      <div className="original-idea-box__heading">
        <span className="classification-marker" />
        <strong>Original Idea</strong>
        <span className="classification-badge">{branchClassificationLabel(kind)}</span>
        {data.capabilities.role === "owner" ? (
          <button className="icon-button" onClick={onDelete} aria-label="Delete main branch" type="button">♲</button>
        ) : null}
      </div>
      <p>{data.branch.original_idea}</p>
    </article>
  );
}

function BranchTreeItem({
  data,
  depth,
  open,
  onOpen,
  onPreview,
  onDelete,
}: {
  data: BranchPageData;
  depth: number;
  open: SectionName | null;
  onOpen: (section: SectionName) => void;
  onPreview: (data: BranchPageData | null) => void;
  onDelete: () => void;
}) {
  const kind = branchClassification(data);
  const style = {
    "--branch-depth": depth,
    "--link-emphasis": `${connectorThickness(data.linkedBranches.length)}px`,
  } as CSSProperties;
  const clearFocus = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) onPreview(null);
  };

  return (
    <div className={`branch-tree-item provenance--${kind}`} style={style}>
      <div className="branch-node" aria-hidden="true" />
      <article
        className="branch-card"
        tabIndex={0}
        onMouseEnter={() => onPreview(data)}
        onMouseLeave={() => onPreview(null)}
        onFocus={() => onPreview(data)}
        onBlur={clearFocus}
      >
        <div className="branch-card__heading">
          <span className="classification-marker" />
          <h2>{data.branch.title}</h2>
          {data.capabilities.authenticated ? (
            <FeatureBranchButton branchId={data.branch.id} initialFeatured={data.isFeatured} />
          ) : null}
          <span className="branch-status">● {branchStatusLabel(data.branch.status)}</span>
          {data.capabilities.role === "owner" ? (
            <button className="icon-button" onClick={onDelete} aria-label={`Delete ${data.branch.title}`} type="button">♲</button>
          ) : null}
        </div>
        <BranchActionRow data={data} open={open} onOpen={onOpen} />
      </article>

      {open ? <BranchSectionPanel data={data} section={open} onClose={() => onOpen(open)} /> : null}

      {data.capabilities.canEdit ? (
        <div className="add-subbranch-wrap">
          <Link
            className="add-subbranch-node"
            href={`/branches/${data.branch.id}/new`}
            aria-label={`Create a subbranch from ${data.branch.title}`}
          >
            ＋
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function BranchActionRow({
  data,
  open,
  onOpen,
}: {
  data: BranchPageData;
  open: SectionName | null;
  onOpen: (section: SectionName) => void;
}) {
  return (
    <div className="branch-action-system">
      <div className="branch-action-row branch-tab-row" role="tablist" aria-label="Branch content">
        {primaryActions.map((action) => (
          <button
            className={open === action.id ? "branch-action--active" : ""}
            key={action.id}
            onClick={() => onOpen(action.id)}
            role="tab"
            aria-selected={open === action.id}
            type="button"
          >
            <span aria-hidden="true">{action.icon}</span>{action.label}
          </button>
        ))}
        <div className="branch-utility-row" aria-label="Branch utilities">
          {data.capabilities.canManage ? <PrivacyControl data={data} /> : null}
          <ShareBranchControl
            branchId={data.branch.id}
            title={data.branch.title}
            privacy={data.branch.privacy}
            canManage={data.capabilities.canManage}
          />
          {data.capabilities.authenticated ? (
            <button type="button" aria-label="More branch actions" title="More branch actions">•••</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PrivacyControl({ data }: { data: BranchPageData }) {
  const [privacy, setPrivacy] = useState(data.branch.privacy);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isPublic = privacy === "public";

  function update(value: "private" | "public") {
    if (value === privacy || pending) return;
    setMessage(null);
    startTransition(async () => {
      const result = await updateBranchPrivacyAction(data.branch.id, value);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setPrivacy(result.privacy);
      setOpen(false);
    });
  }

  return (
    <div className="privacy-control">
      <button
        aria-expanded={open}
        aria-label={`Privacy: ${isPublic ? "Public" : "Private"}`}
        disabled={!data.capabilities.canManage}
        onClick={() => setOpen((value) => !value)}
        title={data.capabilities.canManage ? `Privacy: ${isPublic ? "Public" : "Private"}` : "You cannot change privacy"}
        type="button"
      >
        <span aria-hidden="true">{isPublic ? "◉" : "◌̸"}</span>
      </button>
      {open ? (
        <div className="privacy-popover" role="dialog" aria-label="Change branch privacy">
          <strong>Privacy</strong>
          <button disabled={pending || isPublic} onClick={() => update("public")} type="button">◉ Public</button>
          <button disabled={pending || !isPublic} onClick={() => update("private")} type="button">◌̸ Private</button>
          {message ? <p role="alert">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function BranchSectionPanel({
  data,
  section,
  onClose,
}: {
  data: BranchPageData;
  section: SectionName;
  onClose: () => void;
}) {
  const fullView = section === "links"
    ? { href: `/branches/${data.branch.id}/links`, label: "Open full linked branches view" }
    : section === "summary"
      ? { href: `/branches/${data.branch.id}/summary`, label: "Open full summary" }
      : section === "comments" || section === "collaborators"
        ? { href: `/branches/${data.branch.id}/community`, label: "Open collaborators and comments" }
        : null;
  return (
    <section className="branch-section-panel">
      <div className="branch-section-panel__heading">
        <strong>{section[0].toUpperCase() + section.slice(1)}</strong>
        <div>
          {fullView ? <Link href={fullView.href} aria-label={fullView.label} title={fullView.label}>⛶</Link> : null}
          <button onClick={onClose} type="button" aria-label={`Close ${section}`}>×</button>
        </div>
      </div>
      {section === "summary" ? <SummarySection data={data} /> : null}
      {section === "notes" ? <NotesSection data={data} /> : null}
      {section === "comments" ? <CommentsSection data={data} /> : null}
      {section === "links" ? <LinksSection data={data} /> : null}
      {section === "collaborators" ? <CollaboratorsSection data={data} /> : null}
      {section === "ai" ? <AIRoleSection data={data} /> : null}
    </section>
  );
}

function SummarySection({ data }: { data: BranchPageData }) {
  const summary = data.fullSummary;
  const readable = summary ?? data.shortSummary;
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(summary?.content ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const author = data.authors.find((profile) => profile.id === summary?.created_by);
  const aiAttributed = data.aiAttribution.some((item) =>
    item.target_id === summary?.id || item.contribution_type === "summary_draft");
  return (
    <div className="section-content">
      {editing ? (
        <div className="inline-summary-editor">
          <textarea aria-label="Full Summary" value={content} onChange={(event) => setContent(event.target.value)} />
          <div>
            <span className={`save-indicator save-indicator--${state === "idle" ? "saved" : state}`}>{state === "saving" ? "Saving…" : state === "error" ? "Error" : state === "saved" ? "Saved" : ""}</span>
            <button disabled={pending} onClick={() => { setContent(summary?.content ?? ""); setEditing(false); setMessage(null); }} type="button">Cancel</button>
            <button disabled={pending || !content.trim()} onClick={() => {
              setState("saving");
              setMessage(null);
              startTransition(async () => {
                const result = await saveBranchSummaryAction(data.branch.id, summary?.id ?? null, content);
                if (!result.ok) {
                  setState("error");
                  setMessage(result.message);
                  return;
                }
                setState("saved");
                setEditing(false);
              });
            }} type="button">Save Summary</button>
          </div>
          {message ? <p className="section-message" role="alert">{message}</p> : null}
        </div>
      ) : <p>{readable?.content ?? "No summary has been added yet."}</p>}
      {readable ? (
        <small className="reading-meta">
          {author?.display_name ?? author?.username ?? "Research contributor"}
          {" · "}{new Date(readable.updated_at).toLocaleDateString()}
          {" · "}{branchStatusLabel(readable.status)}
          {aiAttributed ? " · AI-attributed" : ""}
        </small>
      ) : null}
      {data.capabilities.canEdit && !editing ? (
        <div className="panel-management-actions">
          <button onClick={() => setEditing(true)} type="button">Edit Summary</button>
          <Link href={`/branches/${data.branch.id}/workspace?item=full-summary`}>Open in Workspace</Link>
        </div>
      ) : null}
    </div>
  );
}

function NotesSection({ data }: { data: BranchPageData }) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="section-content">
      {data.notes.length ? <ul className="section-list">
        {data.notes.map((note) => (
          <li key={note.id}>
            <strong>{note.title ?? "Note"}</strong><span>{noteContent(note.content)}</span>
            {data.capabilities.canEdit ? <div className="compact-row-actions">
              <button onClick={() => { setEditingId(note.id); setDraft(noteContent(note.content)); }} type="button">Edit</button>
              <button onClick={() => {
                if (!window.confirm("Delete this note?")) return;
                startTransition(async () => {
                  const result = await deleteBranchNoteAction(data.branch.id, note.id);
                  setMessage(result.ok ? "Note deleted. Refreshing…" : result.message);
                  if (result.ok) window.location.reload();
                });
              }} type="button">Delete</button>
            </div> : null}
          </li>
        ))}
      </ul> : <p className="section-empty">No notes yet.</p>}
      {data.capabilities.canEdit ? <div className="inline-note-editor">
        <textarea aria-label={editingId ? "Edit note" : "New note"} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a research note…" />
        <button disabled={pending || !draft.trim()} onClick={() => startTransition(async () => {
          const result = await saveBranchNoteAction(data.branch.id, editingId, draft);
          setMessage(result.ok ? "Note saved. Refreshing…" : result.message);
          if (result.ok) window.location.reload();
        })} type="button">{editingId ? "Save Note" : "Add Note"}</button>
        {editingId ? <button onClick={() => { setEditingId(null); setDraft(""); }} type="button">Cancel</button> : null}
        {message ? <p className="section-message" role="alert">{message}</p> : null}
      </div> : null}
    </div>
  );
}

function noteContent(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const text = record.text ?? record.body ?? record.content;
    if (typeof text === "string") return text;
  }
  return "Structured research note";
}

function CommentsSection({ data }: { data: BranchPageData }) {
  return (
    <div className="section-content">
      {data.comments.length ? <ul className="section-list">{data.comments.slice(-3).reverse().map((comment) => {
        const author = data.authors.find((profile) => profile.id === comment.author_id);
        return (
          <li key={comment.id}>
            <strong>{author?.display_name ?? author?.username ?? "Research contributor"}</strong>
            <span>{comment.content}</span>
            <small>{new Date(comment.created_at).toLocaleDateString()}</small>
          </li>
        );
      })}</ul> : <p className="section-empty">No comments yet.</p>}
      {data.capabilities.canComment ? (
        <Link className="section-edit-link" href={`/branches/${data.branch.id}/community`}>Open discussion</Link>
      ) : null}
    </div>
  );
}

function CollaboratorsSection({ data }: { data: BranchPageData }) {
  const collaborators = data.collaborators
    .filter((item) => item.userId !== data.branch.owner_id)
    .slice(0, 4);
  return (
    <div className="section-content">
      <p className="collaborator-count">{data.collaborators.length} active collaborators</p>
      <ul className="section-list">
        <li>
          <strong>{data.owner?.display_name ?? data.owner?.username ?? "Branch owner"}</strong>
          <span>Owner · Active</span>
        </li>
      </ul>
      {collaborators.length ? (
        <ul className="section-list">
          {collaborators.map((collaborator) => (
            <li key={collaborator.id}>
              <strong>
                {collaborator.profile?.display_name
                  ?? collaborator.profile?.username
                  ?? "Collaborator"}
              </strong>
              <span>{branchStatusLabel(collaborator.role)} · Active</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="section-empty">No collaborators have been added yet.</p>
      )}
      {data.capabilities.role === "owner" ? (
        <Link className="section-edit-link" href={`/branches/${data.branch.id}/community`}>Manage collaborators</Link>
      ) : null}
    </div>
  );
}

function AIRoleSection({ data }: { data: BranchPageData }) {
  const latest = data.aiAttribution[0];
  return (
    <div className="section-content ai-role-summary">
      <p><strong>AI is {data.branch.ai_enabled ? "enabled" : "disabled"}.</strong></p>
      <p>
        {latest
          ? `${branchStatusLabel(latest.contribution_type)} — ${branchStatusLabel(latest.approval_status)}`
          : "No attributed AI contribution has been recorded for this branch."}
      </p>
      <small>AI assists only through recorded, attributable contributions that remain subject to human approval.</small>
      {data.capabilities.canEdit ? (
        <Link className="section-edit-link" href={`/branches/${data.branch.id}/workspace?item=ai`}>Open AI Workspace</Link>
      ) : null}
    </div>
  );
}

function LinksSection({ data }: { data: BranchPageData }) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; title: string }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function search() {
    setMessage(null);
    startTransition(async () => {
      const result = await searchBranchesAction(query);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setResults(result.data.filter((item) => item.id !== data.branch.id));
    });
  }

  function add(targetId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await addLinkedBranchAction(data.branch.id, targetId);
      setMessage(result.ok ? "Linked branch added. Refreshing…" : result.message);
      if (result.ok) window.location.reload();
    });
  }

  function remove(linkId: string) {
    if (!window.confirm("Remove this linked-branch relationship?")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await removeLinkedBranchAction(data.branch.id, linkId);
      setMessage(result.ok ? "Linked branch removed. Refreshing…" : result.message);
      if (result.ok) window.location.reload();
    });
  }

  return (
    <div className="section-content">
      {data.linkedBranches.length ? (
        <ul className="section-list">
          {data.linkedBranches.map((link) => (
            <li className="linked-preview-row" key={link.linkId}>
              <div>
                <Link href={`/branches/${link.branch.id}`}>{link.branch.title}</Link>
                <small>{link.direction === "outgoing" ? "Outgoing" : "Incoming"} · {link.relationshipType.replaceAll("_", " ")}</small>
                <p>{link.shortSummary ?? "No readable short summary."}</p>
              </div>
              <span>{branchStatusLabel(link.branch.status)} · {branchStatusLabel(link.branch.privacy)}</span>
              {data.capabilities.canEdit && link.direction === "outgoing"
                ? <button disabled={pending} onClick={() => remove(link.linkId)} type="button">Remove</button>
                : null}
            </li>
          ))}
        </ul>
      ) : <p className="section-empty">No linked branches yet.</p>}
      {data.capabilities.canEdit ? (
        <>
          <button className="section-edit-link" onClick={() => setSearching((value) => !value)} type="button">
            {searching ? "Close branch search" : "＋ Add linked branch"}
          </button>
          {searching ? (
            <div className="link-search">
              <label>
                <span>Search by branch title</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <button disabled={pending || query.trim().length < 2} onClick={search} type="button">Search</button>
              {results.map((item) => (
                <div className="link-search-result" key={item.id}>
                  <span>{item.title}</span>
                  <button disabled={pending} onClick={() => add(item.id)} type="button">Add</button>
                </div>
              ))}
              {message ? <p className="section-message">{message}</p> : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function DeleteBranchDialog({
  data,
  error,
  pending,
  onCancel,
  onConfirm,
}: {
  data: BranchPageData;
  error: string | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const root = !data.branch.parent_branch_id;
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <h2 id="delete-title">Delete {root ? "branch tree" : "subbranch"}?</h2>
        <p>
          {root
            ? "This requests deletion of the main branch. Descendants, confirmed drafts, or provenance references may safely block the operation."
            : "This requests deletion of only this subbranch. Its parent will not be deleted."}
        </p>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <div className="dialog-actions">
          <button disabled={pending} onClick={onCancel} type="button">Cancel</button>
          <button className="danger-button" disabled={pending} onClick={onConfirm} type="button">
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}
