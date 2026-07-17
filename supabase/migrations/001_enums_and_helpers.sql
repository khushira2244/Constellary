create extension if not exists pgcrypto;

create type public.privacy_level as enum (
  'private',
  'selected_people',
  'project_members',
  'secure_link',
  'public'
);

create type public.content_visibility as enum (
  'inherit',
  'private',
  'selected_people',
  'branch_members',
  'public'
);

create type public.branch_origin_type as enum (
  'own_idea',
  'existing_branch',
  'existing_subbranch',
  'paper',
  'professor',
  'collaborator',
  'prior_attempt',
  'ai_suggestion',
  'experiment_observation',
  'combined_ideas',
  'other'
);

create type public.branch_status as enum (
  'new',
  'exploring',
  'active',
  'testing',
  'needs_evidence',
  'awaiting_review',
  'changed_direction',
  'produced_new_question',
  'extended_elsewhere',
  'combined_into_another_branch',
  'did_not_support_hypothesis',
  'inconclusive',
  'paused',
  'archived_with_learning',
  'ready_for_supervisor_review',
  'accepted_for_continuation',
  'included_in_thesis',
  'concluded',
  'converted_into_paper',
  'converted_into_product'
);

create type public.branch_relationship_type as enum (
  'developed_from',
  'inspired_by',
  'extends',
  'supports',
  'challenges',
  'contradicts',
  'combines_with',
  'replaces',
  'redirected_by',
  'based_on_evidence_from',
  'derived_from',
  'reproduces',
  'applies_in_another_field',
  'produces_new_question',
  'continues',
  'reuses_method',
  'prior_attempt',
  'references',
  'related_unverified'
);

create type public.summary_type as enum ('short', 'full');
create type public.approval_status as enum (
  'draft',
  'review_required',
  'approved',
  'rejected'
);

create type public.workspace_item_type as enum (
  'note',
  'collaborator_note',
  'voice_note',
  'attempt',
  'observation',
  'experiment',
  'decision',
  'rough_idea'
);

create type public.source_type as enum (
  'paper',
  'book',
  'website',
  'dataset',
  'document',
  'external_reference'
);

create type public.collaborator_role as enum (
  'owner',
  'editor',
  'reviewer',
  'commenter',
  'viewer'
);

create type public.access_scope as enum (
  'entire_branch',
  'selected_content',
  'summary_only',
  'custom'
);

create type public.invitation_status as enum (
  'pending',
  'accepted',
  'declined',
  'expired',
  'revoked'
);

create type public.comment_target_type as enum (
  'branch',
  'summary',
  'workspace_item',
  'source',
  'file'
);

create type public.comment_status as enum ('open', 'resolved', 'deleted');

create type public.ai_target_type as enum (
  'branch',
  'summary',
  'workspace_item',
  'source',
  'file'
);

create type public.ai_contribution_type as enum (
  'idea_suggestion',
  'rewrite',
  'summary_draft',
  'summary_expansion',
  'reference_suggestion',
  'visual_summary_suggestion',
  'classification'
);

create type public.ai_approval_status as enum (
  'generated',
  'edited',
  'approved',
  'rejected'
);

create type public.activity_event_type as enum (
  'branch_confirmed',
  'original_idea_locked',
  'summary_created',
  'summary_updated',
  'summary_approved',
  'branch_linked',
  'branch_unlinked',
  'workspace_item_created',
  'workspace_item_updated',
  'source_added',
  'file_uploaded',
  'comment_added',
  'comment_resolved',
  'collaborator_invited',
  'collaborator_joined',
  'collaborator_removed',
  'ai_content_generated',
  'ai_content_approved',
  'privacy_changed',
  'status_changed'
);

create type public.resource_type as enum (
  'branch',
  'summary',
  'workspace_item',
  'source',
  'file',
  'comment',
  'activity_event'
);

create type public.permission_type as enum (
  'view',
  'comment',
  'edit',
  'review',
  'manage'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

revoke all on function public.set_updated_at() from public;
