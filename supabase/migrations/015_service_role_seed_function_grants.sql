-- Comments and AI contribution target triggers call this helper as the
-- inserting role. Keep it private from public while permitting controlled
-- service-role administration.

grant execute on function public.validate_branch_target(uuid, text, uuid)
to service_role;
