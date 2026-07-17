import type { Enums, Json } from "@/types/database";

export type VoiceNoteMetadata = {
  durationSeconds?: number;
  transcript?: string;
  language?: string;
  fileId?: string;
  [key: string]: Json | undefined;
};

export type VisualSummaryContent = {
  version: number;
  nodes?: Json[];
  edges?: Json[];
  layout?: Json;
  [key: string]: Json | undefined;
};

export type CollaboratorNoteVisibility = Enums<"content_visibility">;
