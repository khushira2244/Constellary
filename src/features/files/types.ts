export type FileMetadataInput = {
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath?: string;
  workspaceItemId?: string | null;
};

export type FileUploadIntent = {
  bucket: string;
  storagePath: string;
  signedUploadToken: string;
  signedUploadUrl?: string;
};
