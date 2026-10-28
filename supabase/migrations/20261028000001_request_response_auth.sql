-- Reject anonymous request responses before looking up the request. A NULL
-- auth.uid() previously bypassed the nullable recipient comparison.
create or replace function public.respond_to_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.mentorship_requests;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into req from public.mentorship_requests
    where id = p_request_id for update;
  if req.id is null then
    raise exception 'request not found';
  end if;
  if req.mentor_id is distinct from auth.uid() then
    raise exception 'only the recipient mentor can respond';
  end if;
  if req.status <> 'pending' then
    raise exception 'request is not pending';
  end if;

  update public.mentorship_requests
    set status = case when p_accept then 'accepted'::public.request_status
                      else 'declined'::public.request_status end,
        responded_at = now()
    where id = p_request_id;

  if p_accept then
    insert into public.connections (request_id, mentee_id, mentor_id)
    values (req.id, req.mentee_id, req.mentor_id)
    on conflict (mentee_id, mentor_id) do nothing;
  end if;
end;
$$;

revoke execute on function public.respond_to_request(uuid, boolean) from public, anon;
grant execute on function public.respond_to_request(uuid, boolean) to authenticated;
