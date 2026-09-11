-- Omnibuild administrators are explicitly provisioned by the database operator.
create table public.platform_admins(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.platform_admins enable row level security;
create policy admin_self on public.platform_admins for select to authenticated using(user_id=auth.uid());
grant select on public.platform_admins to authenticated;
create function public.is_platform_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.platform_admins where user_id=auth.uid());
$$;
revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;
create or replace function public.is_staff(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_platform_admin() or exists(select 1 from public.memberships where organization_id=org and user_id=auth.uid());
$$;
create or replace function public.is_owner(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_platform_admin() or exists(select 1 from public.memberships where organization_id=org and user_id=auth.uid() and role='owner');
$$;
alter table public.organizations add column contact_email text not null default '', add column website_url text not null default '', add column whatsapp_number text not null default '' check(whatsapp_number='' or whatsapp_number ~ '^[1-9][0-9]{7,14}$');
create function public.create_contractor(company_name text,company_slug text,owner_email text,website text,whatsapp text) returns uuid language plpgsql security definer set search_path='' as $$
declare org uuid;
begin
 if not public.is_platform_admin() then raise exception 'Omnibuild administrator required'; end if;
 insert into public.organizations(name,slug,contact_email,website_url,whatsapp_number) values(company_name,company_slug,owner_email,website,whatsapp) returning id into org;
 return org;
end; $$;
revoke all on function public.create_contractor(text,text,text,text,text) from public;
grant execute on function public.create_contractor(text,text,text,text,text) to authenticated;
-- Contractors are provisioned from the hub; legacy self-provisioning is closed.
revoke execute on function public.create_organization(text,text) from authenticated;

alter table public.invitations drop constraint invitations_role_check;
alter table public.invitations add constraint invitations_role_check check(role in ('owner','staff','client'));
alter table public.invitations drop constraint invitations_check;
alter table public.invitations add constraint invitations_check check((role='client' and client_id is not null) or (role in ('owner','staff') and client_id is null));
drop policy invitation_owner on public.invitations;
create policy invitation_read on public.invitations for select to authenticated using(public.is_owner(organization_id));
create policy invitation_insert on public.invitations for insert to authenticated with check(public.is_owner(organization_id) and (role<>'owner' or public.is_platform_admin()));
create policy invitation_delete on public.invitations for delete to authenticated using(public.is_owner(organization_id));
create or replace function public.accept_invitations() returns void language plpgsql security definer set search_path='' as $$
declare inv record;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 for inv in select * from public.invitations where lower(email)=lower(auth.jwt()->>'email') and accepted_at is null and created_at > now()-interval '7 days' for update loop
  if inv.role in ('owner','staff') then
   insert into public.memberships values(inv.organization_id,auth.uid(),inv.role)
   on conflict(organization_id,user_id) do update set role=case when excluded.role='owner' then 'owner' else public.memberships.role end;
  else
   update public.clients set user_id=auth.uid() where id=inv.client_id and organization_id=inv.organization_id and not archived and lower(email)=lower(inv.email) and (user_id is null or user_id=auth.uid());
   if not found then continue; end if;
  end if;
  update public.invitations set accepted_at=now() where id=inv.id;
 end loop;
end; $$;

create table public.inquiries(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 name text not null,phone text not null,stage text not null default 'New' check(stage in ('New','Contacted','Consultation','Closed')),
 source text not null default 'WhatsApp',created_at timestamptz not null default now(),unique(organization_id,id),unique(organization_id,phone)
);
create table public.inquiry_messages(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,inquiry_id uuid not null,
 provider_id text unique,body text not null,direction text not null check(direction in ('inbound','outbound')),created_at timestamptz not null default now(),
 foreign key(organization_id,inquiry_id) references public.inquiries(organization_id,id)
);
-- Only a platform administrator can map a Meta phone number ID to a tenant.
create table public.whatsapp_accounts(organization_id uuid primary key references public.organizations(id),phone_number_id text not null unique);
alter table public.inquiries enable row level security;
alter table public.inquiry_messages enable row level security;
alter table public.whatsapp_accounts enable row level security;
create policy inquiry_read on public.inquiries for select to authenticated using(public.is_staff(organization_id));
create policy inquiry_update on public.inquiries for update to authenticated using(public.is_staff(organization_id)) with check(public.is_staff(organization_id));
create policy inquiry_message_read on public.inquiry_messages for select to authenticated using(public.is_staff(organization_id));
create policy account_read on public.whatsapp_accounts for select to authenticated using(public.is_staff(organization_id));
create policy account_manage on public.whatsapp_accounts for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
grant select,update on public.inquiries to authenticated;
grant select on public.inquiry_messages to authenticated;
grant select,insert,update,delete on public.whatsapp_accounts to authenticated;
create index on public.inquiries(organization_id);
create index on public.inquiry_messages(organization_id,inquiry_id,created_at);
create trigger immutable_tenant before update on public.inquiries for each row execute function public.protect_tenant_identity();
-- Explicitly public fields used by the linked contractor demonstration website.
create function public.contractor_public_profile(company_slug text) returns table(name text,slug text,whatsapp_number text) language sql stable security definer set search_path='' as $$
 select o.name,o.slug,o.whatsapp_number from public.organizations o where o.slug=company_slug;
$$;
revoke all on function public.contractor_public_profile(text) from public;
grant execute on function public.contractor_public_profile(text) to anon,authenticated;
create function public.ingest_whatsapp(receiving_phone_id text,message_id text,sender_phone text,sender_name text,message_body text,sent_at timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare tenant uuid; lead uuid;
begin
 select organization_id into tenant from public.whatsapp_accounts where phone_number_id=receiving_phone_id;
 if tenant is null then return; end if;
 insert into public.inquiries(organization_id,phone,name) values(tenant,sender_phone,sender_name)
 on conflict(organization_id,phone) do update set name=excluded.name returning id into lead;
 insert into public.inquiry_messages(organization_id,inquiry_id,provider_id,body,direction,created_at)
 values(tenant,lead,message_id,message_body,'inbound',sent_at) on conflict(provider_id) do nothing;
end; $$;
revoke all on function public.ingest_whatsapp(text,text,text,text,text,timestamptz) from public;
grant execute on function public.ingest_whatsapp(text,text,text,text,text,timestamptz) to service_role;
