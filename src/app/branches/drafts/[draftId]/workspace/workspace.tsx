"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ErrorState } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { Panel } from "@/components/ui/panel";
import { StepIndicator } from "@/components/ui/step-indicator";
import {
  AI_ROLE_IDS,
  type DraftSnapshot,
  type IntendedAIRole,
} from "@/features/branch-creation/model";
import type { BranchDraft, Enums, Json } from "@/types/database";
import {
  confirmDraftAction,
  saveDraftSnapshotAction,
} from "./actions";

const steps = [
  { id: "origin", label: "Origin" },
  { id: "originalIdea", label: "Original Idea" },
  { id: "title", label: "Title" },
  { id: "shortSummary", label: "Short Summary" },
  { id: "previousWork", label: "Previous Work" },
  { id: "people", label: "People" },
  { id: "privacyAndAI", label: "Privacy and AI Role" },
  { id: "review", label: "Review" },
] as const;

const privacyOptions: { value: Enums<"privacy_level">; label: string; detail: string }[] = [
  { value: "private", label: "Private", detail: "Only you can access this branch." },
  { value: "selected_people", label: "Selected people", detail: "People you explicitly grant access to." },
  { value: "project_members", label: "Project members", detail: "Members of its future research project." },
  { value: "secure_link", label: "Secure link", detail: "People with a protected access link." },
  { value: "public", label: "Public", detail: "Anyone can view approved public content." },
];

const aiOptions: { value: IntendedAIRole; label: string; detail: string }[] = [
  { value: "none", label: "No AI assistance yet", detail: "Keep this creation process entirely human-authored." },
  { value: "organize", label: "Help organize the idea", detail: "Record this as your intended later workflow." },
  { value: "summary", label: "Help draft the later summary", detail: "No summary will be generated during creation." },
  { value: "references", label: "Suggest references", detail: "Reference suggestions can be requested later." },
  { value: "directions", label: "Suggest possible directions", detail: "Direction suggestions can be explored later." },
];

type SaveState = "saved" | "saving" | "error";

function jsonObject(value: Json): Record<string, Json> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, Json] => entry[1] !== undefined),
  );
}

function initialAIRole(progress: Record<string, Json>): IntendedAIRole {
  return AI_ROLE_IDS.find((role) => progress[`aiRole_${role}`] === true) ?? "none";
}

function text(value: string | null) {
  return value ?? "";
}

export function CreationWorkspace({ draft }: { draft: BranchDraft }) {
  const router = useRouter();
  const initialProgress = jsonObject(draft.creation_progress);
  const [activeIndex, setActiveIndex] = useState(0);
  const [title, setTitle] = useState(text(draft.title));
  const [originalIdea, setOriginalIdea] = useState(text(draft.original_idea));
  const [shortSummary, setShortSummary] = useState(text(draft.short_summary));
  const [privacy, setPrivacy] = useState<Enums<"privacy_level">>(draft.privacy);
  const [aiRole, setAIRole] = useState<IntendedAIRole>(initialAIRole(initialProgress));
  const [completed, setCompleted] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(steps.map(({ id }) => [id, initialProgress[id] === true])),
  );
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const confirmingRef = useRef(false);

  const snapshot = useMemo<DraftSnapshot>(() => ({
    title,
    originalIdea,
    shortSummary,
    privacy,
    aiRole,
    progress: completed,
  }), [aiRole, completed, originalIdea, privacy, shortSummary, title]);

  function validationFor(index: number): string | null {
    if (index === 1 && !originalIdea.trim()) return "Describe your original idea before continuing.";
    if (index === 2 && !title.trim()) return "Add a concise title before continuing.";
    if (index === 3 && !shortSummary.trim()) return "Add the short summary before continuing.";
    return null;
  }

  async function save(nextCompleted = completed) {
    setSaveState("saving");
    setError(null);
    const result = await saveDraftSnapshotAction(draft.id, {
      ...snapshot,
      progress: nextCompleted,
    });
    if (!result.ok) {
      setSaveState("error");
      setError(result.message);
      return false;
    }
    setSaveState("saved");
    return true;
  }

  function goTo(index: number, requireValid = false) {
    const validation = requireValid ? validationFor(activeIndex) : null;
    if (validation) {
      setError(validation);
      return;
    }
    const nextCompleted = {
      ...completed,
      [steps[activeIndex].id]: true,
    };
    setCompleted(nextCompleted);
    setNotice(null);
    startTransition(async () => {
      if (await save(nextCompleted)) setActiveIndex(index);
    });
  }

  function saveAsDraft() {
    setNotice(null);
    startTransition(async () => {
      if (await save()) setNotice("Your draft is saved. You can safely continue later.");
    });
  }

  function continueWorkspace() {
    setNotice(null);
    startTransition(async () => {
      if (await save()) {
        setNotice("The deeper Creation Workspace will be added next. Your draft remains editable here.");
      }
    });
  }

  function confirm() {
    if (confirmingRef.current) return;
    const missing = [
      !originalIdea.trim() ? "original idea" : null,
      !title.trim() ? "title" : null,
      !shortSummary.trim() ? "short summary" : null,
    ].filter(Boolean);
    if (missing.length) {
      setError(`Complete the ${missing.join(", ")} before confirmation.`);
      return;
    }
    setError(null);
    setNotice(null);
    confirmingRef.current = true;
    startTransition(async () => {
      setSaveState("saving");
      const result = await confirmDraftAction(draft.id, {
        ...snapshot,
        progress: { ...completed, review: true },
      });
      if (!result.ok) {
        confirmingRef.current = false;
        setSaveState("error");
        setError(result.message);
        return;
      }
      setSaveState("saved");
      if (result.branchId) {
        router.replace(`/branches/${result.branchId}`);
      } else {
        confirmingRef.current = false;
        setError("Confirmation completed without returning a branch ID.");
      }
    });
  }

  const saving = isPending || saveState === "saving";

  return (
    <>
      <header className="topbar">
        <div>
          <span className="brand">Constellary</span>
          <button className="back-link review-edit" type="button" onClick={() => router.back()}>
            ← Back
          </button>
        </div>
        <div className="topbar__title">New Branch</div>
        <div className="topbar__right">
          <div className="topbar-actions">
            <SaveStatus state={saveState} />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="creation-shell">
        <StepIndicator
          steps={steps}
          activeIndex={activeIndex}
          completed={completed}
          onSelect={(index) => goTo(index)}
        />

        <div className="workspace">
          <div className="workspace__meta">
            <span>Step {activeIndex + 1} of {steps.length}</span>
            <SaveStatus state={saveState} />
          </div>
          <Panel className="creation-panel">
            <div className="step-content">
              {activeIndex === 0 ? <OriginStep /> : null}
              {activeIndex === 1 ? (
                <OriginalIdeaStep value={originalIdea} onChange={setOriginalIdea} />
              ) : null}
              {activeIndex === 2 ? <TitleStep value={title} onChange={setTitle} /> : null}
              {activeIndex === 3 ? (
                <SummaryStep value={shortSummary} onChange={setShortSummary} />
              ) : null}
              {activeIndex === 4 ? <PreviousWorkStep /> : null}
              {activeIndex === 5 ? <PeopleStep /> : null}
              {activeIndex === 6 ? (
                <PrivacyAIStep
                  privacy={privacy}
                  aiRole={aiRole}
                  onPrivacy={setPrivacy}
                  onAIRole={setAIRole}
                />
              ) : null}
              {activeIndex === 7 ? (
                <ReviewStep
                  title={title}
                  originalIdea={originalIdea}
                  shortSummary={shortSummary}
                  privacy={privacy}
                  aiRole={aiRole}
                  onEdit={setActiveIndex}
                />
              ) : null}
              {error ? <ErrorState title="Needs attention" message={error} /> : null}
              {notice ? <p className="notice" role="status">{notice}</p> : null}
            </div>

            {activeIndex < 7 ? (
              <div className="panel-actions">
                <Button
                  variant="ghost"
                  disabled={activeIndex === 0 || saving}
                  onClick={() => goTo(activeIndex - 1)}
                >
                  Back
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => goTo(activeIndex + 1, true)}
                >
                  {saving ? "Saving…" : "Continue →"}
                </Button>
              </div>
            ) : (
              <div className="panel-actions">
                <div className="action-group">
                  <Button variant="secondary" disabled={saving} onClick={saveAsDraft}>
                    Save as Draft
                  </Button>
                  <Button variant="secondary" disabled={saving} onClick={continueWorkspace}>
                    Continue in Creation Workspace
                  </Button>
                </div>
                <Button disabled={saving} onClick={confirm}>
                  {saving ? "Confirming…" : "Confirm Original Idea"}
                </Button>
              </div>
            )}
          </Panel>
        </div>
      </main>
    </>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  const label = state === "saving" ? "Saving…" : state === "error" ? "Save failed" : "Draft saved";
  return (
    <span className={`save-state save-state--${state}`}>
      <span className="save-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function StepHeading({ eyebrow, title, description }: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p className="lede">{description}</p>
    </>
  );
}

function OriginStep() {
  return (
    <>
      <StepHeading
        eyebrow="Starting point"
        title="Where does this idea begin?"
        description="The origin becomes part of the permanent provenance record when you confirm."
      />
      <div className="choice-grid">
        <button className="choice choice--selected" type="button">
          <strong>Fresh idea</strong>
          <span>A new direction that starts with you.</span>
        </button>
        {["Existing branch", "Paper or reference", "Collaborator or professor"].map((label) => (
          <button className="choice" disabled key={label} type="button">
            <strong>{label}</strong><span>Coming next</span>
          </button>
        ))}
      </div>
    </>
  );
}

function OriginalIdeaStep({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <>
      <StepHeading
        eyebrow="Original Idea"
        title="What direction do you want to explore?"
        description="Capture the idea as it exists now. You can revise it until you confirm this branch."
      />
      <Field label="Idea" hint="Write naturally. This is the protected starting point, not a polished abstract.">
        <Textarea
          autoFocus
          maxLength={50_000}
          placeholder="I want to explore…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    </>
  );
}

function TitleStep({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <>
      <StepHeading
        eyebrow="Title"
        title="Give this direction a clear name."
        description="Keep it concise enough to recognize across branches and provenance paths."
      />
      <Field label="Branch title" hint={`${value.length}/300 characters`}>
        <Input
          autoFocus
          maxLength={300}
          placeholder="e.g. Adaptive memory decay"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    </>
  );
}

function SummaryStep({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <>
      <StepHeading
        eyebrow="Short Summary"
        title="Describe the idea in one short paragraph."
        description="This becomes the hover summary and the first paragraph of the larger summary."
      />
      <Field label="Short summary" hint={`${value.length}/2000 characters`}>
        <Textarea
          autoFocus
          className="textarea--compact"
          maxLength={2_000}
          placeholder="This branch investigates…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    </>
  );
}

function PreviousWorkStep() {
  return (
    <>
      <StepHeading
        eyebrow="Previous Work"
        title="This idea starts independently."
        description="Branch ancestry and linked research stay separate. Both can be added in the next creation workspace."
      />
      <div className="quiet-card"><strong>No parent branch</strong><span>This is a fresh main branch.</span></div>
      <div className="quiet-card"><strong>No linked research yet</strong><span>Add later in the Creation Workspace.</span></div>
    </>
  );
}

function PeopleStep() {
  return (
    <>
      <StepHeading
        eyebrow="People"
        title="Start with a private working space."
        description="You remain the owner. Collaborators can be invited after this first creation flow."
      />
      <div className="quiet-card"><strong>Just me</strong><span>You are the branch owner.</span></div>
      <div className="quiet-card"><strong>Invite collaborators later</strong><span>Roles and permissions will be available next.</span></div>
    </>
  );
}

function PrivacyAIStep({
  privacy,
  aiRole,
  onPrivacy,
  onAIRole,
}: {
  privacy: Enums<"privacy_level">;
  aiRole: IntendedAIRole;
  onPrivacy: (value: Enums<"privacy_level">) => void;
  onAIRole: (value: IntendedAIRole) => void;
}) {
  return (
    <>
      <StepHeading
        eyebrow="Privacy and AI Role"
        title="Choose the boundaries for this branch."
        description="Privacy applies now. The AI choice records only your intended later workflow—nothing is generated here."
      />
      <Field label="Privacy">
        <select
          className="select"
          value={privacy}
          onChange={(event) => onPrivacy(event.target.value as Enums<"privacy_level">)}
        >
          {privacyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} — {option.detail}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Intended AI role" hint="No OpenAI request is made during this flow.">
        <div className="choice-grid">
          {aiOptions.map((option) => (
            <button
              className={`choice ${aiRole === option.value ? "choice--selected" : ""}`}
              key={option.value}
              onClick={() => onAIRole(option.value)}
              type="button"
            >
              <strong>{option.label}</strong><span>{option.detail}</span>
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

function ReviewStep({
  title,
  originalIdea,
  shortSummary,
  privacy,
  aiRole,
  onEdit,
}: {
  title: string;
  originalIdea: string;
  shortSummary: string;
  privacy: Enums<"privacy_level">;
  aiRole: IntendedAIRole;
  onEdit: (index: number) => void;
}) {
  const rows = [
    ["Origin", "Fresh idea", 0],
    ["Original idea", originalIdea || "Not completed", 1],
    ["Title", title || "Not completed", 2],
    ["Short summary", shortSummary || "Not completed", 3],
    ["Previous work", "No parent branch · No linked research yet", 4],
    ["People", "Just me · Invite collaborators later", 5],
    ["Privacy", privacyOptions.find((option) => option.value === privacy)?.label ?? privacy, 6],
    ["AI role", aiOptions.find((option) => option.value === aiRole)?.label ?? aiRole, 6],
  ] as const;

  return (
    <>
      <StepHeading
        eyebrow="Review"
        title="Confirm the branch’s starting point."
        description="After confirmation, the original idea and origin become immutable provenance."
      />
      <dl className="review-list">
        {rows.map(([label, value, index]) => (
          <div className="review-row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
            <button className="review-edit" onClick={() => onEdit(index)} type="button">Edit</button>
          </div>
        ))}
      </dl>
    </>
  );
}
