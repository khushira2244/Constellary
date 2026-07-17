import type { Enums, Tables } from "@/types/database";

export type EditableBranchSettings = Pick<
  Tables<"branches">,
  "id" | "privacy" | "status" | "ai_enabled" | "updated_at"
>;

export type PermanentCollaboratorRole = Exclude<Enums<"collaborator_role">, "owner">;
