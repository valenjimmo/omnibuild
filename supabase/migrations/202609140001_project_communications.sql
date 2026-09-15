-- Project communication preferences and auditable channel metadata.
alter table public.organizations
  add column enabled_message_channels text[] not null default array['portal','email']::text[],
  add constraint valid_enabled_message_channels check(
    cardinality(enabled_message_channels) > 0 and
    enabled_message_channels <@ array['portal','email','sms','whatsapp','wechat']::text[]
  );

alter table public.projects
  add column preferred_message_channel text not null default 'portal'
  check(preferred_message_channel in ('portal','email','sms','whatsapp','wechat'));

alter table public.messages
  add column channel text not null default 'portal'
  check(channel in ('portal','email','sms','whatsapp','wechat'));

alter table public.templates
  add column channel text not null default 'portal'
  check(channel in ('portal','email','sms','whatsapp','wechat'));

-- The public portal route never grants access by itself. A homeowner remains
-- limited by owns_project(), and can only write back through the portal.
drop policy message_send on public.messages;
create policy message_send on public.messages for insert to authenticated
  with check(
    sender_id=auth.uid() and (
      (public.is_staff(organization_id) and exists(
        select 1 from public.organizations o
        where o.id=organization_id and channel=any(o.enabled_message_channels)
      )) or
      (public.owns_project(organization_id,project_id) and channel='portal')
    )
  );

-- OmniBuild has one global operator account. Contractor owners are memberships,
-- not platform administrators, and therefore cannot cross tenant boundaries.
alter table public.platform_admins
  add column singleton boolean not null default true unique check(singleton);

-- Staff can use company templates; only the contractor owner (or platform admin)
-- can create, change, or remove the predefined wording.
drop policy template_staff on public.templates;
create policy template_read on public.templates for select to authenticated
  using(public.is_staff(organization_id));
create policy template_owner_insert on public.templates for insert to authenticated
  with check(public.is_owner(organization_id));
create policy template_owner_update on public.templates for update to authenticated
  using(public.is_owner(organization_id)) with check(public.is_owner(organization_id));
create policy template_owner_delete on public.templates for delete to authenticated
  using(public.is_owner(organization_id));
