begin;
-- Each officer keeps a separate draft. Staff proposals never mutate live settings.
create table public.officer_configuration_drafts (
 officer_id uuid primary key references public.officer_profiles(id),
 content jsonb not null, revision integer not null check(revision>0),
 base_revision integer not null check(base_revision>=0), updated_at timestamptz not null default now()
);
create table public.publication_requests (
 id uuid primary key, author_id uuid not null references public.officer_profiles(id),
 content jsonb not null, base_revision integer not null, draft_revision integer not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), reviewed_by uuid references public.officer_profiles(id),
 reviewed_at timestamptz, review_note text,
 check((status='pending' and reviewed_by is null and reviewed_at is null and review_note is null) or
       (status<>'pending' and reviewed_by is not null and reviewed_at is not null and length(trim(review_note)) between 1 and 1000))
);
create unique index one_pending_publication_per_officer on public.publication_requests(author_id) where status='pending';
alter table public.officer_configuration_drafts enable row level security;
alter table public.publication_requests enable row level security;
revoke all on public.officer_configuration_drafts,public.publication_requests from public,anon,authenticated;
grant select on public.officer_configuration_drafts,public.publication_requests to authenticated;
grant all on public.officer_configuration_drafts,public.publication_requests to service_role;
create policy own_draft_read on public.officer_configuration_drafts for select to authenticated
 using ((select public.current_officer_role()) is not null and officer_id=auth.uid());
create policy publication_read on public.publication_requests for select to authenticated
 using ((select public.current_officer_role())='admin' or ((select public.current_officer_role()) is not null and author_id=auth.uid()));

create function public.guard_publication_request() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'Publication history is retained'; end if;
 if old.status<>'pending' or new.id<>old.id or new.author_id<>old.author_id or new.content is distinct from old.content
 or new.base_revision<>old.base_revision or new.draft_revision<>old.draft_revision or new.created_at<>old.created_at then
  raise exception 'Publication snapshots and completed reviews are immutable';
 end if;
 return new;
end;
$$;
revoke all on function public.guard_publication_request() from public,anon,authenticated;
create trigger guard_publication_request before update or delete on public.publication_requests for each row execute function public.guard_publication_request();

create function public.save_officer_configuration_draft(p_content jsonb,p_revision integer,p_base_revision integer,p_submit boolean,p_key uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare old_draft public.officer_configuration_drafts; existing public.publication_requests; cfg public.recruitment_configuration; next_revision integer;
begin
 -- Serialize submissions by author, independently from other officers' drafts.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,8));
 if public.current_officer_role() is distinct from 'staff'::public.officer_role then raise exception 'Active staff access required' using errcode='42501'; end if;
 if p_revision is null or p_revision<0 or p_base_revision is null or p_base_revision<0 or p_submit is null or p_key is null
 or not public.valid_recruitment_document(p_content) then raise exception 'Invalid draft' using errcode='22023'; end if;
 select * into existing from public.publication_requests where id=p_key;
 if found and p_submit then
  if existing.author_id<>auth.uid() or existing.content is distinct from p_content or existing.base_revision<>p_base_revision then
   raise exception 'Request key already used' using errcode='23505';
  end if;
  return existing.draft_revision;
 end if;
 select * into old_draft from public.officer_configuration_drafts where officer_id=auth.uid() for update;
 if coalesce(old_draft.revision,0)<>p_revision then raise exception 'Your draft changed; reload' using errcode='40001'; end if;
 if p_submit then
  select * into cfg from public.recruitment_configuration where id for share;
  if cfg.revision<>p_base_revision then raise exception 'Settings changed; start from latest settings' using errcode='40001'; end if;
  if exists(select 1 from public.publication_requests where author_id=auth.uid() and status='pending') then
   raise exception 'A publication request is already pending' using errcode='23505';
  end if;
 end if;
 next_revision:=p_revision+1;
 insert into public.officer_configuration_drafts(officer_id,content,revision,base_revision) values(auth.uid(),p_content,next_revision,p_base_revision)
 on conflict(officer_id) do update set content=excluded.content,revision=excluded.revision,base_revision=excluded.base_revision,updated_at=now();
 if p_submit then
  insert into public.publication_requests(id,author_id,content,base_revision,draft_revision) values(p_key,auth.uid(),p_content,p_base_revision,next_revision);
 end if;
 return next_revision;
end;
$$;
revoke all on function public.save_officer_configuration_draft(jsonb,integer,integer,boolean,uuid) from public,anon,authenticated;
grant execute on function public.save_officer_configuration_draft(jsonb,integer,integer,boolean,uuid) to authenticated;

create function public.review_publication_request(p_id uuid,p_approve boolean,p_expected_revision integer,p_note text) returns integer
language plpgsql security definer set search_path='' as $$
declare request public.publication_requests; cfg public.recruitment_configuration; result integer;
begin
 -- Coordinate role changes/revocation with the reviewer authorization check.
 perform pg_advisory_xact_lock(80100801);
 if public.current_officer_role() is distinct from 'admin'::public.officer_role then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_approve is null or p_note is null or length(trim(p_note)) not between 1 and 1000 then raise exception 'A review note is required' using errcode='22023'; end if;
 select * into request from public.publication_requests where id=p_id for update;
 if not found then raise exception 'Request not found' using errcode='22023'; end if;
 if request.author_id=auth.uid() then raise exception 'Another admin must review your request' using errcode='42501'; end if;
 if request.status<>'pending' then
  if request.reviewed_by=auth.uid() and request.status=(case when p_approve then 'approved' else 'rejected' end) and request.review_note=trim(p_note) then return request.base_revision+case when p_approve then 1 else 0 end; end if;
  raise exception 'Request already reviewed' using errcode='40001';
 end if;
 select * into cfg from public.recruitment_configuration where id for update;
 result:=cfg.revision;
 if p_approve then
  if p_expected_revision is null or cfg.revision<>p_expected_revision or cfg.revision<>request.base_revision then
   raise exception 'Settings changed; reject this request and request a fresh draft' using errcode='40001';
  end if;
  if not exists(select 1 from public.officer_profiles where id=request.author_id and active and auth_user_id is not null and deletion_requested_at is null) then
   raise exception 'Request author is no longer active' using errcode='22023';
  end if;
  result:=public.save_recruitment_configuration(request.content,cfg.revision,'publish');
 end if;
 update public.publication_requests set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=auth.uid(),reviewed_at=now(),review_note=trim(p_note) where id=p_id;
 return result;
end;
$$;
revoke all on function public.review_publication_request(uuid,boolean,integer,text) from public,anon,authenticated;
grant execute on function public.review_publication_request(uuid,boolean,integer,text) to authenticated;

create function public.change_officer_role(p_id uuid,p_version integer,p_role public.officer_role,p_reason text) returns integer
language plpgsql security definer set search_path='' as $$
declare target public.officer_profiles;
begin
 perform pg_advisory_xact_lock(80100801);
 if public.current_officer_role() is distinct from 'admin'::public.officer_role then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_id=auth.uid() then raise exception 'You cannot change your own role' using errcode='22023'; end if;
 if p_role is null or p_reason is null or length(trim(p_reason)) not between 1 and 1000 then raise exception 'Invalid role change' using errcode='22023'; end if;
 select * into target from public.officer_profiles where id=p_id for update;
 if not found or target.auth_user_id is null or target.deletion_requested_at is not null then raise exception 'Officer unavailable' using errcode='22023'; end if;
 if p_version is null or target.version<>p_version then raise exception 'Officer changed; reload' using errcode='40001'; end if;
 if target.role=p_role then return target.version; end if;
 update public.officer_profiles set role=p_role,version=version+1 where id=p_id;
 insert into public.officer_history(target_id,actor_id,action,reason) values(p_id,auth.uid(),'role_'||p_role::text,trim(p_reason));
 return target.version+1;
end;
$$;
revoke all on function public.change_officer_role(uuid,integer,public.officer_role,text) from public,anon,authenticated;
grant execute on function public.change_officer_role(uuid,integer,public.officer_role,text) to authenticated;

create function public.provision_officer(p_id uuid,p_name text,p_role public.officer_role) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(80100801);
 if public.current_officer_role() is distinct from 'admin'::public.officer_role then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_id is null or p_role is null or p_name is null or length(trim(p_name)) not between 1 and 100 then raise exception 'Invalid officer profile' using errcode='22023'; end if;
 insert into public.officer_profiles(id,display_name,role) values(p_id,trim(p_name),p_role);
 insert into public.officer_history(target_id,actor_id,action,reason) values(p_id,auth.uid(),p_role::text||'_created','Administrator provisioned an officer account.');
 return p_id;
end;
$$;
revoke all on function public.provision_officer(uuid,text,public.officer_role) from public,anon,authenticated;
grant execute on function public.provision_officer(uuid,text,public.officer_role) to authenticated;
commit;
