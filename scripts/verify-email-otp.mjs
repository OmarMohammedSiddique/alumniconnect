// Real local-only OTP acceptance. Codes/session tokens stay in memory, never logs.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { verifyEmailOtp } from "../lib/email-otp.ts";

const app = new URL(process.env.REGISTRATION_APP_URL ?? "http://127.0.0.1:3110");
const api = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
const mail = new URL(process.env.REGISTRATION_MAIL_URL ?? "http://127.0.0.1:56324");
for (const url of [app, api, mail]) assert.ok(url.protocol === "http:" && ["127.0.0.1","localhost"].includes(url.hostname) && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash, "Only loopback test services are permitted");
assert.equal(api.port,"56321");
assert.equal(process.env.REGISTRATION_PROJECT,"alumnikonneqt-issue36");
assert.equal(process.env.EMAIL_OTP_ENABLED,"true");
const { chromium } = await import(process.env.REGISTRATION_PLAYWRIGHT_PATH ? pathToFileURL(process.env.REGISTRATION_PLAYWRIGHT_PATH).href : "playwright");
const axeModule = await import(process.env.OTP_AXE_PATH ? pathToFileURL(process.env.OTP_AXE_PATH).href : "@axe-core/playwright");
const AxeBuilder = axeModule.default.default ?? axeModule.default;
const options = { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} };
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin=createClient(api.href,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const sdk=()=>createClient(api.href,key,options);
const ok=(r,label)=>{assert.ok(!r.error,label);return r.data;};
const baseline=ok(await admin.auth.admin.listUsers({perPage:1000}),"Read isolated baseline").users.map(u=>u.id).sort();
const run=`otp-${randomUUID()}`;
const fixtures=[];
const browser=await chromium.launch({headless:true,...(process.env.REGISTRATION_BROWSER_EXECUTABLE?{executablePath:process.env.REGISTRATION_BROWSER_EXECUTABLE}:{channel:"chrome"})});
const contexts=[];
let pausedMail=false,pausedAuth=false,rateReplica=false,passed=0,stage="setup";
const seenCodes=new Set();
const rateEnv="/private/tmp/issue32-rate-replica.env";
const container=suffix=>`supabase_${suffix}_alumnikonneqt-issue36`;
const docker=(...args)=>execFileSync("docker",args,{stdio:["ignore","pipe","pipe"],timeout:30000});
const pass=label=>console.log(`PASS ${++passed}: ${label}`);
async function member(label){
 const email=`${run}-${label}@example.test`,password=`${randomUUID()}Aa1!`;
 const user=ok(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:"OTP acceptance fixture",role:"mentee"}}),"Create isolated member").user;
 const result={id:user.id,email,password};fixtures.push(result);return result;
}
async function page(){const context=await browser.newContext({viewport:{width:1366,height:768},permissions:["clipboard-read","clipboard-write"]});contexts.push(context);const p=await context.newPage();p.setDefaultTimeout(15000);return p;}
async function open(p,next="/profile"){await p.goto(new URL(`/login/code?next=${encodeURIComponent(next)}`,app).href);await p.getByLabel("Registered email",{exact:true}).waitFor();}
async function request(p,email){await p.getByLabel("Registered email",{exact:true}).fill(email);await p.getByRole("button",{name:"Send sign-in code",exact:true}).click();await p.getByLabel("Sign-in code",{exact:true}).waitFor();}
async function messages(email){
 const response=await fetch(new URL("/api/v1/messages?limit=500",mail));assert.ok(response.ok,"Mailpit available");
 return (await response.json()).messages.filter(m=>m.To?.some(to=>to.Address===email));
}
async function code(email,exclude=[]){
 for(let attempt=0;attempt<30;attempt++){
  for(const summary of await messages(email)){
   const message=await (await fetch(new URL(`/api/v1/message/${summary.ID}`,mail))).json();
   const match=(message.Text??"").match(/\b\d{8}\b/);if(match&&!exclude.includes(match[0])){seenCodes.add(match[0]);return match[0];}
  }
  await new Promise(r=>setTimeout(r,100));
 }
 throw Error("Expected a newly delivered local OTP without printing it");
}
async function audit(p){const r=await new AxeBuilder({page:p}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();assert.deepEqual(r.violations.map(v=>v.id),[],"OTP WCAG audit");}
async function submit(p,token){await p.getByLabel("Sign-in code",{exact:true}).fill(token);await p.getByRole("button",{name:"Verify and sign in",exact:true}).click();}
async function error(p,pattern){await p.getByRole("alert").filter({hasText:pattern}).waitFor();}
async function challenge(p,email,age=0,next="/profile"){
 await p.context().addCookies([{name:"alumnikonneqt-email-otp",value:encodeURIComponent(JSON.stringify({email,next,requestedAt:Date.now()-age*1000})),domain:app.hostname,path:"/login/code",httpOnly:true,sameSite:"Lax",secure:false}]);
 await p.goto(new URL("/login/code",app).href);await p.getByLabel("Sign-in code",{exact:true}).waitFor();
}
function ageProvider(user,seconds){
 assert.ok(fixtures.some(f=>f.id===user.id)&&/^[\da-f-]{36}$/.test(user.id));assert.ok(Number.isInteger(seconds)&&seconds>=0&&seconds<=1200);
 docker("exec",container("db"),"psql","-U","supabase_admin","-d","postgres","-v","ON_ERROR_STOP=1","-c",`update auth.users set recovery_sent_at=now()-interval '${seconds} seconds' where id='${user.id}'; update auth.one_time_tokens set created_at=now()-interval '${seconds} seconds' where user_id='${user.id}';`);
}
async function signout(p){await p.setViewportSize({width:1366,height:768});await p.getByRole("button",{name:"Sign out",exact:true}).click();await p.waitForURL(u=>u.pathname==="/login");}
async function authFromPage(p){const jar=await p.context().cookies();return createServerClient(api.href,key,{cookies:{getAll:()=>jar.map(({name,value})=>({name,value:decodeURIComponent(value)})),setAll:()=>{}},auth:{autoRefreshToken:false}});}
try{
 const owner=await member("owner"),other=await member("other"),expired=await member("expired"),failure=await member("failure");
 stage="accessibility and unknown address";
 const unknown=await page();await open(unknown);
 for(const width of [320,375,768,1366]){await unknown.setViewportSize({width,height:844});assert.ok(await unknown.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await audit(unknown);if(process.env.OTP_EVIDENCE_DIR && [320,1366].includes(width)){await mkdir(process.env.OTP_EVIDENCE_DIR,{recursive:true});await unknown.screenshot({path:`${process.env.OTP_EVIDENCE_DIR}/otp-entry-${width}.png`,fullPage:true});}}
 await unknown.getByLabel("Registered email",{exact:true}).focus();assert.equal(await unknown.locator(":focus").getAttribute("id"),"otp-email");
 await request(unknown,`${run}-unknown@example.test`);
 const generic=await unknown.getByRole("status").innerText();
 assert.match(generic,/If this email has a registered account/);assert.equal((await messages(`${run}-unknown@example.test`)).length,0);
 assert.equal(ok(await admin.auth.admin.listUsers({perPage:1000}),"Read unchanged accounts").users.length,baseline.length+fixtures.length);
 pass("mobile/desktop WCAG audit, labelled keyboard entry and unknown-address privacy/no signup");
 stage="pending, send limits and actual delivery";
 const p=await page();await open(p);
 let posts=0;await p.route("**/login/code*",async route=>{if(route.request().method()==="POST"){posts++;await new Promise(r=>setTimeout(r,300));}await route.continue();});
 await p.getByLabel("Registered email",{exact:true}).fill(owner.email);await p.getByRole("button",{name:"Send sign-in code",exact:true}).click();
 await p.getByRole("button",{name:"Requesting code…",exact:true}).waitFor();
 assert.ok(await p.getByRole("button",{name:"Requesting code…",exact:true}).isDisabled());
 await p.evaluate(()=>document.querySelector('button[type="submit"]').click());
 await p.getByLabel("Sign-in code",{exact:true}).waitFor();await p.unroute("**/login/code*");assert.equal(posts,1);
 const first=await code(owner.email);assert.equal((await messages(owner.email)).length,1);
 assert.equal(await p.getByRole("status").innerText(),generic);
 assert.ok(await p.getByRole("button",{name:/Resend in/}).isDisabled());
 const throttled=await sdk().auth.signInWithOtp({email:owner.email,options:{shouldCreateUser:false}});assert.equal(throttled.error?.status,429);
 await audit(p);assert.equal(await p.getByLabel("Sign-in code").getAttribute("autocomplete"),"one-time-code");assert.equal(await p.getByLabel("Sign-in code").getAttribute("inputmode"),"numeric");
 assert.ok(!new URL(p.url()).searchParams.has("email")&&!p.url().includes(first));
 pass("single pending submission, real local delivery, provider send throttle and code autofill semantics");
 stage="wrong code, refresh, paste and real session";
 await submit(p,first==="00000000"?"11111111":"00000000");await error(p,/invalid or has expired/);
 await p.reload();await p.getByLabel("Sign-in code").waitFor();
 await p.evaluate(value=>navigator.clipboard.writeText(value),first);await p.getByLabel("Sign-in code").focus();await p.keyboard.press(process.platform==="darwin"?"Meta+V":"Control+V");
 assert.equal(await p.getByLabel("Sign-in code").inputValue(),first);
 await p.getByRole("button",{name:"Verify and sign in",exact:true}).click();await p.waitForURL(u=>u.pathname==="/profile");
 const authenticated=await authFromPage(p);assert.equal(ok(await authenticated.auth.getUser(),"Real OTP session").user.id,owner.id);
 ok(await authenticated.from("profiles").update({headline:"OTP acceptance saved"}).eq("id",owner.id),"Own profile mutation through RLS");
 await p.reload();assert.equal(ok(await (await authFromPage(p)).auth.getUser(),"Session after refresh").user.id,owner.id);
 await p.goto(new URL("/admin",app).href);await p.waitForURL(u=>u.pathname!=="/admin");assert.equal(new URL(p.url()).pathname,"/discover");
 await signout(p);await p.goto(new URL("/profile",app).href);await p.waitForURL(u=>u.pathname==="/login");
 await challenge(p,owner.email);await submit(p,first);await error(p,/invalid or has expired/);
 pass("wrong/reused code rejected; clipboard paste, real session, safe destination, profile permission, refresh and logout verified");
 stage="supersession and subsequent sign-in";
 ageProvider(owner,61);await challenge(p,owner.email,61);await p.getByRole("button",{name:"Resend code",exact:true}).click();await p.getByLabel("Sign-in code").waitFor();
 const second=await code(owner.email,[first]);
 ageProvider(owner,61);await challenge(p,owner.email,61);await p.getByRole("button",{name:"Resend code",exact:true}).click();
 const third=await code(owner.email,[first,second]);await submit(p,second);await error(p,/invalid or has expired/);await submit(p,third);await p.waitForURL(u=>u.pathname==="/profile");await signout(p);
 pass("real resend supersedes old code and fresh subsequent sign-in succeeds");
 stage="provider expiry and recovery";
 const e=await page();await open(e);await request(e,expired.email);const stale=await code(expired.email);ageProvider(expired,601);
 await submit(e,stale);await error(e,/invalid or has expired/);
 await challenge(e,expired.email,61);await e.getByRole("button",{name:"Resend code",exact:true}).click();const fresh=await code(expired.email,[stale]);await submit(e,fresh);await e.waitForURL(u=>u.pathname==="/profile");await signout(e);
 pass("real provider expiry from aged fixture timestamps, resend recovery and valid replacement code");
 stage="concurrent tabs and cross-device access";
 ageProvider(owner,61);await open(p);await request(p,owner.email);const deviceCode=await code(owner.email,[first,second,third]);
 const secondTab=await p.context().newPage();await secondTab.goto(new URL("/login/code",app).href);await secondTab.getByRole("button",{name:"Change email",exact:true}).click();await request(secondTab,other.email);const otherCode=await code(other.email);
 await submit(p,deviceCode);await error(p,/request changed or expired/);await p.reload();await p.getByLabel("Sign-in code").waitFor();await submit(p,otherCode);await p.waitForURL(u=>u.pathname==="/discover");assert.equal(ok(await (await authFromPage(p)).auth.getUser(),"Correct tab identity").user.id,other.id);await signout(p);
 const device=await page();await open(device);await request(device,owner.email);await submit(device,deviceCode);await device.waitForURL(u=>u.pathname==="/profile");assert.equal(ok(await (await authFromPage(device)).auth.getUser(),"Correct device identity").user.id,owner.id);await signout(device);
 pass("changed-email stale tabs rejected; refresh recovery and separate-device verification preserve identity");
 stage="unsafe redirect";
 ageProvider(owner,61);const unsafe=await page();await open(unsafe,"//attacker.example/");await request(unsafe,owner.email);const safeCode=await code(owner.email,[first,second,third,deviceCode]);await submit(unsafe,safeCode);await unsafe.waitForURL(u=>u.pathname==="/discover");assert.equal(new URL(unsafe.url()).origin,app.origin);await signout(unsafe);
 pass("unsafe external destination falls back to authenticated discover");
 stage="SMTP and Auth outages";
 const fault=await page();await open(fault);docker("stop","-t","2",container("inbucket"));pausedMail=true;
 await request(fault,failure.email);assert.equal(await fault.getByRole("status").innerText(),generic);await fault.reload();await fault.getByLabel("Sign-in code").waitFor();
 docker("start",container("inbucket"));pausedMail=false;ageProvider(failure,61);await challenge(fault,failure.email,61);await fault.getByRole("button",{name:"Resend code",exact:true}).click();const retryCode=await code(failure.email);
 docker("stop","-t","2",container("auth"));pausedAuth=true;await submit(fault,retryCode);await error(fault,/temporarily unavailable|reach the sign-in service/);
 docker("start",container("auth"));pausedAuth=false;await new Promise(r=>setTimeout(r,1500));await submit(fault,retryCode);await fault.waitForURL(u=>u.pathname==="/profile");await signout(fault);
 pass("real local SMTP failure keeps generic recovery state; Auth outage is actionable and same code succeeds after recovery");
 stage="real verification rate limit";
 // The CLI leaves RateLimitHeader unset, intentionally disabling per-IP limits.
 // Use a disposable replica of the same Auth image with an explicit test header;
 // do not alter the running stack or burst requests against hosted production.
 const inspect=JSON.parse(docker("inspect",container("auth")).toString())[0];
 const env=inspect.Config.Env.filter(v=>!v.startsWith("GOTRUE_RATE_LIMIT_HEADER="));
 env.push("GOTRUE_RATE_LIMIT_HEADER=X-OTP-Acceptance-Key");
 await writeFile(rateEnv,env.join("\n")+"\n",{mode:0o600});
 const network=Object.keys(inspect.NetworkSettings.Networks)[0];
 docker("run","--detach","--rm","--name","alumnikonneqt-otp-rate-acceptance","--network",network,"--env-file",rateEnv,"--publish","127.0.0.1:56331:9999",inspect.Config.Image);
 rateReplica=true;await unlink(rateEnv);
 for(let attempt=0;attempt<30;attempt++){try{const health=await fetch("http://127.0.0.1:56331/health");if(health.ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const limitedClient=createClient("http://127.0.0.1:56331",key,{...options,global:{fetch:(input,init)=>{
   const target=new URL(input);target.pathname=target.pathname.replace(/^\/auth\/v1/,"");
   return fetch(target,{...init,headers:{...init?.headers,"X-OTP-Acceptance-Key":"controlled-local-client"}});
 }}});
 let limited=false;
 for(let attempt=0;attempt<45;attempt++){const r=await limitedClient.auth.verifyOtp({email:owner.email,token:"99999999",type:"email"});if(r.error?.status===429){limited=true;break;}}
 assert.ok(limited,"Explicitly configured provider must enforce verification quota");
 assert.match(await verifyEmailOtp(limitedClient.auth,owner.email,"99999999"),/Too many attempts/);
 await challenge(p,owner.email);await submit(p,"99999999");await error(p,/invalid or has expired/);await audit(p);
 const serverLog=await readFile("/private/tmp/issue32-app.log","utf8");
 assert.ok([...seenCodes].every(value=>!serverLog.includes(value)),"Delivered codes must not enter app logs");
 assert.ok(fixtures.every(value=>!serverLog.includes(value.password)),"Passwords must not enter app logs");
 pass("explicit real-provider guessing limit maps to safe feedback; accessible errors and no code/password logging");

}catch(error){console.error(`FAIL during ${stage}: ${error.name}`);await writeFile("/private/tmp/issue32-private-failure.txt",String(error.stack),{mode:0o600});process.exitCode=1;}
finally{
 await unlink(rateEnv).catch(()=>{});
 if(rateReplica)docker("rm","--force","alumnikonneqt-otp-rate-acceptance");
 if(pausedMail)docker("start",container("inbucket"));if(pausedAuth)docker("start",container("auth"));
 for(const c of contexts)await c.close();await browser.close();
 for(const fixture of fixtures){const c=sdk();const session=await c.auth.signInWithPassword({email:fixture.email,password:fixture.password});if(!session.error)await c.auth.signOut({scope:"global"});ok(await admin.auth.admin.deleteUser(fixture.id),"Remove exact OTP fixture");}
 assert.deepEqual(ok(await admin.auth.admin.listUsers({perPage:1000}),"Read restored baseline").users.map(u=>u.id).sort(),baseline);
 console.log(`CLEANUP PASS: ${fixtures.length} fixtures removed, original isolated account baseline restored.`);
}
console.log(`OTP ACCEPTANCE ${process.exitCode?"FAILED":"PASSED"}: ${passed} groups; real local browser/Auth/mail/permissions, with automated WCAG audits.`);
