import type { Enums, Json } from "@/types/database";

export type DraftProgress = Record<string, boolean>;

export type DraftCollaborator = {
  email: string;
  role: Exclude<Enums<"collaborator_role">, "owner">;
  access_scope: Enums<"access_scope">;
};

export type DraftLinkedBranch = {
  target_branch_id: string;
  relationship_type: Enums<"branch_relationship_type">;
  relationship_note: string | null;
  snapshot: {
    title: string;
    owner_id: string;
    privacy: Enums<"privacy_level">;
    imported_at: string;
    approved_short_summary: {
      id: string;
      content: string;
      approved_at: string;
    } | null;
  };
};

export type OriginUpdate = {
  originType: Enums<"branch_origin_type"> | null;
  originDetails?: Json;
};
