"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState, useTransition } from "react";

import { addBranchCommentAction } from "./actions";

export function CommentComposer({ branchId }: { branchId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setMessage(null);
    startTransition(async () => {
      const result = await addBranchCommentAction(branchId, formData);
      setIsError(!result.ok);
      setMessage(result.message);
      if (result.ok) {
        formRef.current?.reset();
        router.refresh();
      }
    });
  }

  return (
    <form className="comment-compose" onSubmit={submit} ref={formRef}>
      <label>
        <span>Add a comment</span>
        <textarea
          aria-describedby="comment-compose-message"
          disabled={pending}
          maxLength={5000}
          name="content"
          required
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
