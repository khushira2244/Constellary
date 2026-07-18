"use client";

import { deleteDashboardDraft } from "@/app/dashboard-actions";

export function DeleteDraftForm({ draftId }: { draftId: string }) {
  return (
    <form
      action={deleteDashboardDraft}
      onSubmit={(event) => {
        if (!window.confirm("Delete this unfinished draft? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="draftId" value={draftId} />
      <button className="dashboard-delete" type="submit">Delete</button>
    </form>
  );
}
