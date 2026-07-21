"use client";

import { FormEvent, useState, useTransition } from "react";

import type { Tables } from "@/types/database";

import { addBranchCommentAction } from "./actions";

export function CommentComposer({
  branchId,
  onAdded,
}: {
  branchId: string;
  onAdded: (comment: Tables<"comments">) => void;
}) {
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("content", content);
    setMessage(null);
    startTransition(async () => {
      const result = await addBranchCommentAction(branchId, formData);
      setIsError(!result.ok);
      setMessage(result.message);
      if (result.ok) {
        onAdded(result.data);
        setContent("");
      }
    });
  }

  return (
    <form className="comment-compose" onSubmit={submit}>
      <label>
        <span>Add a comment</span>
        <textarea
          aria-describedby="comment-compose-message"
          disabled={pending}
          maxLength={5000}
          name="content"
          onChange={(event) => setContent(event.target.value)}
          required
          value={content}
        />
      </label>
      <button disabled={pending} type="submit">
        {pending ? "Posting…" : "Post Comment"}
      </button>
      {message ? (
        <small
          className={isError ? "form-message form-message-error" : "form-message"}
          id="comment-compose-message"
          role={isError ? "alert" : "status"}
        >
          {message}
        </small>
      ) : null}
    </form>
  );
}
