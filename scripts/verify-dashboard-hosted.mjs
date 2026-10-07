// Manual development check: creates/deletes one disposable staff login.
// Its disabled historical profile/audit events intentionally remain.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
process.loadEnvFile('.env.local');
const project='fizahrcvegfxymqzbzkp';
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,project+'.supabase.co');
assert.equal(fs.readFileSync('supabase/.temp/project-ref','utf8').trim(),project);
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const password=randomBytes(24).toString('base64url')+'!aA1';
const email='dashboard-test-'+randomBytes(8).toString('hex')+'@example.invalid';
const created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{dashboard_verification:true}});
if(created.error||!created.data.user)throw new Error('Could not create disposable test login.');
const id=created.data.user.id,temp=path.join(os.tmpdir(),'deicidee-dashboard-'+id+'.sql');
function sql(body){
 fs.writeFileSync(temp,body);
 const r=spawnSync(process.execPath,[path.resolve('node_modules/supabase/dist/supabase.js'),'db','query','--linked','--file',temp],{encoding:'utf8',timeout:45000});
 if(r.status!==0)throw new Error('Hosted synthetic SQL check failed: '+r.stderr+' '+r.stdout);
}
function asAdmin(statement){sql(`begin; select set_config('request.jwt.claim.sub',(select id::text from public.officer_profiles where active and role='admin' order by created_at limit 1),true); set local role authenticated; ${statement} commit;`);}
try{
 asAdmin(`select public.provision_staff('${id}','Dashboard verification (test staff)');`);
 const jar=[];
 const staff=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>jar,setAll:items=>{for(const item of items){const old=jar.findIndex(x=>x.name===item.name);if(old>=0)jar[old]=item;else jar.push(item);}}}});
 const signed=await staff.auth.signInWithPassword({email,password});assert.equal(signed.error,null);
 const headers={cookie:jar.map(x=>x.name+'='+x.value).join('; ')};
 const applications=await fetch('http://127.0.0.1:3000/admin?tab=applications',{headers});const html=await applications.text();
 assert.equal(applications.status,200);assert.ok(html.includes('Requirements'));assert.ok(html.includes('Applications'));assert.ok(html.includes('Staff · application reviews'));assert.ok(!html.includes('Create a staff account'));
 console.log('Hosted staff login and rendered Applications tab: passed');
 const requirements=await fetch('http://127.0.0.1:3000/admin?tab=requirements',{headers});const req=await requirements.text();
 assert.equal(requirements.status,200);assert.ok(req.includes('Requirements are read-only for staff.'));assert.ok(!req.includes('Create a staff account'));
 console.log('Staff Requirements tab read-only; account management absent: passed');
 const denied=await staff.rpc('provision_staff',{p_id:crypto.randomUUID(),p_name:'Unauthorized'});assert.equal(denied.error?.code,'42501');
 console.log('Hosted staff cannot provision accounts directly: passed');
 asAdmin(`select public.manage_officer('${id}',1,'suspend','Synthetic suspension check','');`);
 const blocked=await staff.rpc('list_applications');assert.equal(blocked.error?.code,'42501');
 console.log('Suspended staff existing JWT loses application access: passed');
 const redirected=await fetch('http://127.0.0.1:3000/admin?tab=applications',{headers,redirect:'manual'});assert.equal(redirected.status,307);
 console.log('Suspended staff dashboard redirects to login: passed');
 asAdmin(`select public.manage_officer('${id}',2,'delete','Synthetic account cleanup','Dashboard verification (test staff)');`);
 const deleted=await service.auth.admin.deleteUser(id);assert.equal(deleted.error,null);
 const profile=await service.from('officer_profiles').select('auth_user_id,active,deleted_at').eq('id',id).single();assert.equal(profile.error,null);assert.equal(profile.data.auth_user_id,null);assert.equal(profile.data.active,false);assert.ok(profile.data.deleted_at);
 console.log('Actual Supabase Auth deletion preserves disabled historical profile: passed');
 const gone=await service.auth.admin.getUserById(id);assert.ok(gone.error);
 console.log('Disposable login removed; existing accounts untouched');
}finally{
 const cleanup=await service.auth.admin.deleteUser(id);
 if(cleanup.error&&cleanup.error.code!=='user_not_found')throw new Error('Disposable Auth login cleanup failed; inspect development Auth users.');
 if(fs.existsSync(temp))fs.unlinkSync(temp);
}
