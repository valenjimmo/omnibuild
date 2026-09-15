-- Homeowner identities are visible only to themselves, contractor owners
-- (the tenant-admin role), and the single OmniBuild platform administrator.
drop policy client_read on public.clients;
drop policy client_write on public.clients;

create policy client_read on public.clients for select to authenticated
  using(
    public.is_owner(organization_id) or
    (user_id=auth.uid() and not archived)
  );

create policy client_write on public.clients for all to authenticated
  using(public.is_owner(organization_id))
  with check(public.is_owner(organization_id));
