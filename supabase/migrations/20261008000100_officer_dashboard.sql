begin;
create table public.application_notes (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id),
 actor_id uuid not null references public.officer_profiles(id), body text not null check(length(trim(body)) between 1 and 5000),
 event_key uuid not null unique, created_at timestamptz not null default now()
);
create table public.officer_history (
 id uuid primary key default gen_random_uuid(), target_id uuid not null references public.officer_profiles(id),
 actor_id uuid references public.officer_profiles(id), action text not null, reason text not null,
 created_at timestamptz not null default now()
);
alter table public.application_notes enable row level security;
alter table public.officer_history enable row level security;
revoke all on public.application_notes, public.officer_history from public, anon, authenticated;
grant select on public.application_notes, public.officer_history to authenticated;
grant all on public.application_notes, public.officer_history to service_role;
create policy notes_read on public.application_notes for select to authenticated using ((select public.current_officer_role()) is not null);
create policy officers_audit_read on public.officer_history for select to authenticated using ((select public.current_officer_role()) = 'admin');
create trigger immutable_application_notes before update or delete on public.application_notes for each row execute function public.reject_history_changes();
create trigger immutable_officer_history before update or delete on public.officer_history for each row execute function public.reject_history_changes();
create index notes_application_idx on public.application_notes(application_id, created_at desc);

-- Preserve historical officer attribution when the login account is deleted.
alter table public.officer_profiles drop constraint officer_profiles_id_fkey;
alter table public.officer_profiles add column auth_user_id uuid unique references auth.users(id) on delete set null;
update public.officer_profiles set auth_user_id=id;
alter table public.officer_profiles add column version integer not null default 1;
alter table public.officer_profiles add column deletion_requested_at timestamptz;
alter table public.officer_profiles add column deleted_at timestamptz;
alter table public.officer_profiles add constraint officer_identity_check check(auth_user_id is null or auth_user_id=id);
alter table public.officer_profiles add constraint officer_access_check check(not active or (auth_user_id is not null and deletion_requested_at is null));
create or replace function public.current_officer_role() returns public.officer_role
language sql stable security definer set search_path='' as $$
 select role from public.officer_profiles where id=auth.uid() and auth_user_id=auth.uid() and active and deletion_requested_at is null;
$$;
create function public.guard_officer_identity() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(80100801);
 if tg_op='INSERT' then
  new.auth_user_id := new.id;
  return new;
 end if;
 if tg_op='UPDATE' and new.auth_user_id is null then
  new.active := false;
  new.deleted_at := coalesce(new.deleted_at, now());
 end if;
 if old.role='admin' and old.active and old.auth_user_id is not null then
  if tg_op='DELETE' or (tg_op='UPDATE' and (not new.active or new.role<>'admin' or new.auth_user_id is null)) then
   if not exists(select 1 from public.officer_profiles where role='admin' and active and auth_user_id is not null and id<>old.id) then
    raise exception 'The last active admin cannot be removed' using errcode='22023';
   end if;
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 if old.auth_user_id is not null and new.auth_user_id is null then
  insert into public.officer_history(target_id,action,reason) values(old.id,'account_deleted','Login account deleted; historical officer attribution retained.');
  new.version := old.version+1;
 end if;
 return new;
end;
$$;
revoke all on function public.guard_officer_identity() from public, anon, authenticated;
create trigger guard_officer_identity before insert or update or delete on public.officer_profiles for each row execute function public.guard_officer_identity();

create function public.manage_officer(p_id uuid,p_version integer,p_action text,p_reason text,p_confirmation text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare target public.officer_profiles;
begin
 perform pg_advisory_xact_lock(80100801);
 if public.current_officer_role() is distinct from 'admin'::public.officer_role then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_id=auth.uid() then raise exception 'You cannot remove your own access' using errcode='22023'; end if;
 if p_action is null or p_action not in ('suspend','activate','delete') or p_reason is null or length(trim(p_reason)) not between 1 and 1000 then raise exception 'Invalid officer request' using errcode='22023'; end if;
 select * into target from public.officer_profiles where id=p_id for update;
 if not found then raise exception 'Officer not found' using errcode='22023'; end if;
 if p_version is null or target.version<>p_version then raise exception 'Officer changed; reload' using errcode='40001'; end if;
 if p_action='delete' and p_confirmation is distinct from target.display_name then raise exception 'Type the officer display name to confirm deletion' using errcode='22023'; end if;
 if target.auth_user_id is null then return jsonb_build_object('auth_user_id',null,'deleted',true); end if;
 if target.deletion_requested_at is not null then
  if p_action<>'delete' then raise exception 'Deletion is pending; retry deletion' using errcode='22023'; end if;
  return jsonb_build_object('auth_user_id',target.auth_user_id,'deleted',false);
 end if;
 update public.officer_profiles set active=(p_action='activate'),
  deletion_requested_at=case when p_action='delete' then now() else null end,version=version+1 where id=p_id;
 insert into public.officer_history(target_id,actor_id,action,reason) values(p_id,auth.uid(),p_action,trim(p_reason));
 return jsonb_build_object('auth_user_id',target.auth_user_id,'deleted',false);
end;
$$;
revoke all on function public.manage_officer(uuid,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.manage_officer(uuid,integer,text,text,text) to authenticated;

create function public.provision_staff(p_id uuid,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(80100801);
 if public.current_officer_role() is distinct from 'admin'::public.officer_role then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_id is null or p_name is null or length(trim(p_name)) not between 1 and 100 then raise exception 'Invalid staff profile' using errcode='22023'; end if;
 insert into public.officer_profiles(id,display_name,role) values(p_id,trim(p_name),'staff');
 insert into public.officer_history(target_id,actor_id,action,reason) values(p_id,auth.uid(),'staff_created','Administrator provisioned a staff account.');
 return p_id;
end;
$$;
revoke all on function public.provision_staff(uuid,text) from public,anon,authenticated;
grant execute on function public.provision_staff(uuid,text) to authenticated;

create function public.add_application_note(p_id uuid,p_key uuid,p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; existing public.application_notes;
begin
 if public.current_officer_role() is null then raise exception 'Officer access required' using errcode='42501'; end if;
 if p_key is null or p_body is null or length(trim(p_body)) not between 1 and 5000 then raise exception 'Invalid note' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,1));
 select * into existing from public.application_notes where event_key=p_key;
 if found then
  if existing.application_id<>p_id or existing.actor_id<>auth.uid() or existing.body<>trim(p_body) then raise exception 'Note key already used' using errcode='23505'; end if;
  return existing.id;
 end if;
 if not exists(select 1 from public.applications where id=p_id) then raise exception 'Application not found' using errcode='22023'; end if;
 insert into public.application_notes(application_id,actor_id,event_key,body) values(p_id,auth.uid(),p_key,trim(p_body)) returning id into result;
 return result;
end;
$$;
revoke all on function public.add_application_note(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.add_application_note(uuid,uuid,text) to authenticated;

create function public.triage_application(p_id uuid,p_version integer,p_status public.application_status,p_reason text) returns integer
language plpgsql security definer set search_path='' as $$
declare target public.applications; officer public.officer_role;
begin
 officer := public.current_officer_role();
 if officer is null then raise exception 'Officer access required' using errcode='42501'; end if;
 if p_reason is null or length(trim(p_reason)) not between 1 and 5000 then raise exception 'A reason is required' using errcode='22023'; end if;
 select * into target from public.applications where id=p_id for update;
 if not found then raise exception 'Application not found' using errcode='22023'; end if;
 if p_version is null or target.version<>p_version then raise exception 'Application changed; reload before deciding' using errcode='40001'; end if;
 if not coalesce((target.status='pending_review' and p_status in ('closed','withdrawn')) or
  (officer='admin' and target.status in ('closed','withdrawn') and p_status='pending_review'),false) then
  raise exception 'This transition requires the appropriate workflow' using errcode='22023';
 end if;
 update public.applications set status=p_status,version=version+1,updated_at=now() where id=p_id;
 insert into public.status_history(application_id,old_status,new_status,actor_id,reason) values(p_id,target.status,p_status,auth.uid(),trim(p_reason));
 return target.version+1;
end;
$$;
revoke all on function public.triage_application(uuid,integer,public.application_status,text) from public,anon,authenticated;
grant execute on function public.triage_application(uuid,integer,public.application_status,text) to authenticated;

create function public.list_applications(p_query text default '',p_status public.application_status default null,p_mode public.tryout_mode default null,p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if public.current_officer_role() is null then raise exception 'Officer access required' using errcode='42501'; end if;
 if p_query is null or length(p_query)>100 or p_page is null or p_page not between 1 and 100000 then raise exception 'Invalid filters' using errcode='22023'; end if;
 with filtered as (
  select id,reference,ign,mode,selected_map,status,created_at from public.applications
  where (p_status is null or status=p_status) and (p_mode is null or mode=p_mode)
  and (p_query='' or position(lower(p_query) in lower(ign))>0 or position(lower(p_query) in reference::text)>0)
 ), page as (select * from filtered order by created_at desc,id limit 20 offset (p_page-1)*20)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id) from page),'[]'::jsonb),
  'count',(select count(*) from filtered),'total',(select count(*) from public.applications),
  'pending',(select count(*) from public.applications where status='pending_review')) into result;
 return result;
end;
$$;
revoke all on function public.list_applications(text,public.application_status,public.tryout_mode,integer) from public,anon,authenticated;
grant execute on function public.list_applications(text,public.application_status,public.tryout_mode,integer) to authenticated;
commit;
