create extension if not exists pgcrypto;
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 120),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'), logo_url text, created_at timestamptz not null default now()
);
create table public.memberships (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','staff')), primary key(organization_id,user_id)
);
create table public.clients (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid references auth.users(id), name text not null, email text not null, phone text not null default '', archived boolean not null default false,
 created_at timestamptz not null default now(), unique(organization_id,id), unique(organization_id,email)
);
create table public.projects (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 client_id uuid not null, name text not null, address text not null default '', description text not null default '',
 status text not null default 'Planning' check(status in ('Planning','Permitting','In progress','On hold','Completed')),
 due_date date, created_at timestamptz not null default now(), unique(organization_id,id),
 foreign key(organization_id,client_id) references public.clients(organization_id,id)
);
create table public.milestones (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null,
 title text not null, due_date date, completed boolean not null default false, created_at timestamptz not null default now(),
 foreign key(organization_id,project_id) references public.projects(organization_id,id) on delete cascade
);
create table public.updates (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null,
 title text not null, body text not null, client_visible boolean not null default true, created_at timestamptz not null default now(),
 foreign key(organization_id,project_id) references public.projects(organization_id,id) on delete cascade
);
create table public.documents (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null,
 name text not null, path text not null unique, kind text not null check(kind in ('document','photo')), size bigint not null default 0,
 client_visible boolean not null default true, created_at timestamptz not null default now(),
 foreign key(organization_id,project_id) references public.projects(organization_id,id) on delete cascade,
 check(split_part(path,'/',1)=organization_id::text and split_part(path,'/',2)=project_id::text and array_length(string_to_array(path,'/'),1)=3)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null,
 sender_id uuid not null default auth.uid() references auth.users(id), body text not null check(length(body) between 1 and 5000),
 responses jsonb not null default '[]'::jsonb check(jsonb_typeof(responses)='array'), created_at timestamptz not null default now(),
 foreign key(organization_id,project_id) references public.projects(organization_id,id) on delete cascade
);
create table public.templates (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null, body text not null, responses jsonb not null default '[]'::jsonb check(jsonb_typeof(responses)='array'), created_at timestamptz not null default now()
);
create table public.invitations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 email text not null, role text not null check(role in ('staff','client')), client_id uuid,
 created_at timestamptz not null default now(), accepted_at timestamptz,
 foreign key(organization_id,client_id) references public.clients(organization_id,id),
 check((role='client' and client_id is not null) or (role='staff' and client_id is null))
);

create function public.is_staff(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where organization_id=org and user_id=auth.uid());
$$;
create function public.is_owner(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where organization_id=org and user_id=auth.uid() and role='owner');
$$;
create function public.owns_project(org uuid, project uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.projects p join public.clients c on c.id=p.client_id and c.organization_id=p.organization_id
 where p.id=project and p.organization_id=org and c.user_id=auth.uid() and not c.archived);
$$;
create function public.can_view_org(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_staff(org) or exists(select 1 from public.clients where organization_id=org and user_id=auth.uid() and not archived);
$$;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.updates enable row level security;
alter table public.documents enable row level security;
alter table public.messages enable row level security;
alter table public.templates enable row level security;
alter table public.invitations enable row level security;

create policy org_read on public.organizations for select to authenticated using(public.can_view_org(id));
create policy org_edit on public.organizations for update to authenticated using(public.is_owner(id)) with check(public.is_owner(id));
create policy member_read on public.memberships for select to authenticated using(public.is_staff(organization_id));
create policy client_read on public.clients for select to authenticated using(public.is_staff(organization_id) or (user_id=auth.uid() and not archived));
create policy client_write on public.clients for all to authenticated using(public.is_staff(organization_id)) with check(public.is_staff(organization_id));
create policy project_read on public.projects for select to authenticated using(public.is_staff(organization_id) or public.owns_project(organization_id,id));
create policy project_write on public.projects for all to authenticated using(public.is_staff(organization_id)) with check(public.is_staff(organization_id));
create policy milestone_read on public.milestones for select to authenticated using(public.is_staff(organization_id) or public.owns_project(organization_id,project_id));
create policy milestone_write on public.milestones for all to authenticated using(public.is_staff(organization_id)) with check(public.is_staff(organization_id));
create policy update_read on public.updates for select to authenticated using(public.is_staff(organization_id) or (client_visible and public.owns_project(organization_id,project_id)));
create policy update_write on public.updates for all to authenticated using(public.is_staff(organization_id)) with check(public.is_staff(organization_id));
create policy document_read on public.documents for select to authenticated using(public.is_staff(organization_id) or (client_visible and public.owns_project(organization_id,project_id)));
create policy document_write on public.documents for all to authenticated using(public.is_staff(organization_id)) with check(public.is_staff(organization_id));
create policy message_read on public.messages for select to authenticated using(public.is_staff(organization_id) or public.owns_project(organization_id,project_id));
create policy message_send on public.messages for insert to authenticated with check(sender_id=auth.uid() and (public.is_staff(organization_id) or public.owns_project(organization_id,project_id)));
create policy template_staff on public.templates for all to authenticated using(public.is_staff(organization_id)) with check(public.is_staff(organization_id));
create policy invitation_owner on public.invitations for all to authenticated using(public.is_owner(organization_id)) with check(public.is_owner(organization_id));

create function public.create_organization(company_name text, company_slug text) returns uuid language plpgsql security definer set search_path='' as $$
declare org uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.organizations(name,slug) values(company_name,company_slug) returning id into org;
 insert into public.memberships values(org,auth.uid(),'owner');
 insert into public.templates(organization_id,title,body,responses) values
 (org,'Schedule a site visit','We would love to walk you through the progress. Does this week work for a site visit?','["Yes, that works!","Could we find another time?"]');
 return org;
end;
$$;
create function public.accept_invitations() returns void language plpgsql security definer set search_path='' as $$
declare inv record;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 for inv in select * from public.invitations where lower(email)=lower(auth.jwt()->>'email') and accepted_at is null and created_at > now()-interval '7 days' for update loop
  if inv.role='staff' then
   insert into public.memberships values(inv.organization_id,auth.uid(),'staff') on conflict do nothing;
  else
   update public.clients set user_id=auth.uid() where id=inv.client_id and organization_id=inv.organization_id and not archived and lower(email)=lower(inv.email) and (user_id is null or user_id=auth.uid());
   if not found then continue; end if;
  end if;
  update public.invitations set accepted_at=now() where id=inv.id;
 end loop;
end;
$$;
revoke all on function public.create_organization(text,text), public.accept_invitations(), public.is_staff(uuid), public.is_owner(uuid), public.owns_project(uuid,uuid), public.can_view_org(uuid) from public;
grant execute on function public.create_organization(text,text), public.accept_invitations(), public.is_staff(uuid), public.is_owner(uuid), public.owns_project(uuid,uuid), public.can_view_org(uuid) to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('project-files','project-files',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','text/plain']);
create function public.can_upload_path(object_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.projects p where p.organization_id::text=split_part(object_path,'/',1)
 and p.id::text=split_part(object_path,'/',2) and public.is_staff(p.organization_id))
 and array_length(string_to_array(object_path,'/'),1)=3;
$$;
revoke all on function public.can_upload_path(text) from public;
grant execute on function public.can_upload_path(text) to authenticated;
create policy file_insert on storage.objects for insert to authenticated with check(bucket_id='project-files' and public.can_upload_path(name));
create policy file_read on storage.objects for select to authenticated using(bucket_id='project-files' and exists(select 1 from public.documents d where d.path=storage.objects.name));
create policy file_delete on storage.objects for delete to authenticated using(bucket_id='project-files' and public.can_upload_path(name));
