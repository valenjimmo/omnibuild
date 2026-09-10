-- Tenant ownership cannot be moved by submitting a different organization_id.
create function public.protect_tenant_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if new.id<>old.id or new.organization_id<>old.organization_id then raise exception 'Record and organization identity are immutable'; end if;
 return new;
end;
$$;
do $$ declare t text; begin
 foreach t in array array['clients','projects','milestones','updates','documents','messages','templates','invitations'] loop
  execute format('create trigger immutable_tenant before update on public.%I for each row execute function public.protect_tenant_identity()',t);
  execute format('create index on public.%I (organization_id)',t);
 end loop;
end $$;
create index on public.clients(user_id);
create index on public.projects(client_id);
create index on public.milestones(project_id);
create index on public.updates(project_id);
create index on public.documents(project_id);
create index on public.messages(project_id,created_at);
create index on public.memberships(user_id);
create function public.protect_client_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user='authenticated' then
  if tg_op='INSERT' then
   if new.user_id is not null then raise exception 'Use invitations to assign client access'; end if;
  elsif new.user_id is distinct from old.user_id then raise exception 'Use invitations to assign client access';
  end if;
 end if;
 return new;
end;
$$;
create trigger protect_client_user before insert or update on public.clients for each row execute function public.protect_client_identity();
