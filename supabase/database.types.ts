export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          branch_id: string
          created_at: string
          expires_at: string | null
          granted_by: string
          id: string
          permission: Database["public"]["Enums"]["permission_type"]
          resource_id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          expires_at?: string | null
          granted_by: string
          id?: string
          permission: Database["public"]["Enums"]["permission_type"]
          resource_id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          expires_at?: string | null
          granted_by?: string
          id?: string
          permission?: Database["public"]["Enums"]["permission_type"]
          resource_id?: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_events: {
        Row: {
          actor_id: string | null
          branch_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id: string
          metadata: Json
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          actor_id?: string | null
          branch_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          metadata?: Json
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          actor_id?: string | null
          branch_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: Database["public"]["Enums"]["activity_event_type"]
          id?: string
          metadata?: Json
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_contributions: {
        Row: {
          approval_status: Database["public"]["Enums"]["ai_approval_status"]
          approved_at: string | null
          approved_by: string | null
          branch_id: string
          contribution_type: Database["public"]["Enums"]["ai_contribution_type"]
          created_at: string
          generated_content: Json
          id: string
          input_context_summary: string
          model_name: string
          requested_by: string
          target_id: string | null
          target_type: Database["public"]["Enums"]["ai_target_type"]
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["ai_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          branch_id: string
          contribution_type: Database["public"]["Enums"]["ai_contribution_type"]
          created_at?: string
          generated_content: Json
          id?: string
          input_context_summary: string
          model_name: string
          requested_by: string
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["ai_target_type"]
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["ai_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string
          contribution_type?: Database["public"]["Enums"]["ai_contribution_type"]
          created_at?: string
          generated_content?: Json
          id?: string
          input_context_summary?: string
          model_name?: string
          requested_by?: string
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["ai_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_contributions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_contributions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_contributions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_collaborators: {
        Row: {
          access_scope: Database["public"]["Enums"]["access_scope"]
          added_by: string
          branch_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["collaborator_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          access_scope?: Database["public"]["Enums"]["access_scope"]
          added_by: string
          branch_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["collaborator_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          access_scope?: Database["public"]["Enums"]["access_scope"]
          added_by?: string
          branch_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["collaborator_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_collaborators_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_collaborators_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_drafts: {
        Row: {
          ai_role_data: Json
          collaborators_data: Json
          confirmed_at: string | null
          confirmed_branch_id: string | null
          created_at: string
          creation_progress: Json
          creator_id: string
          id: string
          language: string
          linked_branches_data: Json
          origin_details: Json
          origin_type: Database["public"]["Enums"]["branch_origin_type"] | null
          original_idea: string | null
          parent_branch_id: string | null
          privacy: Database["public"]["Enums"]["privacy_level"]
          short_summary: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_role_data?: Json
          collaborators_data?: Json
          confirmed_at?: string | null
          confirmed_branch_id?: string | null
          created_at?: string
          creation_progress?: Json
          creator_id: string
          id?: string
          language?: string
          linked_branches_data?: Json
          origin_details?: Json
          origin_type?: Database["public"]["Enums"]["branch_origin_type"] | null
          original_idea?: string | null
          parent_branch_id?: string | null
          privacy?: Database["public"]["Enums"]["privacy_level"]
          short_summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_role_data?: Json
          collaborators_data?: Json
          confirmed_at?: string | null
          confirmed_branch_id?: string | null
          created_at?: string
          creation_progress?: Json
          creator_id?: string
          id?: string
          language?: string
          linked_branches_data?: Json
          origin_details?: Json
          origin_type?: Database["public"]["Enums"]["branch_origin_type"] | null
          original_idea?: string | null
          parent_branch_id?: string | null
          privacy?: Database["public"]["Enums"]["privacy_level"]
          short_summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_drafts_confirmed_branch_id_fkey"
            columns: ["confirmed_branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_drafts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_drafts_parent_branch_id_fkey"
            columns: ["parent_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_links: {
        Row: {
          created_at: string
          created_by: string
          id: string
          imported_summary_id: string | null
          relationship_note: string | null
          relationship_type: Database["public"]["Enums"]["branch_relationship_type"]
          source_branch_id: string
          target_branch_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          imported_summary_id?: string | null
          relationship_note?: string | null
          relationship_type: Database["public"]["Enums"]["branch_relationship_type"]
          source_branch_id: string
          target_branch_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          imported_summary_id?: string | null
          relationship_note?: string | null
          relationship_type?: Database["public"]["Enums"]["branch_relationship_type"]
          source_branch_id?: string
          target_branch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_links_imported_summary_id_fkey"
            columns: ["imported_summary_id"]
            isOneToOne: false
            referencedRelation: "branch_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_links_source_branch_id_fkey"
            columns: ["source_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_links_target_branch_id_fkey"
            columns: ["target_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_summaries: {
        Row: {
          ai_contribution_id: string | null
          approved_at: string | null
          approved_by: string | null
          branch_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          is_current: boolean
          status: Database["public"]["Enums"]["approval_status"]
          summary_type: Database["public"]["Enums"]["summary_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          ai_contribution_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          branch_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_current?: boolean
          status?: Database["public"]["Enums"]["approval_status"]
          summary_type: Database["public"]["Enums"]["summary_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          ai_contribution_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_current?: boolean
          status?: Database["public"]["Enums"]["approval_status"]
          summary_type?: Database["public"]["Enums"]["summary_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "branch_summaries_ai_contribution_id_fkey"
            columns: ["ai_contribution_id"]
            isOneToOne: false
            referencedRelation: "ai_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_summaries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_summaries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_summaries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          ai_enabled: boolean
          archived_at: string | null
          confirmed_from_draft_id: string | null
          created_at: string
          id: string
          language: string
          origin_details: Json
          origin_type: Database["public"]["Enums"]["branch_origin_type"]
          original_idea: string
          original_idea_locked_at: string
          owner_id: string
          parent_branch_id: string | null
          privacy: Database["public"]["Enums"]["privacy_level"]
          status: Database["public"]["Enums"]["branch_status"]
          title: string
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          archived_at?: string | null
          confirmed_from_draft_id?: string | null
          created_at?: string
          id?: string
          language?: string
          origin_details?: Json
          origin_type: Database["public"]["Enums"]["branch_origin_type"]
          original_idea: string
          original_idea_locked_at: string
          owner_id: string
          parent_branch_id?: string | null
          privacy?: Database["public"]["Enums"]["privacy_level"]
          status?: Database["public"]["Enums"]["branch_status"]
          title: string
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          archived_at?: string | null
          confirmed_from_draft_id?: string | null
          created_at?: string
          id?: string
          language?: string
          origin_details?: Json
          origin_type?: Database["public"]["Enums"]["branch_origin_type"]
          original_idea?: string
          original_idea_locked_at?: string
          owner_id?: string
          parent_branch_id?: string | null
          privacy?: Database["public"]["Enums"]["privacy_level"]
          status?: Database["public"]["Enums"]["branch_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_confirmed_from_draft_fk"
            columns: ["confirmed_from_draft_id"]
            isOneToOne: true
            referencedRelation: "branch_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_parent_branch_id_fkey"
            columns: ["parent_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_invites: {
        Row: {
          accepted_at: string | null
          access_scope: Database["public"]["Enums"]["access_scope"]
          branch_id: string
          created_at: string
          expires_at: string | null
          id: string
          invitee_email: string
          invitee_user_id: string | null
          inviter_id: string
          role: Database["public"]["Enums"]["collaborator_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          access_scope?: Database["public"]["Enums"]["access_scope"]
          branch_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_email: string
          invitee_user_id?: string | null
          inviter_id: string
          role: Database["public"]["Enums"]["collaborator_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          access_scope?: Database["public"]["Enums"]["access_scope"]
          branch_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_email?: string
          invitee_user_id?: string | null
          inviter_id?: string
          role?: Database["public"]["Enums"]["collaborator_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_invites_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_invites_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          branch_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_comment_id: string | null
          status: Database["public"]["Enums"]["comment_status"]
          target_id: string | null
          target_type: Database["public"]["Enums"]["comment_target_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          author_id: string
          branch_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["comment_target_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          author_id?: string
          branch_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["comment_target_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          branch_id: string
          created_at: string
          deleted_at: string | null
          file_name: string
          file_size: number
          id: string
          mime_type: string
          storage_bucket: string
          storage_path: string
          uploaded_by: string
          visibility: Database["public"]["Enums"]["content_visibility"]
          workspace_item_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          deleted_at?: string | null
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          storage_bucket: string
          storage_path: string
          uploaded_by: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
          workspace_item_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          storage_bucket?: string
          storage_path?: string
          uploaded_by?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
          workspace_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_workspace_item_id_fkey"
            columns: ["workspace_item_id"]
            isOneToOne: false
            referencedRelation: "workspace_items"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_branches: {
        Row: {
          branch_id: string
          created_at: string
          position: number
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          position?: number
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_branches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          discipline: string | null
          display_name: string
          headline: string | null
          id: string
          is_verified: boolean
          preferred_language: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discipline?: string | null
          display_name: string
          headline?: string | null
          id: string
          is_verified?: boolean
          preferred_language?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discipline?: string | null
          display_name?: string
          headline?: string | null
          id?: string
          is_verified?: boolean
          preferred_language?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          added_by: string
          authors: Json
          branch_id: string
          citation_text: string | null
          created_at: string
          description: string | null
          doi: string | null
          id: string
          publication: string | null
          publication_year: number | null
          relationship_type: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          title: string
          updated_at: string
          url: string | null
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          added_by: string
          authors?: Json
          branch_id: string
          citation_text?: string | null
          created_at?: string
          description?: string | null
          doi?: string | null
          id?: string
          publication?: string | null
          publication_year?: number | null
          relationship_type?: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          title: string
          updated_at?: string
          url?: string | null
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          added_by?: string
          authors?: Json
          branch_id?: string
          citation_text?: string | null
          created_at?: string
          description?: string | null
          doi?: string | null
          id?: string
          publication?: string | null
          publication_year?: number | null
          relationship_type?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          title?: string
          updated_at?: string
          url?: string | null
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "sources_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_items: {
        Row: {
          author_id: string
          branch_id: string
          content: Json
          created_at: string
          deleted_at: string | null
          id: string
          item_type: Database["public"]["Enums"]["workspace_item_type"]
          parent_item_id: string | null
          position: number
          title: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          author_id: string
          branch_id: string
          content?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["workspace_item_type"]
          parent_item_id?: string | null
          position?: number
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          author_id?: string
          branch_id?: string
          content?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["workspace_item_type"]
          parent_item_id?: string | null
          position?: number
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "workspace_items_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "workspace_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_collaboration_invite: {
        Args: { invite_token: string }
        Returns: string
      }
      can_comment_branch: {
        Args: { requested_branch_id: string; requested_user_id?: string }
        Returns: boolean
      }
      can_edit_branch: {
        Args: { requested_branch_id: string; requested_user_id?: string }
        Returns: boolean
      }
      can_manage_branch: {
        Args: { requested_branch_id: string; requested_user_id?: string }
        Returns: boolean
      }
      can_view_branch: {
        Args: { requested_branch_id: string; requested_user_id?: string }
        Returns: boolean
      }
      can_view_comment_target: {
        Args: {
          requested_branch_id: string
          requested_target_id: string
          requested_target_type: Database["public"]["Enums"]["comment_target_type"]
          requested_user_id?: string
        }
        Returns: boolean
      }
      can_view_content: {
        Args: {
          requested_branch_id: string
          requested_creator_id: string
          requested_resource_id: string
          requested_resource_type: Database["public"]["Enums"]["resource_type"]
          requested_user_id?: string
          requested_visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Returns: boolean
      }
      confirm_branch_draft: { Args: { draft_id: string }; Returns: Json }
      create_collaboration_invite: {
        Args: {
          requested_access_scope?: Database["public"]["Enums"]["access_scope"]
          requested_branch_id: string
          requested_expires_at?: string | null
          requested_invitee_email: string
          requested_role: Database["public"]["Enums"]["collaborator_role"]
        }
        Returns: Json
      }
      decline_collaboration_invite: {
        Args: { invite_token: string }
        Returns: string
      }
      has_resource_permission: {
        Args: {
          requested_permission: Database["public"]["Enums"]["permission_type"]
          requested_resource_id: string
          requested_resource_type: Database["public"]["Enums"]["resource_type"]
          requested_user_id?: string
        }
        Returns: boolean
      }
      revoke_collaboration_invite: {
        Args: { invitation_id: string }
        Returns: string
      }
      is_branch_member: {
        Args: { requested_branch_id: string; requested_user_id?: string }
        Returns: boolean
      }
      validate_branch_target: {
        Args: {
          target_branch_id: string
          target_kind: string
          target_resource_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      access_scope:
        | "entire_branch"
        | "selected_content"
        | "summary_only"
        | "custom"
      activity_event_type:
        | "branch_confirmed"
        | "original_idea_locked"
        | "summary_created"
        | "summary_updated"
        | "summary_approved"
        | "branch_linked"
        | "branch_unlinked"
        | "workspace_item_created"
        | "workspace_item_updated"
        | "source_added"
        | "file_uploaded"
        | "comment_added"
        | "comment_resolved"
        | "collaborator_invited"
        | "collaborator_joined"
        | "collaborator_removed"
        | "ai_content_generated"
        | "ai_content_approved"
        | "privacy_changed"
        | "status_changed"
      ai_approval_status: "generated" | "edited" | "approved" | "rejected"
      ai_contribution_type:
        | "idea_suggestion"
        | "rewrite"
        | "summary_draft"
        | "summary_expansion"
        | "reference_suggestion"
        | "visual_summary_suggestion"
        | "classification"
      ai_target_type:
        | "branch"
        | "summary"
        | "workspace_item"
        | "source"
        | "file"
      approval_status: "draft" | "review_required" | "approved" | "rejected"
      branch_origin_type:
        | "own_idea"
        | "existing_branch"
        | "existing_subbranch"
        | "paper"
        | "professor"
        | "collaborator"
        | "prior_attempt"
        | "ai_suggestion"
        | "experiment_observation"
        | "combined_ideas"
        | "other"
      branch_relationship_type:
        | "developed_from"
        | "inspired_by"
        | "extends"
        | "supports"
        | "challenges"
        | "contradicts"
        | "combines_with"
        | "replaces"
        | "redirected_by"
        | "based_on_evidence_from"
        | "derived_from"
        | "reproduces"
        | "applies_in_another_field"
        | "produces_new_question"
        | "continues"
        | "reuses_method"
        | "prior_attempt"
        | "references"
        | "related_unverified"
      branch_status:
        | "new"
        | "exploring"
        | "active"
        | "testing"
        | "needs_evidence"
        | "awaiting_review"
        | "changed_direction"
        | "produced_new_question"
        | "extended_elsewhere"
        | "combined_into_another_branch"
        | "did_not_support_hypothesis"
        | "inconclusive"
        | "paused"
        | "archived_with_learning"
        | "ready_for_supervisor_review"
        | "accepted_for_continuation"
        | "included_in_thesis"
        | "concluded"
        | "converted_into_paper"
        | "converted_into_product"
      collaborator_role:
        | "owner"
        | "editor"
        | "reviewer"
        | "commenter"
        | "viewer"
      comment_status: "open" | "resolved" | "deleted"
      comment_target_type:
        | "branch"
        | "summary"
        | "workspace_item"
        | "source"
        | "file"
      content_visibility:
        | "inherit"
        | "private"
        | "selected_people"
        | "branch_members"
        | "public"
      invitation_status:
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "revoked"
      permission_type: "view" | "comment" | "edit" | "review" | "manage"
      privacy_level:
        | "private"
        | "selected_people"
        | "project_members"
        | "secure_link"
        | "public"
      resource_type:
        | "branch"
        | "summary"
        | "workspace_item"
        | "source"
        | "file"
        | "comment"
        | "activity_event"
      source_type:
        | "paper"
        | "book"
        | "website"
        | "dataset"
        | "document"
        | "external_reference"
      summary_type: "short" | "full"
      workspace_item_type:
        | "note"
        | "collaborator_note"
        | "voice_note"
        | "attempt"
        | "observation"
        | "experiment"
        | "decision"
        | "rough_idea"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      access_scope: [
        "entire_branch",
        "selected_content",
        "summary_only",
        "custom",
      ],
      activity_event_type: [
        "branch_confirmed",
        "original_idea_locked",
        "summary_created",
        "summary_updated",
        "summary_approved",
        "branch_linked",
        "branch_unlinked",
        "workspace_item_created",
        "workspace_item_updated",
        "source_added",
        "file_uploaded",
        "comment_added",
        "comment_resolved",
        "collaborator_invited",
        "collaborator_joined",
        "collaborator_removed",
        "ai_content_generated",
        "ai_content_approved",
        "privacy_changed",
        "status_changed",
      ],
      ai_approval_status: ["generated", "edited", "approved", "rejected"],
      ai_contribution_type: [
        "idea_suggestion",
        "rewrite",
        "summary_draft",
        "summary_expansion",
        "reference_suggestion",
        "visual_summary_suggestion",
        "classification",
      ],
      ai_target_type: ["branch", "summary", "workspace_item", "source", "file"],
      approval_status: ["draft", "review_required", "approved", "rejected"],
      branch_origin_type: [
        "own_idea",
        "existing_branch",
        "existing_subbranch",
        "paper",
        "professor",
        "collaborator",
        "prior_attempt",
        "ai_suggestion",
        "experiment_observation",
        "combined_ideas",
        "other",
      ],
      branch_relationship_type: [
        "developed_from",
        "inspired_by",
        "extends",
        "supports",
        "challenges",
        "contradicts",
        "combines_with",
        "replaces",
        "redirected_by",
        "based_on_evidence_from",
        "derived_from",
        "reproduces",
        "applies_in_another_field",
        "produces_new_question",
        "continues",
        "reuses_method",
        "prior_attempt",
        "references",
        "related_unverified",
      ],
      branch_status: [
        "new",
        "exploring",
        "active",
        "testing",
        "needs_evidence",
        "awaiting_review",
        "changed_direction",
        "produced_new_question",
        "extended_elsewhere",
        "combined_into_another_branch",
        "did_not_support_hypothesis",
        "inconclusive",
        "paused",
        "archived_with_learning",
        "ready_for_supervisor_review",
        "accepted_for_continuation",
        "included_in_thesis",
        "concluded",
        "converted_into_paper",
        "converted_into_product",
      ],
      collaborator_role: ["owner", "editor", "reviewer", "commenter", "viewer"],
      comment_status: ["open", "resolved", "deleted"],
      comment_target_type: [
        "branch",
        "summary",
        "workspace_item",
        "source",
        "file",
      ],
      content_visibility: [
        "inherit",
        "private",
        "selected_people",
        "branch_members",
        "public",
      ],
      invitation_status: [
        "pending",
        "accepted",
        "declined",
        "expired",
        "revoked",
      ],
      permission_type: ["view", "comment", "edit", "review", "manage"],
      privacy_level: [
        "private",
        "selected_people",
        "project_members",
        "secure_link",
        "public",
      ],
      resource_type: [
        "branch",
        "summary",
        "workspace_item",
        "source",
        "file",
        "comment",
        "activity_event",
      ],
      source_type: [
        "paper",
        "book",
        "website",
        "dataset",
        "document",
        "external_reference",
      ],
      summary_type: ["short", "full"],
      workspace_item_type: [
        "note",
        "collaborator_note",
        "voice_note",
        "attempt",
        "observation",
        "experiment",
        "decision",
        "rough_idea",
      ],
    },
  },
} as const

