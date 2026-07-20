-- Comment target validation must remain private while still running for
-- authenticated inserts. The trigger executes with its owner privileges; RLS
-- remains responsible for deciding who may insert the comment row.

alter function public.enforce_comment_target() security definer;

revoke all on function public.enforce_comment_target() from public;
revoke all on function public.validate_branch_target(uuid, text, uuid) from public;
