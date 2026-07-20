"use client";

import { useState, useTransition } from "react";

import { inviteCollaboratorAction } from "./actions";

export function InviteCollaboratorForm({ branchId }: { branchId: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="invite-collaborator-form">
      <label><span>Collaborator email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <button disabled={pending || !email.trim()} onClick={() => startTransition(async () => {
        const result = await inviteCollaboratorAction(branchId, email);
        setMessage(result.ok ? "Invitation sent." : result.message);
        if (result.ok) setEmail("");
      })} type="button">{pending ? "Sending…" : "Send invitation"}</button>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
