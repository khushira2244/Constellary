"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { updateBranchPrivacyAction } from "@/app/branches/[branchId]/actions";
import type { Enums } from "@/types/database";

export function ShareBranchControl({
  branchId,
  title,
  privacy,
  canManage,
}: {
  branchId: string;
  title: string;
  privacy: Enums<"privacy_level">;
  canManage: boolean;
}) {
  const router = useRouter();
  const path = `/branches/${branchId}`;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const popover = useRef<HTMLDivElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (urlInput.current) {
      urlInput.current.value = new URL(path, window.location.origin).toString();
    }
  }, [path]);

  async function copyLink() {
    try {
      const canonicalUrl = new URL(path, window.location.origin).toString();
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
    } catch {
      setMessage("Copy failed. Select the URL and copy it manually.");
    }
  }

  function makePublic() {
    startTransition(async () => {
      const result = await updateBranchPrivacyAction(branchId, "public");
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage("Branch is now public.");
      router.refresh();
    });
  }

  return (
    <span className="share-control">
      <button
        type="button"
        aria-label="Share branch"
        title="Share branch"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ↗
      </button>
      {open ? (
        <div className="share-popover" ref={popover} role="dialog" aria-label={`Share ${title}`}>
          <strong>{privacy === "public" ? "Public branch" : "Private branch"}</strong>
          <p>
            {privacy === "public"
              ? "Anyone with this link can view this branch."
              : "This branch is private. Only the owner and authorized collaborators can open this link."}
          </p>
          <input aria-label="Canonical branch URL" defaultValue={path} readOnly ref={urlInput} />
          <div>
            <button type="button" onClick={copyLink}>
              {copied ? "Copied" : privacy === "public" ? "Copy Link" : "Copy Restricted Link"}
            </button>
            <Link href={path} target="_blank" rel="noreferrer">Open Link</Link>
          </div>
          {privacy !== "public" && canManage ? (
            <button type="button" disabled={pending} onClick={makePublic}>
              Change Privacy to Public
            </button>
          ) : null}
          {message ? <small role="status">{message}</small> : null}
        </div>
      ) : null}
    </span>
  );
}
