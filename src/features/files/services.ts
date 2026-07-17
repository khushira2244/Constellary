import { recordActivity } from "@/features/activity/services";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { requireBranchAccess } from "@/lib/permissions/branches";
import { databaseFailure, fail, ok } from "@/lib/services/result";
import type { AppSupabaseClient } from "@/types/database";
import type { FileMetadataInput, FileUploadIntent } from "./types";

const bucket = () => process.env.SUPABASE_PRIVATE_FILES_BUCKET ?? "branch-files";
const maxBytes = 50 * 1024 * 1024;

function validateFile(input: FileMetadataInput) {
  const fileName = input.fileName.trim();
  if (!fileName || /[\\/\0]/.test(fileName)) {
    return fail("VALIDATION_ERROR", "Filename is invalid.");
  }
  if (!/^[\w.+-]+\/[\w.+-]+$/i.test(input.mimeType)) {
    return fail("VALIDATION_ERROR", "MIME type is invalid.");
  }
  if (!Number.isInteger(input.fileSize) || input.fileSize <= 0 || input.fileSize > maxBytes) {
    return fail("VALIDATION_ERROR", "File size must be between 1 byte and 50 MiB.");
  }
  return ok({ ...input, fileName });
}

export async function createFileUploadIntent(
  branchId: string,
  metadata: FileMetadataInput,
  client: AppSupabaseClient,
) {
  const valid = validateFile(metadata);
  if (!valid.ok) return valid;
  const branch = await requireBranchAccess(branchId, "edit", client);
  if (!branch.ok) return branch;
  const storagePath = `${branchId}/${crypto.randomUUID()}-${valid.data.fileName}`;
  const result = await client.storage.from(bucket()).createSignedUploadUrl(storagePath);
  if (result.error) return databaseFailure(result.error.message);
  const intent: FileUploadIntent = {
    bucket: bucket(),
    storagePath,
    signedUploadToken: result.data.token,
    ...("signedUrl" in result.data ? { signedUploadUrl: result.data.signedUrl } : {}),
  };
  return ok(intent);
}

export async function saveUploadedFileMetadata(
  branchId: string,
  metadata: FileMetadataInput,
  client: AppSupabaseClient,
) {
  const valid = validateFile(metadata);
  if (!valid.ok) return valid;
  if (!metadata.storagePath?.startsWith(`${branchId}/`)) {
    return fail("VALIDATION_ERROR", "Storage path does not belong to this branch.");
  }
  const user = await requireCurrentUser(client);
  if (!user.ok) return user;
  const branch = await requireBranchAccess(branchId, "edit", client);
  if (!branch.ok) return branch;
  if (metadata.workspaceItemId) {
    const item = await client.from("workspace_items").select("branch_id")
      .eq("id", metadata.workspaceItemId).maybeSingle();
    if (item.error) return databaseFailure(item.error.message);
    if (!item.data || item.data.branch_id !== branchId) {
      return fail("VALIDATION_ERROR", "File Workspace item must belong to this branch.");
    }
  }
  const result = await client.from("files").insert({
    branch_id: branchId,
    workspace_item_id: metadata.workspaceItemId,
    storage_bucket: bucket(),
    storage_path: metadata.storagePath,
    file_name: valid.data.fileName,
    mime_type: metadata.mimeType,
    file_size: metadata.fileSize,
    uploaded_by: user.data.id,
    visibility: "inherit",
  }).select("*").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(branchId, "file_uploaded", { file_id: result.data.id }, client);
  return ok(result.data);
}

export async function listBranchFiles(branchId: string, client: AppSupabaseClient) {
  const branch = await requireBranchAccess(branchId, "view", client);
  if (!branch.ok) return branch;
  const result = await client.from("files")
    .select("id,branch_id,workspace_item_id,file_name,file_size,mime_type,uploaded_by,visibility,created_at")
    .eq("branch_id", branchId).is("deleted_at", null).order("created_at");
  return result.error ? databaseFailure(result.error.message) : ok(result.data);
}

export async function createSecureFileAccess(
  branchId: string,
  fileId: string,
  client: AppSupabaseClient,
) {
  const branch = await requireBranchAccess(branchId, "view", client);
  if (!branch.ok) return branch;
  const file = await client.from("files").select("*").eq("id", fileId)
    .eq("branch_id", branchId).is("deleted_at", null).maybeSingle();
  if (file.error) return databaseFailure(file.error.message);
  if (!file.data) return fail("NOT_FOUND", "File not found or is not accessible.");
  const signed = await client.storage.from(file.data.storage_bucket)
    .createSignedUrl(file.data.storage_path, 60);
  if (signed.error) return databaseFailure(signed.error.message);
  return ok({ fileId, signedUrl: signed.data.signedUrl, expiresInSeconds: 60 });
}

export async function removeBranchFile(fileId: string, client: AppSupabaseClient) {
  const file = await client.from("files").select("*").eq("id", fileId)
    .is("deleted_at", null).maybeSingle();
  if (file.error) return databaseFailure(file.error.message);
  if (!file.data) return fail("NOT_FOUND", "File not found.");
  const branch = await requireBranchAccess(file.data.branch_id, "edit", client);
  if (!branch.ok) return branch;
  const removed = await client.storage.from(file.data.storage_bucket)
    .remove([file.data.storage_path]);
  if (removed.error) return databaseFailure(removed.error.message);
  const result = await client.from("files").update({ deleted_at: new Date().toISOString() })
    .eq("id", fileId).select("id,branch_id,deleted_at").single();
  if (result.error) return databaseFailure(result.error.message);
  await recordActivity(file.data.branch_id, "file_uploaded", {
    file_id: fileId,
    action: "removed",
  }, client);
  return ok(result.data);
}
