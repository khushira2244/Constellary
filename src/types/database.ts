export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "../../supabase/database.types";

import type { Database } from "../../supabase/database.types";

export type AppSupabaseClient = import("@supabase/supabase-js").SupabaseClient<Database>;
export type BranchDraft = Database["public"]["Tables"]["branch_drafts"]["Row"];
export type Branch = Database["public"]["Tables"]["branches"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
