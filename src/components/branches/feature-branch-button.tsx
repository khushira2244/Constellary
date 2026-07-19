"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setBranchFeaturedAction } from "@/app/featured-actions";

export function FeatureBranchButton({
  branchId,
  initialFeatured,
}: {
  branchId: string;
  initialFeatured: boolean;
}) {
  const router = useRouter();
  const [featured, setFeatured] = useState(initialFeatured);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const label = featured ? "Remove from Featured Branches" : "Feature branch";

  return (
    <span className="feature-control">
      <button
        className={`feature-branch-button${featured ? " feature-branch-button--active" : ""}`}
        type="button"
        aria-label={label}
        title={label}
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await setBranchFeaturedAction(branchId, !featured);
            if (!result.ok) {
              setMessage(result.message);
              return;
            }
            setFeatured(result.featured);
            router.refresh();
          });
        }}
      >
        <span aria-hidden="true">{featured ? "★" : "☆"}</span>
      </button>
      {message ? <span className="feature-control__error" role="alert">{message}</span> : null}
    </span>
  );
}
