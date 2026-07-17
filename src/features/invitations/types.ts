import type { Enums } from "@/types/database";

export type InvitationRole = Exclude<Enums<"collaborator_role">, "owner">;

export type CreateInvitationInput = {
  branchId: string;
  email: string;
  role: InvitationRole;
  accessScope?: Enums<"access_scope">;
  expiresAt?: string | null;
};

export type CreatedInvitation = {
  invitationId: string;
  branchId: string;
  email: string;
  role: InvitationRole;
  accessScope: Enums<"access_scope">;
  expiresAt: string | null;
  token: string;
};

export type CollaboratorAccess = {
  branchId: string;
  userId: string;
  role: Enums<"collaborator_role"> | null;
  accessScope: Enums<"access_scope"> | null;
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
  canComment: boolean;
};
