"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { BranchPageData } from "@/features/branch-reading/types";
import { branchClassificationLabel, branchClassification, branchStatusLabel } from "@/features/branch-view/model";
import type { AIContributionKind } from "@/features/ai-contributions/types";
import type { Enums, Json } from "@/types/database";
import {
  applyAIContributionAction,
  approveAIContributionAction,
  rejectAIContributionAction,
  requestAIAssistanceAction,
  saveAIEnabledAction,
  saveFullSummaryAction,
  savePrivacyAction,
  saveStatusAction,
} from "./actions";

type Item =
  | "summary" | "visual" | "notes" | "voice" | "sources" | "files"
  | "links" | "collaborators" | "comments" | "privacy" | "ai" | "status" | "activity";
type SaveState = "saved" | "saving" | "error";

const items: { id: Item; label: string; icon: string }[] = [
  { id: "summary", label: "Full Summary", icon: "▤" },
  { id: "visual", label: "Visual Summary", icon: "◇" },
  { id: "notes", label: "Notes", icon: "▧" },
  { id: "voice", label: "Voice Notes", icon: "♩" },
  { id: "sources", label: "Sources", icon: "▥" },
  { id: "files", label: "Files", icon: "□" },
  { id: "links", label: "Linked Branches", icon: "↗" },
  { id: "collaborators", label: "Collaborators", icon: "♧" },
  { id: "comments", label: "Comments", icon: "▢" },
  { id: "privacy", label: "Privacy", icon: "◉" },
  { id: "ai", label: "AI Role", icon: "✣" },
  { id: "status", label: "Status", icon: "◌" },
  { id: "activity", label: "Activity History", icon: "↻" },
];

const jsonObject = (value: Json | null) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, Json>
    : {};
const text = (value: Json | undefined) => typeof value === "string" ? value : "";

export function EditingWorkspace({
  data,
  rootBranchId,
  aiConfigured,
}: {
  data: BranchPageData;
  rootBranchId: string;
  aiConfigured: boolean;
}) {
  const [active, setActive] = useState<Item>("summary");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [context, setContext] = useState<Item[]>([]);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const back = `/branches/${rootBranchId}`;

  return (
    <main className="editing-workspace">
      <header className="workspace-topbar">
        <div><strong>✦ Constellary</strong><Link href={back}>← Back to Branch View</Link></div>
        <div className="workspace-title">
          <strong>{data.branch.title}</strong>
          <small>{data.parent ? `from ${data.parent.title}` : "Main branch"}</small>
        </div>
        <div>
          <span className="branch-status">● {branchStatusLabel(data.branch.status)}</span>
          <SaveStateIndicator state={saveState} />
          <Link className="workspace-preview" href={`/branches/${data.branch.id}`}>◉ Preview Branch</Link>
          <Link className="workspace-close" href={back} aria-label="Close Workspace">×</Link>
        </div>
      </header>

      <div className="editing-workspace-grid">
        <BranchContextPanel data={data} />
        <WorkspaceEditor
          active={active}
          data={data}
          onSaveState={setSaveState}
          onAddContext={() => setContext((current) => current.includes(active) ? current : [...current, active])}
        />
        <aside className="workspace-right">
          <nav className="workspace-item-list" aria-label="Workspace items">
            <strong>Items</strong>
            {items.map((item) => (
              <button className={active === item.id ? "is-active" : ""} key={item.id} onClick={() => setActive(item.id)} type="button">
                <span aria-hidden="true">{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>
          <AIAssistantPanel
            branchId={data.branch.id}
            configured={aiConfigured}
            context={context}
            open={assistantOpen}
            onClear={() => setContext([])}
            onClose={() => setAssistantOpen(false)}
            onOpen={() => setAssistantOpen(true)}
            onRemove={(item) => setContext((current) => current.filter((value) => value !== item))}
          />
        </aside>
      </div>
    </main>
  );
}

function SaveStateIndicator({ state }: { state: SaveState }) {
  return <span className={`save-indicator save-indicator--${state}`}>{state === "saving" ? "Saving…" : state === "error" ? "Error" : "✓ Saved"}</span>;
}

function LockedField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="locked-field"><span>{label} 🔒</span><div>{children}</div></div>;
}

function BranchContextPanel({ data }: { data: BranchPageData }) {
  const origin = jsonObject(data.branch.origin_details);
  return (
    <aside className="branch-context-panel">
      <h2>Branch Context <span title="Confirmed provenance is read-only">ⓘ</span></h2>
      <p>This section is informational and locked after confirmation.</p>
      {data.parent ? (
        <>
          <LockedField label="Parent branch">{data.parent.title}</LockedField>
          <LockedField label="Branch Topic">{text(origin.branch_topic) || data.branch.title}</LockedField>
          <LockedField label="Why This Direction Exists">{data.branch.original_idea}</LockedField>
        </>
      ) : (
        <>
          <strong>Main Branch</strong>
          <LockedField label="Original Idea">{data.branch.original_idea}</LockedField>
          <LockedField label="Origin">{branchClassificationLabel(branchClassification(data))}</LockedField>
        </>
      )}
      <LockedField label="Title">{data.branch.title}</LockedField>
      <div className="branch-path"><span>Branch Path</span>{data.path.map((item) => <div key={item.id}>◉ {item.title}</div>)}</div>
    </aside>
  );
}

function WorkspaceEditor({
  active,
  data,
  onSaveState,
  onAddContext,
}: {
  active: Item;
  data: BranchPageData;
  onSaveState: (state: SaveState) => void;
  onAddContext: () => void;
}) {
  const selected = items.find((item) => item.id === active)!;
  return (
    <section className="workspace-editor">
      <div className="workspace-editor-heading">
        <div><span>{selected.label}</span><small>{editorDescription(active)}</small></div>
        <button onClick={onAddContext} type="button">＋ Add active item to AI context</button>
      </div>
      <EditorBody active={active} data={data} onSaveState={onSaveState} />
    </section>
  );
}

function editorDescription(active: Item) {
  const descriptions: Record<Item, string> = {
    summary: "Detailed summary of the research in this branch.",
    visual: "Structured visual-summary representation.",
    notes: "Ongoing research notes.",
    voice: "Voice-note metadata.",
    sources: "External sources and citations.",
    files: "Private branch attachments.",
    links: "Related branches; separate from ancestry.",
    collaborators: "People with branch access.",
    comments: "Branch discussion.",
    privacy: "Branch visibility.",
    ai: "AI availability and attribution.",
    status: "Current research state.",
    activity: "Read-only provenance history.",
  };
  return descriptions[active];
}

function EditorBody({ active, data, onSaveState }: { active: Item; data: BranchPageData; onSaveState: (value: SaveState) => void }) {
  if (active === "summary") return <FullSummaryEditor data={data} onSaveState={onSaveState} />;
  if (active === "privacy") return <PrivacyEditor data={data} onSaveState={onSaveState} />;
  if (active === "ai") return <AISettingsEditor data={data} onSaveState={onSaveState} />;
  if (active === "status") return <StatusEditor data={data} onSaveState={onSaveState} />;
  if (active === "notes") return <RecordList empty="No notes yet." records={data.notes.map((note) => noteContent(note.content))} />;
  if (active === "sources") return <RecordList empty="No sources yet." records={data.sources.map((source) => source.title ?? source.url)} />;
  if (active === "files") return <RecordList empty="No files yet." records={data.files.map((file) => `${file.file_name} · ${Math.ceil(file.file_size / 1024)} KB`)} />;
  if (active === "links") return <RecordList empty="No linked branches yet." records={data.linkedBranches.map((link) => link.branch.title)} />;
  if (active === "collaborators") return <RecordList empty="No collaborators yet." records={data.collaborators.map((entry) => `${entry.profile?.display_name ?? entry.profile?.username ?? "Collaborator"} · ${entry.role}`)} />;
  if (active === "comments") return <RecordList empty="No comments yet." records={data.comments.map((comment) => comment.content)} />;
  if (active === "activity") return <RecordList empty="No activity recorded." records={data.activity.map((event) => `${branchStatusLabel(event.event_type)} · ${new Date(event.created_at).toLocaleString()}`)} />;
  if (active === "voice") return <RecordList empty="No voice-note metadata yet." records={data.notes.filter((note) => note.item_type === "voice_note").map((note) => note.title ?? "Voice note")} />;
  return <UnsupportedVisualSummary />;
}

function noteContent(value: Json) {
  const object = jsonObject(value);
  return text(object.text) || "Structured note";
}

function RecordList({ records, empty }: { records: string[]; empty: string }) {
  return records.length ? <ul className="workspace-record-list">{records.map((record, index) => <li key={`${index}-${record}`}>{record}</li>)}</ul> : <p className="workspace-empty">{empty}</p>;
}

function UnsupportedVisualSummary() {
  return <div className="workspace-empty"><strong>Visual Summary editor pending</strong><p>The database supports structured documents, but its editor structure has not been approved. No unsupported representation is being invented here.</p></div>;
}

function FullSummaryEditor({ data, onSaveState }: { data: BranchPageData; onSaveState: (value: SaveState) => void }) {
  const [summaryId, setSummaryId] = useState(data.fullSummary?.id ?? null);
  const initial = data.fullSummary?.content ?? "";
  const [content, setContent] = useState(initial);
  const lastSaved = useRef(initial);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (content === lastSaved.current || !content.trim()) return;
    const timer = window.setTimeout(() => {
      onSaveState("saving");
      startTransition(async () => {
        const saved = await saveFullSummaryAction(data.branch.id, summaryId, content);
        if (!saved.ok) return onSaveState("error");
        setSummaryId(saved.data.id);
        lastSaved.current = content;
        onSaveState("saved");
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [content, data.branch.id, onSaveState, summaryId]);
  return (
    <div className="summary-editor">
      <textarea aria-label="Full Summary" disabled={pending} onChange={(event) => setContent(event.target.value)} value={content} />
      <span>{content.trim() ? content.trim().split(/\s+/).length : 0} words</span>
    </div>
  );
}

function PrivacyEditor({ data, onSaveState }: { data: BranchPageData; onSaveState: (value: SaveState) => void }) {
  const [value, setValue] = useState(data.branch.privacy === "public" ? "public" : "private");
  return <SettingSelect value={value} options={["private", "public"]} onChange={async (next) => {
    onSaveState("saving"); const saved = await savePrivacyAction(data.branch.id, next as "private" | "public");
    if (!saved.ok) return onSaveState("error"); setValue(next); onSaveState("saved");
  }} />;
}

function AISettingsEditor({ data, onSaveState }: { data: BranchPageData; onSaveState: (value: SaveState) => void }) {
  const [enabled, setEnabled] = useState(data.branch.ai_enabled);
  return <div className="workspace-setting"><strong>AI Assistant</strong><button onClick={async () => {
    onSaveState("saving"); const saved = await saveAIEnabledAction(data.branch.id, !enabled);
    if (!saved.ok) return onSaveState("error"); setEnabled(!enabled); onSaveState("saved");
  }} type="button">{enabled ? "Enabled" : "Disabled"}</button><p>AI output remains attributable and requires explicit human review before application.</p></div>;
}

function StatusEditor({ data, onSaveState }: { data: BranchPageData; onSaveState: (value: SaveState) => void }) {
  const [value, setValue] = useState(data.branch.status);
  const options: Enums<"branch_status">[] = [
    "new",
    "exploring",
    "active",
    "testing",
    "awaiting_review",
    "paused",
  ];
  return <SettingSelect value={value} options={options} onChange={async (next) => {
    onSaveState("saving"); const saved = await saveStatusAction(data.branch.id, next as Enums<"branch_status">);
    if (!saved.ok) return onSaveState("error"); setValue(next as Enums<"branch_status">); onSaveState("saved");
  }} />;
}

function SettingSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return <div className="workspace-setting"><select disabled={pending} value={value} onChange={(event) => startTransition(() => onChange(event.target.value))}>{options.map((option) => <option key={option} value={option}>{branchStatusLabel(option)}</option>)}</select></div>;
}

function AIAssistantPanel({
  branchId, configured, context, open, onClear, onClose, onOpen, onRemove,
}: {
  branchId: string; configured: boolean; context: Item[]; open: boolean; onClear: () => void; onClose: () => void; onOpen: () => void; onRemove: (item: Item) => void;
}) {
  const labels = useMemo(() => new Map(items.map((item) => [item.id, item.label])), []);
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<AIContributionKind>("rough_note_clarification");
  const [response, setResponse] = useState<{ id: string; text: string; status: "generated" | "approved" | "rejected" | "applied" } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const target = kind === "full_summary_draft"
    ? "full_summary"
    : kind === "visual_summary_structure"
      ? "visual_summary"
      : "note";

  function send() {
    if (pending || !prompt.trim()) return;
    setMessage(null);
    startTransition(async () => {
      const generated = await requestAIAssistanceAction({
        branchId,
        prompt,
        context,
        contributionKind: kind,
      });
      if (!generated.ok) {
        setMessage(generated.message);
        return;
      }
      setResponse({ id: generated.data.contributionId, text: generated.data.text, status: "generated" });
      setPrompt("");
    });
  }

  function review(action: "approve" | "reject" | "apply") {
    if (!response || pending) return;
    setMessage(null);
    startTransition(async () => {
      const reviewed = action === "approve"
        ? await approveAIContributionAction(response.id, response.text)
        : action === "reject"
          ? await rejectAIContributionAction(response.id)
          : await applyAIContributionAction(branchId, response.id, target);
      if (!reviewed.ok) {
        setMessage(reviewed.message);
        return;
      }
      setResponse((current) => current ? {
        ...current,
        status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "applied",
      } : current);
    });
  }

  if (!open) return <button className="ai-assistant-open" onClick={onOpen} type="button">✦ AI Assistant</button>;
  return (
    <section className="ai-assistant">
      <header><strong>✦ AI Assistant</strong><button onClick={onClose} aria-label="Close AI Assistant" type="button">×</button></header>
      <div className="selected-context">
        <div><strong>Using selected context</strong><button onClick={onClear} type="button">Clear</button></div>
        {context.length ? context.map((item) => <button key={item} onClick={() => onRemove(item)} type="button">{labels.get(item)} ×</button>) : <p>No context selected.</p>}
        <small>{context.length} context item{context.length === 1 ? "" : "s"}</small>
      </div>
      <div className="ai-conversation">
        {!response ? (
          <p>{configured ? "Select context and ask about this branch." : "AI is not configured for this environment."}</p>
        ) : (
          <div className="ai-review">
            <span>AI contribution · {response.status}</span>
            <textarea
              aria-label="Review AI response"
              disabled={response.status !== "generated"}
              onChange={(event) => setResponse({ ...response, text: event.target.value })}
              value={response.text}
            />
            {response.status === "generated" ? (
              <div>
                <button disabled={pending} onClick={() => review("reject")} type="button">Reject</button>
                <button disabled={pending} onClick={() => review("approve")} type="button">Approve</button>
              </div>
            ) : null}
            {response.status === "approved" ? (
              <button disabled={pending} onClick={() => review("apply")} type="button">
                Apply approved contribution
              </button>
            ) : null}
          </div>
        )}
      </div>
      <select
        className="ai-request-kind"
        disabled={pending}
        onChange={(event) => setKind(event.target.value as AIContributionKind)}
        value={kind}
      >
        <option value="rough_note_clarification">Rewrite selected material</option>
        <option value="full_summary_draft">Draft full summary</option>
        <option value="next_direction_suggestion">Suggest next direction</option>
        <option value="reference_suggestion">Propose references</option>
        <option value="linked_branch_context_summary">Summarize linked context</option>
        <option value="visual_summary_structure">Draft visual structure</option>
      </select>
      <div className="ai-prompt">
        <input
          disabled={pending || !configured}
          maxLength={2000}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Ask about selected context…"
          value={prompt}
        />
        <button disabled={pending || !configured || !prompt.trim()} onClick={send} type="button">
          {pending ? "…" : "➤"}
        </button>
      </div>
      {message ? <p className="ai-error" role="alert">{message}</p> : null}
      <small>AI output never overwrites research content automatically.</small>
    </section>
  );
}
