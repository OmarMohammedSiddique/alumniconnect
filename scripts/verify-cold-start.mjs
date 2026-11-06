// Real browser, Auth, Postgres and model inference. Requires an EMPTY isolated
// loopback Supabase stack; deliberately refuses shared/hosted databases.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const app = new URL(process.env.COLD_START_APP_URL ?? 'http://127.0.0.1:3144');
const db = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
for (const target of [app, db]) {
  assert.ok(['127.0.0.1','localhost'].includes(target.hostname), 'Loopback targets only');
  assert.equal(target.protocol, 'http:');
}
assert.equal(db.port, '55421', 'Requires the dedicated issue-4 stack, not the shared local database');
const admin = createClient(db.href, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const run = randomUUID(), accounts = [], results = [], timings = [], comparisons = [];
const output = process.env.COLD_START_RESULTS ?? '/tmp/issue4-results.json';
const fingerprint=relative=>createHash('sha256').update(readFileSync(new URL(relative,import.meta.url))).digest('hex');
const report = { recordedAt:new Date().toISOString(),nodeVersion:process.version,verificationScriptSha256:fingerprint('./verify-cold-start.mjs'),staleVectorMigrationSha256:fingerprint('../supabase/migrations/20261106165316_invalidate_stale_profile_embeddings.sql'),source: process.env.COLD_START_SOURCE ?? 'working-tree', run, environment: 'isolated-local-production-build',
  primaryModel: 'Xenova/all-MiniLM-L6-v2', dimensions: 384, relevanceJudged: false, graphImplemented: false,
  humanOnboardingTimeMeasured: false, cacheState: 'fresh process for full runner; existing on-disk model cache may be reused',
  candidateCatalogue: [{label:'Mentor',headline:'Backend engineering Mentor',skills:['Python','PostgreSQL']},{label:'Second',headline:'Database systems Mentor',skills:['PostgreSQL']}], results, timings, comparisons };
let browser;
const ok = (result, label) => { assert.ok(!result.error, `${label}: ${result.error?.code ?? 'unavailable'}`); return result.data; };
function pass(name, evidence = {}) { results.push({ name, passed: true, ...evidence }); console.log(`PASS: ${name}`); }
async function api(person, path) {
  const start = performance.now();
  const response = await person.page.request.post(app.origin+path);
  const value = await response.json();
  timings.push({ operation: path, status: response.status(), elapsedMs: Math.round(performance.now()-start), returnedCount: Array.isArray(value.matches)?value.matches.length:null, candidateCount: value.candidateCount??null });
  return { status: response.status(), value };
}
async function profile(person) { return ok(await admin.from('profiles').select('*').eq('id',person.id).single(), 'Read own fixture profile'); }
async function signup(role, label) {
  const context = await browser.newContext();
  await context.route('**/_vercel/insights/**', route => route.fulfill({ body: '' }));
  const page = await context.newPage(); page.setDefaultTimeout(30_000);
  await page.goto(app.origin+'/signup');
  const reject = page.getByRole('button', {name:'Reject Non-Essential',exact:true}); if(await reject.isVisible()) await reject.click();
  const email = `cold-${run}-${label.toLowerCase()}@example.test`, password = randomUUID()+'Aa1!';
  await page.getByLabel('First name',{exact:true}).fill('Coldstart');
  await page.getByLabel('Last name',{exact:true}).fill(label);
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByLabel('Verify password',{exact:true}).fill(password);
  await page.locator(`input[name="role"][value="${role}"]`).check();
  const start = performance.now();
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.waitForURL('**/profile');
  timings.push({ operation: 'scripted-signup-submit-to-profile', elapsedMs: Math.round(performance.now()-start) });
  const users=ok(await admin.auth.admin.listUsers({page:1,perPage:100}),'Find disposable signup').users;
  const user=users.find(u=>u.email===email); assert.ok(user);
  const person={context,page,id:user.id,label,email};accounts.push(person);
  const sdk=createClient(db.href,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  ok(await sdk.auth.signInWithPassword({email,password}),'Fixture SDK login');person.sdk=sdk;
  ok(await sdk.from('email_preferences').upsert({user_id:user.id,requests:false,connections:false,matches:false,reminders:false}),'Disable fixture activity mail');
  return person;
}
async function save(person, fields, expectFailure=false) {
  const {page}=person;
  for(const [label,value] of Object.entries(fields)) await page.getByLabel(label,{exact:true}).fill(value);
  const start=performance.now();
  const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/embed',{timeout:120_000});
  await page.getByRole('button',{name:'Save profile',exact:true}).click();
  const embed=await response; await embed.finished();
  timings.push({operation:'scripted-profile-save-to-embedding-response',status:embed.status(),expectedFailure:expectFailure,elapsedMs:Math.round(performance.now()-start)});
  person.lastSaveStarted=start;
  if(expectFailure){await page.getByText('Match profile update failed.',{exact:false}).waitFor();}
  else {assert.equal(embed.status(),200);await page.getByText('Match profile updated.',{exact:false}).first().waitFor();}
}
async function matches(person) { const r=await api(person,'/api/match');assert.equal(r.status,200);return r.value.matches; }
try {
  assert.equal(ok(await admin.from('profiles').select('id'),'Empty-stack guard').length,0,'Refusing a nonempty database');
  assert.equal(ok(await admin.auth.admin.listUsers({page:1,perPage:1}),'Empty-account guard').users.length,0,'Refusing existing accounts');
  const authSettings=await fetch(db.origin+'/auth/v1/settings',{headers:{apikey:publicKey}});
  assert.equal((await authSettings.json()).mailer_autoconfirm,true,'Only isolated local auto-confirm is supported');
  browser=await chromium.launch({channel:'chrome',headless:true});report.browserVersion=browser.version();
  const anonymous=await browser.newContext();const page=await anonymous.newPage();
  for(const path of ['/api/embed','/api/match','/api/match/compare']) assert.equal((await page.request.post(app.origin+path)).status(),401);
  pass('anonymous inference denied');await anonymous.close();
  const mentee=await signup('mentee','Mentee');
  assert.equal((await profile(mentee)).embedding,null);
  assert.equal((await api(mentee,'/api/embed')).status,422);
  assert.equal((await api(mentee,'/api/match')).status,422);
  assert.equal((await api(mentee,'/api/match/compare')).status,422);
  pass('genuine signup has no vector or interaction-derived recommendations');
  await save(mentee,{'Headline':'Seeking backend engineering mentorship','Skills':'Python, PostgreSQL'});
  assert.equal(JSON.parse((await profile(mentee)).embedding).length,384);
  assert.equal((await matches(mentee)).length,0);
  pass('sparse professional profile embeds; empty catalogue stays empty');
  const mentor=await signup('mentor','Mentor');
  assert.equal((await matches(mentee)).length,0);
  await save(mentor,{'Headline':'Backend engineering Mentor','Skills':'Python, PostgreSQL','Bio':'I offer guidance on backend systems and database design.'});
  assert.deepEqual((await matches(mentee)).map(m=>m.id),[mentor.id]);
  timings.push({operation:'mentor-profile-save-to-first-visible-result',elapsedMs:Math.round(performance.now()-mentor.lastSaveStarted)});
  for(const table of ['mentorship_requests','connections']) assert.equal(ok(await admin.from(table).select('id'),'Zero-history check').length,0);
  pass('new Mentor becomes discoverable after real inference; Mentee has zero history');
  const comparison=await api(mentee,'/api/match/compare');assert.equal(comparison.status,200);
  for(const model of comparison.value.models){assert.ok(!model.error);assert.deepEqual(model.matches.map(m=>m.id),[mentor.id]);comparisons.push({id:model.id,dimensions:model.dimensions,elapsedMs:model.elapsedMs,returned:model.matches.length});}
  pass('both models run on the same fresh pool with isolated vector widths');
  // Reproduce interrupted inference after an edit: saved text must never retain
  // the earlier embedding. Only this browser request is fault-injected.
  await mentee.page.route('**/api/embed',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Controlled test outage'})}));
  await save(mentee,{'Headline':'Seeking guidance on unfamiliar Zorblax systems'},true);
  const interrupted=await profile(mentee);
  assert.equal(interrupted.headline,'Seeking guidance on unfamiliar Zorblax systems');
  assert.ok(interrupted.embedding===null,'Saved profile edit retained a stale embedding after inference failure');
  assert.equal((await api(mentee,'/api/match')).status,422);
  await mentee.page.unroute('**/api/embed');
  const retry=mentee.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/embed');
  await mentee.page.getByRole('button',{name:'Retry update',exact:true}).click();
  assert.equal((await retry).status(),200);
  assert.equal((await matches(mentee)).length,1);
  pass('saved unfamiliar input survives outage; stale vector excluded and real retry recovers');
  ok(await mentee.sdk.from('blocks').insert({blocker_id:mentee.id,blocked_id:mentor.id}),'Outgoing block');
  assert.equal((await matches(mentee)).length,0);
  const blocked=await api(mentee,'/api/match/compare');assert.equal(blocked.status,200);assert.equal(blocked.value.candidateCount,0);
  ok(await mentee.sdk.from('blocks').delete().eq('blocker_id',mentee.id).eq('blocked_id',mentor.id),'Remove outgoing block');
  ok(await mentor.sdk.from('blocks').insert({blocker_id:mentor.id,blocked_id:mentee.id}),'Incoming block');
  assert.equal((await matches(mentee)).length,0);
  ok(await mentor.sdk.from('blocks').delete().eq('blocker_id',mentor.id).eq('blocked_id',mentee.id),'Remove incoming block');
  ok(await mentor.sdk.from('profiles').update({member_visible:false}).eq('id',mentor.id),'Hide own Mentor');assert.equal((await matches(mentee)).length,0);
  ok(await mentor.sdk.from('profiles').update({member_visible:true,accepting_requests:false}).eq('id',mentor.id),'Make Mentor unavailable');
  const unavailable=await matches(mentee);assert.ok(unavailable.every(m=>m.accepting_requests===false));
  ok(await mentor.sdk.from('profiles').update({accepting_requests:true}).eq('id',mentor.id),'Restore availability');
  const denied=await mentee.sdk.from('profiles').update({headline:'Forbidden overwrite'}).eq('id',mentor.id).select('id');assert.ok(denied.error||denied.data.length===0);
  const wrongWidth=await admin.from('profiles').update({embedding:JSON.stringify(Array(64).fill(0.1))}).eq('id',mentee.id);assert.ok(wrongWidth.error);
  pass('both block directions, hidden Mentors, explicit availability, cross-user writes and model-width guards');
  // Exercise the existing optimistic persistence predicate deterministically.
  const snapshot=await profile(mentee);
  ok(await mentee.sdk.from('profiles').update({bio:'A newer saved goal'}).eq('id',mentee.id),'Newer goal');
  const stale=ok(await admin.from('profiles').update({embedding:snapshot.embedding}).eq('id',mentee.id).eq('updated_at',snapshot.updated_at).select('id'),'Stale-write guard');assert.equal(stale.length,0);assert.equal((await profile(mentee)).embedding,null);
  assert.equal((await api(mentee,'/api/embed')).status,200);
  pass('newer profile snapshots reject stale inference persistence');
  await mentee.page.goto(app.origin+'/discover');await mentee.page.getByRole('button',{name:'Recommended',exact:true}).click();
  await mentee.page.getByRole('button',{name:'Request mentorship',exact:true}).first().click();
  await mentee.page.getByLabel('Introduction (optional)',{exact:false}).fill('Fictional cold-start journey.');
  await mentee.page.getByRole('button',{name:'Send request',exact:true}).click();
  for(let i=0;i<100;i++){
    if(ok(await admin.from('mentorship_requests').select('id'),'Request persistence').length===1)break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal(ok(await admin.from('mentorship_requests').select('id'),'Persisted request count').length,1);
  await mentor.page.goto(app.origin+'/requests');await mentor.page.getByRole('button',{name:'Accept',exact:true}).click();
  for(let i=0;i<100;i++){
    if(ok(await admin.from('connections').select('id'),'Connection persistence').length===1)break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const connections=ok(await mentee.sdk.from('connections').select('id'),'Own connections');assert.equal(connections.length,1);
  assert.ok((await matches(mentee)).some(m=>m.id===mentor.id));
  pass('browser request and acceptance persist; matching remains available with one interaction');
  const second=await signup('mentor','Second');
  await save(second,{'Headline':'Database systems Mentor','Skills':'PostgreSQL'});
  await mentee.page.reload();
  await mentee.page.getByRole('button',{name:'Recommended',exact:true}).click();
  await mentee.page.getByRole('button',{name:'Request mentorship',exact:true}).first().click();
  await mentee.page.getByRole('button',{name:'Send request',exact:true}).click();
  for(let i=0;i<100;i++){
    if(ok(await admin.from('mentorship_requests').select('id'),'Two-history persistence').length===2)break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal(ok(await admin.from('mentorship_requests').select('id'),'Two-history count').length,2);
  assert.equal((await matches(mentee)).length,2);
  pass('recommendations remain available with two distinct request interactions');
  const fresh=await signup('mentee','Fresh');
  await save(fresh,{'Headline':'Seeking marine archaeology guidance','Skills':'Stratigraphy'});
  const freshResults=await matches(fresh);
  assert.equal(freshResults.length,2);
  assert.ok(freshResults.every(m=>m.shared_skills.length===0));
  assert.equal(ok(await admin.from('mentorship_requests').select('id').eq('mentee_id',fresh.id),'Fresh history').length,0);
  timings.push({operation:'mentee-profile-save-to-first-result',elapsedMs:Math.round(performance.now()-fresh.lastSaveStarted),candidateCount:2,returnedCount:freshResults.length,zeroHistory:true});
  pass('fixed-catalogue first results need no history; no skill overlap is not a suitability judgment');
  const axe=await new AxeBuilder({page:mentee.page}).include('#workspace').analyze();assert.deepEqual(axe.violations.map(v=>v.id),[]);
  await mentee.page.screenshot({path:'/tmp/issue4-discovery.png',fullPage:true});
  pass('discovery browser accessibility');
  report.success=true;report.summary={passedCases:results.length,recordedHttpOperations:timings.length,relevanceJudgments:0};
} catch(error) {
  report.success=false;report.failure=error.message;console.error(`FAIL: ${error.message}`);process.exitCode=1;
} finally {
  // Exact registered fixtures only. The initial empty-database guard prevents
  // existing member data from ever entering this suite.
  let cleaned=true;
  for(const person of accounts){try{ok(await admin.auth.admin.deleteUser(person.id),'Exact fixture cleanup');}catch{cleaned=false;}}
  report.cleanup=cleaned;
  try{report.remainingAccounts=ok(await admin.auth.admin.listUsers({page:1,perPage:100}),'Account cleanup read-back').users.length;}catch{report.remainingAccounts=null;}
  try{report.remainingProfiles=ok(await admin.from('profiles').select('id'),'Cleanup read-back').length;}catch{report.remainingProfiles=null;}
  await browser?.close();writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  if(!cleaned||report.remainingProfiles!==0||report.remainingAccounts!==0)process.exitCode=1;
  console.log(`Sanitized results: ${output}`);
}
