begin;
alter table public.recruitment_configuration drop constraint recruitment_configuration_recruitment_open_check;
alter table public.recruitment_configuration add column intake_version integer not null default 0;
alter table public.recruitment_configuration add column published_revision integer not null default 0;
update public.recruitment_configuration set published_revision = revision where published_content is not null;
alter table public.applications add column submission_payload jsonb;
alter table public.applications add column submission_snapshot jsonb;

create table public.intake_history (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.officer_profiles(id),
  recruitment_open boolean not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create table public.application_rate_limits (
  bucket text primary key,
  started_at timestamptz not null,
  submissions integer not null
);
alter table public.intake_history enable row level security;
alter table public.application_rate_limits enable row level security;
revoke all on public.intake_history, public.application_rate_limits from public, anon, authenticated;
grant select on public.intake_history to authenticated;
grant all on public.intake_history, public.application_rate_limits to service_role;
create policy intake_admin_read on public.intake_history for select to authenticated using ((select public.current_officer_role()) = 'admin');
create trigger immutable_intake_history before update or delete on public.intake_history for each row execute function public.reject_history_changes();

create function public.intake_ready(doc jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select public.valid_recruitment_document(doc) and
    length(trim(coalesce(doc->>'applicationFields',''))) > 0 and
    length(trim(coalesce(doc->>'retentionPolicy',''))) > 0 and
    length(trim(coalesce(doc->>'correctionContact',''))) > 0 and
    length(trim(coalesce(doc->>'discordUrl',''))) > 0 and
    length(trim(coalesce(doc->>'discordRequirement',''))) > 0 and
    exists (select 1 from jsonb_each(doc->'modes') m where m.value->'approved' = 'true'::jsonb
      and (m.key = 'tdm' or jsonb_array_length(m.value->'maps') > 0));
$$;
revoke all on function public.intake_ready(jsonb) from public, anon, authenticated;

create function public.guard_intake() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.published_content is distinct from old.published_content or new.published_at is distinct from old.published_at then
    new.recruitment_open := false;
    new.published_revision := new.revision;
  end if;
  if new.recruitment_open and not coalesce(public.intake_ready(new.published_content), false) then
    raise exception 'Publish approved fields, privacy/contact, Discord and at least one ready mode before opening intake' using errcode = '22023';
  end if;
  if new.recruitment_open is distinct from old.recruitment_open then
    new.intake_version := old.intake_version + 1;
    insert into public.intake_history(actor_id, recruitment_open, reason)
      values (auth.uid(), new.recruitment_open, case when new.published_content is distinct from old.published_content
        then 'Intake paused because published settings changed.' else 'Administrator changed intake availability.' end);
  end if;
  return new;
end;
$$;
revoke all on function public.guard_intake() from public, anon, authenticated;
create trigger guard_intake before update on public.recruitment_configuration for each row execute function public.guard_intake();

create function public.set_recruitment_intake(p_open boolean, p_expected_version integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare result integer;
begin
  if public.current_officer_role() is distinct from 'admin'::public.officer_role then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_open is null or p_expected_version is null or p_expected_version < 0 then raise exception 'Invalid intake request' using errcode = '22023'; end if;
  update public.recruitment_configuration set recruitment_open = p_open, updated_by = auth.uid(), updated_at = now()
    where id and intake_version = p_expected_version returning intake_version into result;
  if result is null then raise exception 'Intake settings changed; reload before saving' using errcode = '40001'; end if;
  return result;
end;
$$;
revoke all on function public.set_recruitment_intake(boolean, integer) from public, anon, authenticated;
grant execute on function public.set_recruitment_intake(boolean, integer) to authenticated;

create function public.get_public_application_configuration() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('content', public.get_public_configuration(), 'revision', published_revision, 'open', recruitment_open)
  from public.recruitment_configuration where id;
$$;
revoke all on function public.get_public_application_configuration() from public, anon, authenticated;
grant execute on function public.get_public_application_configuration() to anon, authenticated;

-- Only the trusted server can supply the hashed rate bucket. Never expose this RPC to browsers.
create function public.submit_application(p_key uuid, p_revision integer, p_payload jsonb, p_bucket text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare cfg public.recruitment_configuration; existing public.applications; mode_doc jsonb;
  result uuid; attempts integer; field text; selected text;
begin
  if p_key is null or p_revision is null or p_bucket is null or p_bucket !~ '^[a-f0-9]{64}$' then raise exception 'Invalid submission' using errcode = '22023'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 15000 then raise exception 'Invalid application' using errcode = '22023'; end if;
  if (select count(*) from jsonb_object_keys(p_payload)) <> 11 then raise exception 'Invalid application fields' using errcode = '22023'; end if;
  foreach field in array array['ign','first_name','last_name','rank','previous_clan','facebook_url','discord_name','reason','mode','selected_map'] loop
    if jsonb_typeof(p_payload->field) is distinct from 'string' then raise exception 'Invalid application fields' using errcode = '22023'; end if;
  end loop;
  if p_payload->'consent' is distinct from 'true'::jsonb or length(trim(p_payload->>'ign')) not between 1 and 100
    or length(trim(p_payload->>'discord_name')) not between 1 and 100 or length(trim(p_payload->>'reason')) not between 1 and 2000
    or length(p_payload->>'first_name') > 100 or length(p_payload->>'last_name') > 100 or length(p_payload->>'rank') > 100
    or length(p_payload->>'previous_clan') > 150 or length(p_payload->>'selected_map') > 100 or length(p_payload->>'facebook_url') > 500
    or (p_payload->>'facebook_url' <> '' and (p_payload->>'facebook_url') !~* '^https://(facebook\.com|www\.facebook\.com|m\.facebook\.com|fb\.com)(:443)?([/?#][^[:space:]]*)?$')
    or p_payload->>'mode' not in ('tdm','zm_hmx','escape') then raise exception 'Invalid application' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_key::text, 0));
  select * into existing from public.applications where submission_key = p_key;
  if found then
    if existing.submission_payload is distinct from p_payload or existing.acknowledgement_version <> 'config:' || p_revision::text then
      raise exception 'Submission key already used for different details' using errcode = '23505';
    end if;
    return existing.reference;
  end if;
  select * into cfg from public.recruitment_configuration where id for share;
  if not cfg.recruitment_open then raise exception 'Recruitment is closed' using errcode = 'P0001'; end if;
  if cfg.published_revision <> p_revision then raise exception 'Published requirements changed; refresh and review them' using errcode = '40001'; end if;
  mode_doc := cfg.published_content->'modes'->(p_payload->>'mode');
  selected := p_payload->>'selected_map';
  if mode_doc->'approved' is distinct from 'true'::jsonb then raise exception 'Mode unavailable' using errcode = '22023'; end if;
  if p_payload->>'mode' = 'tdm' then
    if selected <> '' then raise exception 'TDM does not require a map' using errcode = '22023'; end if;
  elsif not (mode_doc->'maps' @> jsonb_build_array(selected)) then raise exception 'Choose an approved map' using errcode = '22023'; end if;
  delete from public.application_rate_limits where started_at < now() - interval '1 day';
  insert into public.application_rate_limits(bucket, started_at, submissions) values (p_bucket, now(), 1)
    on conflict (bucket) do update set
      submissions = case when application_rate_limits.started_at < now() - interval '10 minutes' then 1 else application_rate_limits.submissions + 1 end,
      started_at = case when application_rate_limits.started_at < now() - interval '10 minutes' then now() else application_rate_limits.started_at end
    returning submissions into attempts;
  if attempts > 5 then raise exception 'Too many applications; wait ten minutes' using errcode = 'P0002'; end if;
  insert into public.applications(submission_key, ign, first_name, last_name, rank, previous_clan, facebook_url, discord_name, reason, mode, selected_map,
      acknowledgement_version, acknowledged_at, submission_payload, submission_snapshot)
    values (p_key, trim(p_payload->>'ign'), nullif(p_payload->>'first_name',''), nullif(p_payload->>'last_name',''), nullif(p_payload->>'rank',''),
      nullif(p_payload->>'previous_clan',''), nullif(p_payload->>'facebook_url',''), trim(p_payload->>'discord_name'), trim(p_payload->>'reason'),
      (p_payload->>'mode')::public.tryout_mode, nullif(selected,''), 'config:' || p_revision::text, now(), p_payload, cfg.published_content)
    returning reference into result;
  insert into public.status_history(application_id, new_status, reason) select id, 'pending_review', 'Application submitted with privacy and live-sharing acknowledgement.' from public.applications where reference = result;
  return result;
end;
$$;
revoke all on function public.submit_application(uuid, integer, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_application(uuid, integer, jsonb, text) to service_role;
commit;
