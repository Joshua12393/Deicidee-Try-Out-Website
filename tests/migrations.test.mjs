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
  await db.exec("insert into auth.users(id) values ('77777777-7777-4777-8777-777777777777'); insert into public.officer_profiles(id,display_name,role) values ('77777777-7777-4777-8777-777777777777','Synthetic backup admin','admin');");
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

test('migration creates all twelve RLS-protected tables and closed intake', async () => {
  const { rows } = await db.query("select count(*)::int as count from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity");
  assert.equal(rows[0].count, 12);
  assert.equal((await db.query('select recruitment_open from public.recruitment_configuration')).rows[0].recruitment_open, false);
  await assert.rejects(db.exec('update public.recruitment_configuration set recruitment_open=true'), /Publish approved fields/i);
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

const payload = { ign:'Synthetic applicant', first_name:'', last_name:'', rank:'', previous_clan:'None', facebook_url:'', discord_name:'test-only', reason:'Synthetic submission', mode:'tdm', selected_map:'', consent:true };
const bucket = 'a'.repeat(64);
const key = '66666666-6666-4666-8666-666666666666';
const submit = (tx, submissionKey=key, doc=payload, revision=5, rateBucket=bucket) => tx.query('select public.submit_application($1::uuid,$2,$3::jsonb,$4) as reference',[submissionKey,revision,JSON.stringify(doc),rateBucket]);
const intake = (tx, open, version) => tx.query('select public.set_recruitment_intake($1,$2) as version',[open,version]);
let reference;
test('submission RPC is private and closure is enforced by the database', async () => {
  for (const role of ['anon','authenticated']) await assert.rejects(asRole(role, role==='authenticated' ? staff : null, tx => submit(tx)), /permission denied/i);
  await assert.rejects(asRole('service_role',null, tx => submit(tx)), /Recruitment is closed/);
  await assert.rejects(asRole('authenticated',staff, tx => intake(tx,true,0)), /Admin access required/);
  await assert.rejects(asRole('authenticated',admin, tx => intake(tx,true,0)), /Publish approved fields/);
  await assert.rejects(asRole('anon',null, tx=>tx.exec('select * from public.application_rate_limits')), /permission denied/i);
  assert.equal((await asRole('authenticated',staff, tx=>tx.exec('select * from public.intake_history')))[0].rows.length,0);
});
test('admin opens approved intake; atomic public configuration contains only public content', async () => {
  content.applicationFields='Required IGN, Discord, reason, one mode and consent. Optional name, rank, previous clan and Facebook.';
  content.retentionPolicy='Synthetic test retention'; content.correctionContact='Synthetic officer contact'; content.discordUrl='https://discord.gg/synthetic'; content.discordRequirement='Synthetic live sharing requirement';
  content.modes.zm_hmx={approved:true, description:'Synthetic ZM', rules:'Synthetic rule', maps:['Synthetic ZM']};
  await asRole('authenticated',admin,tx=>save(tx,content,4,'publish'));
  assert.equal((await asRole('authenticated',admin,tx=>intake(tx,true,0))).rows[0].version,1);
  const publicConfig=(await asRole('anon',null,tx=>tx.query('select public.get_public_application_configuration() as config'))).rows[0].config;
  assert.equal(publicConfig.open,true); assert.equal(publicConfig.revision,5); assert.equal(publicConfig.content.discordUrl,content.discordUrl); assert.deepEqual(Object.keys(publicConfig).sort(),['content','open','revision']);
  await assert.rejects(asRole('authenticated',admin,tx=>intake(tx,false,0)), /Intake settings changed/);
});
test('server submissions reject invalid mode/map/consent/revision/status without side effects', async () => {
  for (const extra of [{consent:false},{status:'passed'},{mode:'tdm,escape'},{mode:'escape'},{selected_map:'unexpected'},{mode:'zm_hmx', selected_map:'unknown'},{facebook_url:'https://facebook.com.evil.test/x'}]) await assert.rejects(asRole('service_role',null,tx=>submit(tx,key,{...payload,...extra})), /Invalid application|Mode unavailable|TDM does not require|Choose an approved map/);
  await assert.rejects(asRole('service_role',null,tx=>submit(tx,key,payload,4)), /Published requirements changed/);
  assert.equal((await db.query('select count(*)::int as count from public.application_rate_limits')).rows[0].count,0);
});
test('a persisted application returns one receipt, rule snapshot and initial history', async () => {
  reference=(await asRole('service_role',null,tx=>submit(tx))).rows[0].reference;
  assert.match(reference,/^[a-f0-9-]{36}$/);
  const saved=(await db.query('select * from public.applications where submission_key=$1',[key])).rows[0];
  assert.equal(saved.status,'pending_review'); assert.equal(saved.onboarding,'not_applicable'); assert.equal(saved.acknowledgement_version,'config:5'); assert.deepEqual(saved.submission_snapshot,content); assert.ok(saved.acknowledged_at); assert.equal(saved.first_name,null);
  assert.equal((await db.query('select count(*)::int as count from public.status_history where application_id=$1',[saved.id])).rows[0].count,1);
  assert.equal((await asRole('service_role',null,tx=>submit(tx))).rows[0].reference,reference);
  assert.equal((await db.query('select submissions from public.application_rate_limits where bucket=$1',[bucket])).rows[0].submissions,1);
  await assert.rejects(asRole('service_role',null,tx=>submit(tx,key,{...payload,reason:'Changed'})), /Submission key already used/);
});
test('durable rate limit rejects sixth insert and resumes after the window', async () => {
  for(let i=0;i<4;i++) await asRole('service_role',null,tx=>submit(tx,crypto.randomUUID()));
  const before=(await db.query('select count(*)::int as count from public.applications')).rows[0].count;
  await assert.rejects(asRole('service_role',null,tx=>submit(tx,crypto.randomUUID())), /Too many applications/);
  assert.equal((await db.query('select count(*)::int as count from public.applications')).rows[0].count,before);
  assert.equal((await db.query('select submissions from public.application_rate_limits where bucket=$1',[bucket])).rows[0].submissions,5);
  await db.query("update public.application_rate_limits set started_at=now()-interval '11 minutes' where bucket=$1",[bucket]);
  await asRole('service_role',null,tx=>submit(tx,crypto.randomUUID(),{...payload,mode:'zm_hmx',selected_map:'Synthetic ZM'}));
  assert.equal((await db.query('select submissions from public.application_rate_limits where bucket=$1',[bucket])).rows[0].submissions,1);
});
test('drafts preserve intake; publication pauses it; saved receipts survive closure/withdrawal', async () => {
  await asRole('authenticated',admin,tx=>save(tx,{...content,serverRegion:'New synthetic draft'},5,'draft'));
  let current=(await db.query('select * from public.recruitment_configuration')).rows[0];
  assert.equal(current.recruitment_open,true); assert.equal(current.published_revision,5);
  await asRole('authenticated',admin,tx=>save(tx,{...content,serverRegion:'New synthetic publication'},6,'publish'));
  current=(await db.query('select * from public.recruitment_configuration')).rows[0];
  assert.equal(current.recruitment_open,false); assert.equal(current.published_revision,7); assert.equal(current.intake_version,2);
  assert.equal((await asRole('service_role',null,tx=>submit(tx))).rows[0].reference,reference);
  await assert.rejects(asRole('service_role',null,tx=>submit(tx,crypto.randomUUID())), /Recruitment is closed/);
  await asRole('authenticated',admin,tx=>intake(tx,true,2));
  await asRole('authenticated',admin,tx=>save(tx,null,7,'unpublish'));
  assert.equal((await db.query('select recruitment_open from public.recruitment_configuration')).rows[0].recruitment_open,false);
  assert.equal((await asRole('service_role',null,tx=>submit(tx))).rows[0].reference,reference);
  await assert.rejects(db.exec('delete from public.intake_history'), /append-only/);
  assert.equal((await db.query('select count(*)::int as count from public.intake_history')).rows[0].count,4);
});

const backup='77777777-7777-4777-8777-777777777777';
const account=(tx,id,version,action,reason='Synthetic account test',confirmation='Synthetic staff')=>tx.query('select public.manage_officer($1,$2,$3,$4,$5) as result',[id,version,action,reason,confirmation]);
test('pipeline search treats punctuation literally and returns accurate private counts',async()=>{
 const list=await asRole('authenticated',staff,tx=>tx.query("select public.list_applications('Synthetic',null,null,1) as result"));
 assert.equal(list.rows[0].result.total,7);assert.equal(list.rows[0].result.count,7);assert.equal(list.rows[0].result.pending,7);
 const filter=await asRole('authenticated',staff,tx=>tx.query("select public.list_applications('',null,'zm_hmx',1) as result"));assert.equal(filter.rows[0].result.count,1);
 const discord=await asRole('authenticated',staff,tx=>tx.query("select public.list_applications('TEST-ONLY',null,null,1) as result"));assert.equal(discord.rows[0].result.count,7);
 assert.equal((await asRole('authenticated',staff,tx=>tx.query("select public.list_applications('%',null,null,1) as result"))).rows[0].result.count,0);
 await assert.rejects(asRole('anon',null,tx=>tx.query('select public.list_applications()')),/permission denied/i);
 await assert.rejects(asRole('authenticated',outsider,tx=>tx.query('select public.list_applications()')),/Officer access required/);
});
test('private notes are attributed, append-only and idempotent',async()=>{
 const noteKey=crypto.randomUUID(); const add=(tx,body='Synthetic note')=>tx.query('select public.add_application_note($1,$2,$3) as id',[app,noteKey,body]);
 const first=(await asRole('authenticated',staff,tx=>add(tx))).rows[0].id;
 assert.equal((await asRole('authenticated',staff,tx=>add(tx))).rows[0].id,first);
 await assert.rejects(asRole('authenticated',staff,tx=>add(tx,'Changed note')),/Note key already used/);
 await assert.rejects(asRole('authenticated',outsider,tx=>add(tx)),/Officer access required/);
 assert.equal((await asRole('authenticated',outsider,tx=>tx.query('select * from public.application_notes'))).rows.length,0);
 await assert.rejects(db.exec("update public.application_notes set body='overwrite'"),/append-only/);
 await assert.rejects(db.exec('delete from public.application_notes'),/append-only/);
});
test('triage transitions require current version/reason and admin-only reopening',async()=>{
 const move=(tx,status,version=1,reason='Synthetic decision')=>tx.query('select public.triage_application($1,$2,$3,$4) as version',[app,version,status,reason]);
 await assert.rejects(asRole('authenticated',outsider,tx=>move(tx,'closed')),/Officer access required/);
 await assert.rejects(asRole('authenticated',staff,tx=>move(tx,'passed')),/appropriate workflow/);
 await assert.rejects(asRole('authenticated',staff,tx=>move(tx,'closed',1,'')),/reason is required/);
 assert.equal((await asRole('authenticated',staff,tx=>move(tx,'closed'))).rows[0].version,2);
 await assert.rejects(asRole('authenticated',admin,tx=>move(tx,'pending_review',1)),/Application changed/);
 await assert.rejects(asRole('authenticated',staff,tx=>move(tx,'pending_review',2)),/appropriate workflow/);
 assert.equal((await asRole('authenticated',admin,tx=>move(tx,'pending_review',2))).rows[0].version,3);
 assert.equal((await db.query('select count(*)::int as n from public.status_history where application_id=$1 and actor_id=$2',[app,staff])).rows[0].n,1);
});
test('only admins provision staff; supplied role elevation is impossible',async()=>{
 const id=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[id]);
 await assert.rejects(asRole('authenticated',staff,tx=>tx.query('select public.provision_staff($1,$2)',[id,'Synthetic future staff'])),/Admin access required/);
 await asRole('authenticated',admin,tx=>tx.query('select public.provision_staff($1,$2)',[id,'Synthetic future staff']));
 const person=(await db.query('select * from public.officer_profiles where id=$1',[id])).rows[0];assert.equal(person.role,'staff');assert.equal(person.auth_user_id,id);assert.equal(person.active,true);
 await assert.rejects(asRole('authenticated',admin,tx=>tx.query('select public.provision_staff($1,$2)',[id,'Duplicate'])),/unique constraint/i);
});
test('officer removal protects self/last admin and rejects unauthorized or stale requests',async()=>{
 await assert.rejects(asRole('authenticated',staff,tx=>account(tx,backup,1,'suspend')),/Admin access required/);
 await assert.rejects(asRole('authenticated',admin,tx=>account(tx,admin,1,'delete','Test','Synthetic admin')),/own access/);
 await assert.rejects(asRole('authenticated',admin,tx=>account(tx,staff,99,'suspend')),/Officer changed/);
 await db.query('update public.officer_profiles set active=false where id=$1',[backup]);
 await assert.rejects(db.query('update public.officer_profiles set active=false where id=$1',[admin]),/last active admin/);
 await assert.rejects(db.query('delete from auth.users where id=$1',[admin]),/last active admin/);
 await db.query('update public.officer_profiles set active=true where id=$1',[backup]);
});
test('suspension revokes active sessions; deleted Auth users retain attributed history',async()=>{
 await asRole('authenticated',admin,tx=>account(tx,staff,1,'suspend'));
 assert.equal((await asRole('authenticated',staff,tx=>tx.query('select * from public.applications'))).rows.length,0);
 await assert.rejects(asRole('authenticated',staff,tx=>tx.query('select public.list_applications()')),/Officer access required/);
 await asRole('authenticated',admin,tx=>account(tx,staff,2,'activate'));
 assert.equal((await asRole('authenticated',staff,tx=>tx.query('select public.current_officer_role() as role'))).rows[0].role,'staff');
 await assert.rejects(asRole('authenticated',admin,tx=>account(tx,staff,3,'delete','Staff left','Wrong confirmation')),/display name/);
 await asRole('authenticated',admin,tx=>account(tx,staff,3,'delete','Staff left'));
 let person=(await db.query('select * from public.officer_profiles where id=$1',[staff])).rows[0];assert.equal(person.active,false);assert.ok(person.deletion_requested_at);
 await assert.rejects(asRole('authenticated',admin,tx=>account(tx,staff,4,'activate')),/Deletion is pending/);
 assert.equal((await asRole('authenticated',admin,tx=>account(tx,staff,4,'delete'))).rows[0].result.auth_user_id,staff);
 await db.query('delete from auth.users where id=$1',[staff]);
 person=(await db.query('select * from public.officer_profiles where id=$1',[staff])).rows[0];assert.equal(person.auth_user_id,null);assert.equal(person.active,false);assert.ok(person.deleted_at);
 assert.equal((await db.query('select actor_id from public.application_notes where actor_id=$1',[staff])).rows[0].actor_id,staff);
 assert.equal((await asRole('authenticated',staff,tx=>tx.query('select public.current_officer_role() as role'))).rows[0].role,null);
 await assert.rejects(db.exec("delete from public.officer_history"),/append-only/);
});

test('pagination is bounded and stable across equal submission times',async()=>{
 for(let i=0;i<21;i++)await db.query("insert into public.applications(submission_key,ign,discord_name,reason,mode,acknowledgement_version,acknowledged_at,created_at) values(gen_random_uuid(),'Synthetic pagination','test-only','Test','tdm','test-v1',now(),'2026-10-08T00:00:00Z')");
 const list=page=>asRole('authenticated',admin,tx=>tx.query("select public.list_applications('Synthetic pagination',null,null,$1) as result",[page]));
 const first=(await list(1)).rows[0].result,second=(await list(2)).rows[0].result;
 assert.equal(first.count,21);assert.equal(first.items.length,20);assert.equal(second.items.length,1);assert.equal(new Set([...first.items,...second.items].map(row=>row.id)).size,21);
});


const publicationStaff=crypto.randomUUID(), publicationOther=crypto.randomUUID();
const requestKey=crypto.randomUUID();
let publicationBase, publicationDoc;
const staffDraft=(tx,doc,revision,base,submit=false,key=requestKey)=>tx.query('select public.save_officer_configuration_draft($1,$2,$3,$4,$5) as revision',[JSON.stringify(doc),revision,base,submit,key]);
const reviewPublication=(tx,id,approve,revision,note='Synthetic review')=>tx.query('select public.review_publication_request($1,$2,$3,$4) as revision',[id,approve,revision,note]);

test('staff drafts are private and cannot mutate or directly publish shared settings',async()=>{
 await db.query('insert into auth.users(id) values($1),($2)',[publicationStaff,publicationOther]);
 await db.query("insert into public.officer_profiles(id,display_name,role) values($1,'Publication author','staff'),($2,'Other staff','staff')",[publicationStaff,publicationOther]);
 publicationBase=(await db.query('select revision from public.recruitment_configuration')).rows[0].revision;
 publicationDoc={...structuredClone(content),serverRegion:'Requested synthetic region'};
 assert.equal((await asRole('authenticated',publicationStaff,tx=>staffDraft(tx,publicationDoc,0,publicationBase))).rows[0].revision,1);
 assert.equal((await asRole('authenticated',publicationOther,tx=>tx.query('select * from public.officer_configuration_drafts'))).rows.length,0);
 assert.equal((await asRole('authenticated',publicationStaff,tx=>tx.query('select * from public.officer_configuration_drafts'))).rows.length,1);
 await assert.rejects(asRole('anon',null,tx=>staffDraft(tx,publicationDoc,0,publicationBase)),/permission denied/i);
 await assert.rejects(asRole('authenticated',outsider,tx=>staffDraft(tx,publicationDoc,0,publicationBase)),/Active staff access/);
 await assert.rejects(asRole('authenticated',publicationStaff,tx=>save(tx,publicationDoc,publicationBase,'publish')),/Admin access required/);
 await assert.rejects(asRole('authenticated',publicationStaff,tx=>tx.exec("update public.recruitment_configuration set published_content='{}'")),/permission denied/i);
 await assert.rejects(asRole('authenticated',publicationStaff,tx=>staffDraft(tx,{},1,publicationBase)),/Invalid draft/);
 await assert.rejects(asRole('authenticated',publicationStaff,tx=>staffDraft(tx,publicationDoc,0,publicationBase)),/draft changed/);
});

test('publication requests are immutable idempotent snapshots and never open or change intake',async()=>{
 const before=(await db.query('select * from public.recruitment_configuration')).rows[0];
 assert.equal((await asRole('authenticated',publicationStaff,tx=>staffDraft(tx,publicationDoc,1,publicationBase,true))).rows[0].revision,2);
 assert.equal((await asRole('authenticated',publicationStaff,tx=>staffDraft(tx,publicationDoc,1,publicationBase,true))).rows[0].revision,2);
 const after=(await db.query('select * from public.recruitment_configuration')).rows[0];assert.deepEqual(after,before);
 await assert.rejects(asRole('authenticated',publicationStaff,tx=>staffDraft(tx,{...publicationDoc,serverRegion:'Tampered'},2,publicationBase,true)),/Request key already used/);
 await assert.rejects(asRole('authenticated',publicationStaff,tx=>staffDraft(tx,publicationDoc,2,publicationBase,true,crypto.randomUUID())),/already pending/);
 await asRole('authenticated',publicationStaff,tx=>staffDraft(tx,{...publicationDoc,serverRegion:'Later draft'},2,publicationBase));
 assert.deepEqual((await db.query('select content from public.publication_requests where id=$1',[requestKey])).rows[0].content,publicationDoc);
 assert.equal((await asRole('authenticated',publicationOther,tx=>tx.query('select * from public.publication_requests'))).rows.length,0);
 await assert.rejects(asRole('anon',null,tx=>tx.query('select * from public.publication_requests')),/permission denied/i);
 await assert.rejects(asRole('authenticated',publicationStaff,tx=>tx.exec("update public.publication_requests set status='approved'")),/permission denied/i);
 await assert.rejects(db.query("update public.publication_requests set content='{}' where id=$1",[requestKey]),/immutable/);
 await assert.rejects(db.exec('delete from public.publication_requests'),/retained/);
});

test('only an admin publishes a reviewed snapshot atomically and approval retries do not duplicate history',async()=>{
 await assert.rejects(asRole('authenticated',publicationStaff,tx=>reviewPublication(tx,requestKey,true,publicationBase)),/Admin access required/);
 await assert.rejects(asRole('authenticated',admin,tx=>reviewPublication(tx,requestKey,true,publicationBase,'')),/review note is required/);
 const before=(await db.query('select count(*)::int as n from public.configuration_history')).rows[0].n;
 const approved=(await asRole('authenticated',admin,tx=>reviewPublication(tx,requestKey,true,publicationBase))).rows[0].revision;
 assert.equal(approved,publicationBase+1);
 const cfg=(await db.query('select * from public.recruitment_configuration')).rows[0];assert.deepEqual(cfg.published_content,publicationDoc);assert.equal(cfg.recruitment_open,false);
 const request=(await db.query('select * from public.publication_requests where id=$1',[requestKey])).rows[0];assert.equal(request.status,'approved');assert.equal(request.reviewed_by,admin);assert.ok(request.reviewed_at);assert.equal(request.review_note,'Synthetic review');
 assert.equal((await asRole('authenticated',admin,tx=>reviewPublication(tx,requestKey,true,publicationBase))).rows[0].revision,approved);
 assert.equal((await db.query('select count(*)::int as n from public.configuration_history')).rows[0].n,before+1);
 await assert.rejects(asRole('authenticated',admin,tx=>reviewPublication(tx,requestKey,false,publicationBase)),/already reviewed/);
 await assert.rejects(db.query("update public.publication_requests set review_note='overwrite' where id=$1",[requestKey]),/immutable/);
});

test('stale requests cannot overwrite newer settings; rejection leaves publication unchanged',async()=>{
 const base=(await db.query('select revision from public.recruitment_configuration')).rows[0].revision;
 const key=crypto.randomUUID();
 await asRole('authenticated',publicationOther,tx=>staffDraft(tx,publicationDoc,0,base,true,key));
 await asRole('authenticated',admin,tx=>save(tx,{...publicationDoc,serverRegion:'New admin draft'},base,'draft'));
 await assert.rejects(asRole('authenticated',admin,tx=>reviewPublication(tx,key,true,base+1)),/Settings changed/);
 const before=(await db.query('select * from public.recruitment_configuration')).rows[0];
 await asRole('authenticated',admin,tx=>reviewPublication(tx,key,false,base+1,'Please update your draft'));
 assert.deepEqual((await db.query('select * from public.recruitment_configuration')).rows[0],before);
 assert.equal((await db.query('select status from public.publication_requests where id=$1',[key])).rows[0].status,'rejected');
 await assert.rejects(asRole('authenticated',publicationOther,tx=>staffDraft(tx,publicationDoc,1,base,true,crypto.randomUUID())),/Settings changed/);
});

test('suspended authors lose drafts and cannot have requests approved; rejected notes remain private',async()=>{
 const base=(await db.query('select revision from public.recruitment_configuration')).rows[0].revision;
 const key=crypto.randomUUID();
 await asRole('authenticated',publicationOther,tx=>staffDraft(tx,publicationDoc,1,base,true,key));
 await db.query('update public.officer_profiles set active=false where id=$1',[publicationOther]);
 assert.equal((await asRole('authenticated',publicationOther,tx=>tx.query('select * from public.publication_requests'))).rows.length,0);
 await assert.rejects(asRole('authenticated',publicationOther,tx=>staffDraft(tx,publicationDoc,2,base)),/Active staff access/);
 await assert.rejects(asRole('authenticated',admin,tx=>reviewPublication(tx,key,true,base)),/no longer active/);
 await asRole('authenticated',admin,tx=>reviewPublication(tx,key,false,base,'Author inactive'));
 await db.query('update public.officer_profiles set active=true where id=$1',[publicationOther]);
});

test('admin role assignment is audited, versioned and unavailable to staff; self-review is denied',async()=>{
 const change=(tx,id,version,role)=>tx.query('select public.change_officer_role($1,$2,$3,$4) as version',[id,version,role,'Synthetic role change']);
 await assert.rejects(asRole('authenticated',publicationOther,tx=>change(tx,publicationOther,1,'admin')),/Admin access required/);
 await assert.rejects(asRole('authenticated',admin,tx=>change(tx,admin,1,'staff')),/own role/);
 const base=(await db.query('select revision from public.recruitment_configuration')).rows[0].revision;
 const key=crypto.randomUUID();
 await asRole('authenticated',publicationOther,tx=>staffDraft(tx,publicationDoc,2,base,true,key));
 assert.equal((await asRole('authenticated',admin,tx=>change(tx,publicationOther,1,'admin'))).rows[0].version,2);
 await assert.rejects(asRole('authenticated',publicationOther,tx=>reviewPublication(tx,key,true,base)),/Another admin/);
 await assert.rejects(asRole('authenticated',admin,tx=>change(tx,publicationOther,1,'staff')),/Officer changed/);
 assert.equal((await db.query("select count(*)::int as n from public.officer_history where target_id=$1 and action='role_admin'",[publicationOther])).rows[0].n,1);
 await asRole('authenticated',admin,tx=>change(tx,publicationOther,2,'staff'));
 await asRole('authenticated',admin,tx=>reviewPublication(tx,key,false,base,'Synthetic cleanup'));
 const id=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[id]);
 await assert.rejects(asRole('authenticated',publicationStaff,tx=>tx.query('select public.provision_officer($1,$2,$3)',[id,'New officer','admin'])),/Admin access required/);
 await asRole('authenticated',admin,tx=>tx.query('select public.provision_officer($1,$2,$3)',[id,'New admin','admin']));
 assert.equal((await db.query('select role from public.officer_profiles where id=$1',[id])).rows[0].role,'admin');
 const others=(await db.query("select id from public.officer_profiles where role='admin' and active and id<>$1",[admin])).rows;
 for(const row of others)await db.query('update public.officer_profiles set active=false where id=$1',[row.id]);
 await assert.rejects(db.query("update public.officer_profiles set role='staff' where id=$1",[admin]),/last active admin/);
 for(const row of others)await db.query('update public.officer_profiles set active=true where id=$1',[row.id]);
});
