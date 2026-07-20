"use client";

import { useState, useTransition } from "react";

import { updateBranchCommentAction } from "./actions";

export function CommentEntry({
  branchId,
  commentId,
  content,
  canChange,
  children,
}: {
  branchId: string;
  commentId: string;
  content: string;
  canChange: boolean;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <article>
      {children}
      {editing ? <textarea aria-label="Edit comment" value={draft} onChange={(event) => setDraft(event.target.value)} /> : <p>{content}</p>}
      {canChange ? <div className="compact-row-actions">
        {editing ? <>
          <button disabled={pending || !draft.trim()} onClick={() => startTransition(async () => {
            const result = await updateBranchCommentAction(branchId, commentId, draft);
            setMessage(result.ok ? "Comment updated." : result.message);
            if (result.ok) setEditing(false);
          })} type="button">Save</button>
          <button onClick={() => { setDraft(content); setEditing(false); }} type="button">Cancel</button>
        </> : <button onClick={() => setEditing(true)} type="button">Edit</button>}
      </div> : null}
      {message ? <small role="status">{message}</small> : null}
    </article>
  );
}
