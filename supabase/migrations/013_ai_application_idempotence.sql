create unique index branch_summaries_unique_ai_application_idx
  on public.branch_summaries (ai_contribution_id)
  where ai_contribution_id is not null;

create unique index workspace_items_unique_ai_application_idx
  on public.workspace_items ((content ->> 'ai_contribution_id'))
  where
    content ? 'ai_contribution_id'
    and nullif(content ->> 'ai_contribution_id', '') is not null;
