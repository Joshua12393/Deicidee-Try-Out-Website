import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { defaultRecruitmentConfig } from '../src/lib/recruitment-config.ts';

// Ephemeral real PostgreSQL engine. Only Supabase Auth schema/JWT context is stubbed.
// This does not test GoTrue, PostgREST, cookies, or hosted Supabase.
const db = new PGlite();
const admin = '11111111-1111-4111-8111-111111111111';
const staff = '22222222-2222-4222-8222-222222222222';
const outsider = '33333333-3333-4333-8333-333333333333';
const app = '44444444-4444-4444-8444-444444444444';
const attempt = '55555555-5555-4555-8555-555555555555';
const content = structuredClone(defaultRecruitmentConfig);
content.serverRegion = 'Synthetic test region';
content.modes.tdm = { approved: true, description: 'Synthetic TDM', rules: 'Synthetic test rule', maps: ['Synthetic map'] };
content.modes.escape.rules = 'Hidden unapproved rule';

before(async () => {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  const dir = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter(file => file.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, dir), 'utf8'));
  }
  await db.query('insert into auth.users(id) values ($1),($2),($3)', [admin, staff, outsider]);
  await db.query(`insert into public.officer_profiles(id, display_name, role) values ($1, 'Synthetic admin', 'admin'), ($2, 'Synthetic staff', 'staff')`, [admin, staff]);
  await db.query(`insert into public.applications(id, submission_key, ign, discord_name, reason, mode, acknowledgement_version, acknowledged_at)
    values ($1, gen_random_uuid(), 'Synthetic player', 'test-only', 'Test fixture', 'tdm', 'test-v1', now())`, [app]);
  await db.query(`insert into public.tryout_attempts(id, application_id, mode, attempt_number, rule_snapshot)
    values ($1, $2, 'tdm', 1, '{"rule":"original"}')`, [attempt, app]);
});
after(async () => { await db.close(); });

async function asRole(role, user, fn) {
  return db.transaction(async tx => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [user ?? '']);
    return fn(tx);
  });
}
const save = (tx, doc, revision, action) => tx.query('select public.save_recruitment_configuration($1::jsonb, $2, $3) as revision', [doc === null ? null : JSON.stringify(doc), revision, action]);

test('migration creates all six RLS-protected tables and closed intake', async () => {
  const { rows } = await db.query("select count(*)::int as count from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity");
  assert.equal(rows[0].count, 6);
  assert.equal((await db.query('select recruitment_open from public.recruitment_configuration')).rows[0].recruitment_open, false);
  await assert.rejects(db.exec('update public.recruitment_configuration set recruitment_open=true'), /check constraint/i);
});
test('anonymous settings start empty; private tables are inaccessible', async () => {
  assert.equal((await asRole('anon', null, tx => tx.query('select public.get_public_configuration() as content'))).rows[0].content, null);
  for (const table of ['applications', 'officer_profiles', 'tryout_attempts', 'status_history', 'recruitment_configuration', 'configuration_history']) {
    await assert.rejects(asRole('anon', null, tx => tx.query(`select * from public.${table}`)), /permission denied/i);
  }
  await assert.rejects(asRole('anon', null, tx => save(tx, content, 0, 'publish')), /permission denied/i);
});
test('authenticated outsiders cannot read private rows or publish', async () => {
  for (const table of ['applications', 'officer_profiles', 'tryout_attempts', 'status_history', 'recruitment_configuration', 'configuration_history']) {
    assert.equal((await asRole('authenticated', outsider, tx => tx.query(`select * from public.${table}`))).rows.length, 0);
  }
  await assert.rejects(asRole('authenticated', outsider, tx => save(tx, content, 0, 'publish')), /Admin access required/);
});
test('staff can read but cannot publish or elevate their role', async () => {
  assert.equal((await asRole('authenticated', staff, tx => tx.query('select * from public.applications'))).rows.length, 1);
  assert.equal((await asRole('authenticated', staff, tx => tx.query('select * from public.recruitment_configuration'))).rows.length, 1);
  await assert.rejects(asRole('authenticated', staff, tx => save(tx, content, 0, 'publish')), /Admin access required/);
  await assert.rejects(asRole('authenticated', staff, tx => tx.query("update public.officer_profiles set role='admin' where id=$1", [staff])), /permission denied/i);
  await assert.rejects(asRole('authenticated', staff, tx => tx.query("insert into public.officer_profiles(id,display_name,role) values ($1,'Intruder','admin')", [outsider])), /permission denied/i);
  await assert.rejects(asRole('authenticated', staff, tx => tx.exec('update public.recruitment_configuration set revision=999')), /permission denied/i);
});
test('admin draft is private; publication is atomic and hides unapproved mode details', async () => {
  assert.equal((await asRole('authenticated', admin, tx => save(tx, content, 0, 'draft'))).rows[0].revision, 1);
  assert.equal((await asRole('anon', null, tx => tx.query('select public.get_public_configuration() as content'))).rows[0].content, null);
  assert.equal((await asRole('authenticated', admin, tx => save(tx, content, 1, 'publish'))).rows[0].revision, 2);
  const published = (await asRole('anon', null, tx => tx.query('select public.get_public_configuration() as content'))).rows[0].content;
  assert.equal(published.serverRegion, content.serverRegion);
  assert.equal(published.modes.tdm.rules, content.modes.tdm.rules);
  assert.equal(published.modes.escape.rules, '');
  assert.equal(published.updated_by, undefined);
  assert.equal((await db.query('select count(*)::int as count from public.configuration_history')).rows[0].count, 2);
});
test('stale saves cannot change content or audit history', async () => {
  await assert.rejects(asRole('authenticated', admin, tx => save(tx, { ...content, serverRegion: 'Stale overwrite' }, 1, 'publish')), /Settings changed/);
  assert.equal((await db.query('select revision from public.recruitment_configuration')).rows[0].revision, 2);
  assert.equal((await db.query('select count(*)::int as count from public.configuration_history')).rows[0].count, 2);
});
test('direct RPC rejects malformed content, unsafe URLs, and unexpected fields', async () => {
  for (const doc of [null, {}, { ...content, discordUrl: 'javascript:alert(1)' }, { ...content, discordUrl: 'https://discord.gg.evil.test/x' }, { ...content, role: 'admin' }, { ...content, modes: { ...content.modes, tdm: { ...content.modes.tdm, maps: ['Same', 'same'] } } }]) {
    await assert.rejects(asRole('authenticated', admin, tx => save(tx, doc, 2, 'publish')), /Invalid configuration/);
  }
  await assert.rejects(asRole('authenticated', admin, tx => save(tx, content, 2, 'unknown')), /Invalid configuration action/);
});
test('new drafts preserve live content; unpublish retains the draft', async () => {
  await asRole('authenticated', admin, tx => save(tx, { ...content, serverRegion: 'New private draft' }, 2, 'draft'));
  assert.equal((await asRole('anon', null, tx => tx.query('select public.get_public_configuration() as content'))).rows[0].content.serverRegion, content.serverRegion);
  await asRole('authenticated', admin, tx => save(tx, null, 3, 'unpublish'));
  assert.equal((await asRole('anon', null, tx => tx.query('select public.get_public_configuration() as content'))).rows[0].content, null);
  assert.equal((await db.query('select draft_content from public.recruitment_configuration')).rows[0].draft_content.serverRegion, 'New private draft');
});
test('revocation blocks reads and writes on the next request', async () => {
  await db.query('update public.officer_profiles set active=false where id=$1', [admin]);
  assert.equal((await asRole('authenticated', admin, tx => tx.query('select * from public.applications'))).rows.length, 0);
  await assert.rejects(asRole('authenticated', admin, tx => save(tx, content, 4, 'publish')), /Admin access required/);
  await db.query('update public.officer_profiles set active=true where id=$1', [admin]);
});
test('application mode, idempotency, and onboarding constraints are enforced', async () => {
  await assert.rejects(db.exec("update public.applications set mode='tdm,escape'"), /invalid input value for enum/);
  await assert.rejects(db.exec("update public.applications set status='invented'"), /invalid input value for enum/);
  await assert.rejects(db.exec("update public.applications set onboarding='joined'"), /check constraint/i);
  await assert.rejects(db.exec("insert into public.applications(submission_key,ign,discord_name,reason,mode,acknowledgement_version,acknowledged_at) select submission_key,ign,discord_name,reason,mode,acknowledgement_version,acknowledged_at from public.applications"), /unique constraint/i);
});
test('retries preserve the selected mode and immutable snapshots', async () => {
  await assert.rejects(db.exec("update public.tryout_attempts set rule_snapshot='{\"rule\":\"changed\"}'"), /immutable/);
  await assert.rejects(db.query("insert into public.tryout_attempts(application_id,mode,attempt_number,rule_snapshot) values ($1,'escape',2,'{\"rule\":\"test\"}')", [app]), /foreign key constraint/i);
  await assert.rejects(db.query("insert into public.tryout_attempts(application_id,mode,attempt_number,rule_snapshot) values ($1,'tdm',1,'{\"rule\":\"test\"}')", [app]), /unique constraint/i);
  await db.query("update public.tryout_attempts set outcome='retry_requested',decided_by=$1,decided_at=now(),decision_note='Synthetic retry' where id=$2", [admin, attempt]);
  await assert.rejects(db.exec('update public.tryout_attempts set applicant_score=999'), /Completed attempts are immutable/);
  await db.query("insert into public.tryout_attempts(application_id,mode,attempt_number,rule_snapshot) values ($1,'tdm',2,'{\"rule\":\"next version\"}')", [app]);
  assert.equal((await db.query('select count(*)::int as count from public.tryout_attempts')).rows[0].count, 2);
});
test('audit history is append-only', async () => {
  await assert.rejects(db.exec('delete from public.configuration_history'), /append-only/);
  await db.query("insert into public.status_history(application_id,attempt_id,new_status,reason) values ($1,$2,'retry_requested','Synthetic event')", [app, attempt]);
  await assert.rejects(db.exec("update public.status_history set reason='changed'"), /append-only/);
  await assert.rejects(db.exec('delete from public.status_history'), /append-only/);
});
