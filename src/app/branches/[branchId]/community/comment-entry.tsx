"use client";

import { useState, useTransition } from "react";

import type { Tables } from "@/types/database";

import { updateBranchCommentAction } from "./actions";

export function CommentEntry({
  branchId,
  commentId,
  content,
  canChange,
  onUpdated,
  children,
}: {
  branchId: string;
  commentId: string;
  content: string;
  canChange: boolean;
  onUpdated: (comment: Tables<"comments">) => void;
  children: React.ReactNode;
}) {
  const [savedContent, setSavedContent] = useState(content);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <article>
      {children}
      {editing ? <textarea aria-label="Edit comment" value={draft} onChange={(event) => setDraft(event.target.value)} /> : <p>{savedContent}</p>}
      {canChange ? <div className="compact-row-actions">
        {editing ? <>
          <button disabled={pending || !draft.trim()} onClick={() => startTransition(async () => {
            const result = await updateBranchCommentAction(branchId, commentId, draft);
            setMessage(result.ok ? "Comment updated." : result.message);
            if (result.ok) {
              setSavedContent(result.data.content);
              setDraft(result.data.content);
              onUpdated(result.data);
              setEditing(false);
            }
          })} type="button">Save</button>
          <button onClick={() => { setDraft(savedContent); setEditing(false); }} type="button">Cancel</button>
        </> : <button onClick={() => setEditing(true)} type="button">Edit</button>}
      </div> : null}
      {message ? <small role="status">{message}</small> : null}
    </article>
  );
}
