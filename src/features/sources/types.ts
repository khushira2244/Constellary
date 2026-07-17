import type { Enums, Json } from "@/types/database";

export type SourceInput = {
  sourceType: Enums<"source_type">;
  title: string;
  authors?: Json[];
  publication?: string | null;
  publicationYear?: number | null;
  url?: string | null;
  doi?: string | null;
  citation?: string | null;
  relationshipType?: string | null;
  notes?: string | null;
  visibility?: Enums<"content_visibility">;
};
