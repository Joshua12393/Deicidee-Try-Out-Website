-- Deicidee foundation. No applicants, auth users, or unapproved rules are seeded.
begin;

create type public.officer_role as enum ('admin', 'staff');
create type public.tryout_mode as enum ('tdm', 'zm_hmx', 'escape');
create type public.application_status as enum ('pending_review', 'scheduled', 'under_evaluation', 'passed', 'failed', 'retry_requested', 'withdrawn', 'closed');
create type public.onboarding_status as enum ('not_applicable', 'awaiting_requirements', 'joined');
create type public.attempt_outcome as enum ('passed', 'failed', 'retry_requested');

create table public.officer_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  role public.officer_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create function public.current_officer_role() returns public.officer_role
language sql stable security definer set search_path = '' as $$
  select role from public.officer_profiles where id = (select auth.uid()) and active;
$$;
revoke all on function public.current_officer_role() from public, anon, authenticated;
grant execute on function public.current_officer_role() to authenticated;

create table public.recruitment_configuration (
  id boolean primary key default true check (id),
  draft_content jsonb,
  published_content jsonb,
  revision integer not null default 0 check (revision >= 0),
  -- Intake remains locked until the submission and officer workflow migrations exist.
  recruitment_open boolean not null default false check (recruitment_open = false),
  updated_by uuid references public.officer_profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (draft_content is null or (jsonb_typeof(draft_content) = 'object' and octet_length(draft_content::text) <= 50000)),
  check (published_content is null or (jsonb_typeof(published_content) = 'object' and octet_length(published_content::text) <= 50000))
);
insert into public.recruitment_configuration(id) values (true);

create table public.configuration_history (
  id uuid primary key default gen_random_uuid(),
  revision integer not null unique,
  actor_id uuid not null references public.officer_profiles(id) on delete restrict,
  action text not null check (action in ('draft', 'publish', 'unpublish')),
  content jsonb,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  reference uuid not null unique default gen_random_uuid(),
  submission_key uuid not null unique,
  ign text not null check (length(trim(ign)) between 1 and 100),
  first_name text check (length(first_name) <= 100),
  last_name text check (length(last_name) <= 100),
  rank text check (length(rank) <= 100),
  previous_clan text check (length(previous_clan) <= 150),
  facebook_url text check (length(facebook_url) <= 500),
  discord_name text not null check (length(trim(discord_name)) between 1 and 100),
  reason text not null check (length(trim(reason)) between 1 and 2000),
  mode public.tryout_mode not null,
  selected_map text check (length(trim(selected_map)) between 1 and 100),
  acknowledgement_version text not null check (length(trim(acknowledgement_version)) between 1 and 100),
  acknowledged_at timestamptz not null,
  status public.application_status not null default 'pending_review',
  onboarding public.onboarding_status not null default 'not_applicable',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, mode),
  check ((status = 'passed' and onboarding in ('awaiting_requirements', 'joined')) or (status <> 'passed' and onboarding = 'not_applicable'))
);
create index applications_pipeline_idx on public.applications(status, created_at desc);
create index applications_mode_idx on public.applications(mode, created_at desc);

create table public.tryout_attempts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  mode public.tryout_mode not null,
  attempt_number integer not null check (attempt_number > 0),
  evaluator_id uuid references public.officer_profiles(id) on delete restrict,
  scheduled_at timestamptz,
  map text check (length(trim(map)) between 1 and 100),
  rule_snapshot jsonb not null check (jsonb_typeof(rule_snapshot) = 'object' and rule_snapshot <> '{}'::jsonb),
  applicant_score integer check (applicant_score >= 0),
  opponent_score integer check (opponent_score >= 0),
  rounds integer check (rounds > 0),
  match_completed boolean,
  won boolean,
  boosting_demonstrated boolean,
  observations text check (length(observations) <= 5000),
  outcome public.attempt_outcome,
  decision_note text check (length(decision_note) <= 5000),
  decided_by uuid references public.officer_profiles(id) on delete restrict,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (application_id, mode) references public.applications(id, mode) on delete restrict,
  unique (application_id, attempt_number),
  unique (id, application_id),
  check ((outcome is null and decided_at is null and decided_by is null) or
    (outcome is not null and decided_at is not null and decided_by is not null and length(trim(coalesce(decision_note, ''))) > 0)),
  check (mode = 'tdm' or (opponent_score is null and match_completed is null and won is null)),
  check (mode = 'zm_hmx' or rounds is null),
  check (mode = 'escape' or boosting_demonstrated is null)
);
create index attempts_evaluator_idx on public.tryout_attempts(evaluator_id, scheduled_at);

create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete restrict,
  attempt_id uuid,
  old_status public.application_status,
  new_status public.application_status not null,
  actor_id uuid references public.officer_profiles(id) on delete restrict,
  reason text not null check (length(trim(reason)) between 1 and 5000),
  event_key uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  foreign key (attempt_id, application_id) references public.tryout_attempts(id, application_id) on delete restrict
);
create index history_application_idx on public.status_history(application_id, created_at);

create function public.protect_attempt_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.rule_snapshot is distinct from old.rule_snapshot or new.application_id <> old.application_id
     or new.mode <> old.mode or new.attempt_number <> old.attempt_number then
    raise exception 'Attempt identity and rule snapshot are immutable';
  end if;
  if old.outcome is not null and new is distinct from old then
    raise exception 'Completed attempts are immutable; create a retry attempt';
  end if;
  return new;
end;
$$;
create trigger protect_attempt_history before update on public.tryout_attempts for each row execute function public.protect_attempt_history();
revoke all on function public.protect_attempt_history() from public, anon, authenticated;

create function public.reject_history_changes() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'History is append-only';
end;
$$;
create trigger immutable_configuration_history before update or delete on public.configuration_history for each row execute function public.reject_history_changes();
create trigger immutable_status_history before update or delete on public.status_history for each row execute function public.reject_history_changes();
revoke all on function public.reject_history_changes() from public, anon, authenticated;

-- The public API returns only the explicitly published document, never drafts or actors.
create function public.get_public_configuration() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when published_content is null then null else
    jsonb_set(published_content, '{modes}', (
      select jsonb_object_agg(key, case when value->'approved' = 'true'::jsonb then value
        else jsonb_build_object('approved', false, 'description', '', 'rules', '', 'maps', '[]'::jsonb) end)
      from jsonb_each(published_content->'modes')
    )) end
  from public.recruitment_configuration where id;
$$;
revoke all on function public.get_public_configuration() from public, anon, authenticated;
grant execute on function public.get_public_configuration() to anon, authenticated;

-- Transactional optimistic locking protects against two admin tabs silently overwriting each other.
create function public.valid_recruitment_document(doc jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  field text;
  mode_doc jsonb;
  map_value jsonb;
  field_names text[] := array['serverRegion','rankScheme','discordUrl','facebookUrl','discordRequirement','retryPolicy','ccnRequirement','mainFacebookRequirement','applicationFields','retentionPolicy','correctionContact'];
begin
  if doc is null or jsonb_typeof(doc) <> 'object' or octet_length(doc::text) > 50000 then return false; end if;
  if (select count(*) from jsonb_object_keys(doc)) <> 12 then return false; end if;
  foreach field in array field_names loop
    if jsonb_typeof(doc->field) is distinct from 'string' or length(doc->>field) > 2000 then return false; end if;
  end loop;
  if length(doc->>'serverRegion') > 120 or length(doc->>'discordUrl') > 500 or length(doc->>'facebookUrl') > 500 then return false; end if;
  if doc->>'discordUrl' <> '' and (doc->>'discordUrl') !~* '^https://(discord\.gg|discord\.com|www\.discord\.com)(:443)?([/?#][^[:space:]]*)?$' then return false; end if;
  if doc->>'facebookUrl' <> '' and (doc->>'facebookUrl') !~* '^https://(facebook\.com|www\.facebook\.com|m\.facebook\.com|fb\.com)(:443)?([/?#][^[:space:]]*)?$' then return false; end if;
  if jsonb_typeof(doc->'modes') is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(doc->'modes')) <> 3 then return false; end if;
  foreach field in array array['tdm','zm_hmx','escape'] loop
    mode_doc := doc->'modes'->field;
    if jsonb_typeof(mode_doc) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(mode_doc)) <> 4 then return false; end if;
    if jsonb_typeof(mode_doc->'approved') is distinct from 'boolean'
      or jsonb_typeof(mode_doc->'description') is distinct from 'string'
      or jsonb_typeof(mode_doc->'rules') is distinct from 'string'
      or jsonb_typeof(mode_doc->'maps') is distinct from 'array'
      or length(mode_doc->>'rules') > 2000 or length(mode_doc->>'description') > 2000 then return false; end if;
    if mode_doc->'approved' = 'true'::jsonb and
      (length(trim(mode_doc->>'description')) = 0 or length(trim(mode_doc->>'rules')) = 0) then return false; end if;
    if jsonb_array_length(mode_doc->'maps') > 30 then return false; end if;
    for map_value in select value from jsonb_array_elements(mode_doc->'maps') loop
      if jsonb_typeof(map_value) <> 'string' or length(trim(map_value #>> '{}')) not between 1 and 100 then return false; end if;
    end loop;
    if (select count(*) <> count(distinct lower(trim(value))) from jsonb_array_elements_text(mode_doc->'maps')) then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.valid_recruitment_document(jsonb) from public, anon, authenticated;

create function public.save_recruitment_configuration(p_content jsonb, p_expected_revision integer, p_action text)
returns integer language plpgsql security definer set search_path = '' as $$
declare next_revision integer;
begin
  if public.current_officer_role() is distinct from 'admin'::public.officer_role then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('draft', 'publish', 'unpublish') then
    raise exception 'Invalid configuration action' using errcode = '22023';
  end if;
  if p_action <> 'unpublish' and not public.valid_recruitment_document(p_content) then
    raise exception 'Invalid configuration document' using errcode = '22023';
  end if;
  update public.recruitment_configuration set
    draft_content = case when p_action = 'unpublish' then draft_content else p_content end,
    published_content = case when p_action = 'publish' then p_content when p_action = 'unpublish' then null else published_content end,
    published_at = case when p_action = 'publish' then now() when p_action = 'unpublish' then null else published_at end,
    revision = revision + 1, updated_by = auth.uid(), updated_at = now()
  where id and revision = p_expected_revision
  returning revision into next_revision;
  if next_revision is null then
    raise exception 'Settings changed. Reload before saving.' using errcode = '40001';
  end if;
  insert into public.configuration_history(revision, actor_id, action, content)
    values (next_revision, auth.uid(), p_action, case when p_action = 'unpublish' then null else p_content end);
  return next_revision;
end;
$$;
revoke all on function public.save_recruitment_configuration(jsonb, integer, text) from public, anon, authenticated;
grant execute on function public.save_recruitment_configuration(jsonb, integer, text) to authenticated;

-- Explicit privileges work with both existing and newly provisioned Supabase projects.
revoke all on table public.officer_profiles, public.recruitment_configuration, public.configuration_history,
  public.applications, public.tryout_attempts, public.status_history from public, anon, authenticated;
grant select on table public.officer_profiles, public.recruitment_configuration, public.configuration_history,
  public.applications, public.tryout_attempts, public.status_history to authenticated;
grant all on table public.officer_profiles, public.recruitment_configuration, public.configuration_history,
  public.applications, public.tryout_attempts, public.status_history to service_role;

alter table public.officer_profiles enable row level security;
alter table public.recruitment_configuration enable row level security;
alter table public.configuration_history enable row level security;
alter table public.applications enable row level security;
alter table public.tryout_attempts enable row level security;
alter table public.status_history enable row level security;

create policy officers_read on public.officer_profiles for select to authenticated using ((select public.current_officer_role()) is not null);
create policy settings_read on public.recruitment_configuration for select to authenticated using ((select public.current_officer_role()) is not null);
create policy configuration_history_read on public.configuration_history for select to authenticated using ((select public.current_officer_role()) = 'admin');
create policy applications_read on public.applications for select to authenticated using ((select public.current_officer_role()) is not null);
create policy attempts_read on public.tryout_attempts for select to authenticated using ((select public.current_officer_role()) is not null);
create policy status_history_read on public.status_history for select to authenticated using ((select public.current_officer_role()) is not null);
-- No direct write policies. Submission and recruitment operations need future guarded RPCs.
commit;
