"use client";

import { useState } from "react";

import type { PublicProfile } from "@/features/branch-reading/types";
import type { Tables } from "@/types/database";
import { ReadingIdentity } from "../reading-page";
import { CommentComposer } from "./comment-composer";
import { CommentEntry } from "./comment-entry";

const roleLabel = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function CommentThread({
  branchId,
  initialComments,
  authors,
  currentUserId,
  canComment,
}: {
  branchId: string;
  initialComments: Tables<"comments">[];
  authors: PublicProfile[];
  currentUserId: string | null;
  canComment: boolean;
}) {
  const [comments, setComments] = useState(initialComments);

  return (
    <>
      {comments.length ? (
        <div className="comment-reading-list">
          {comments.map((comment) => {
            const author = authors.find((profile) => profile.id === comment.author_id);
            const name = author?.display_name ?? author?.username ?? "Research contributor";
            return (
              <CommentEntry
                branchId={branchId}
                commentId={comment.id}
                content={comment.content}
                canChange={comment.author_id === currentUserId}
                key={comment.id}
                onUpdated={(updated) => setComments((current) =>
                  current.map((item) => item.id === updated.id ? updated : item))}
              >
                <ReadingIdentity name={name} avatarUrl={author?.avatar_url} />
                <small>
                  {roleLabel(comment.target_type)} · {new Date(comment.created_at).toLocaleString()}
                  {comment.updated_at !== comment.created_at ? " · Edited" : ""}
                </small>
              </CommentEntry>
            );
          })}
        </div>
      ) : <p className="reading-empty">No readable comments yet.</p>}
      {canComment ? (
        <CommentComposer
          branchId={branchId}
          onAdded={(comment) => setComments((current) => [...current, comment])}
        />
      ) : null}
    </>
  );
}
