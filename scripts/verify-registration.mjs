// Real local-only browser/Auth/Storage acceptance for issue #36.
// See docs/verification/signup-profile-photos.md for isolated-stack setup.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import actionClient from "next/dist/compiled/react-server-dom-webpack/client.node.js";

const app = new URL(process.env.REGISTRATION_APP_URL ?? "http://127.0.0.1:3110");
const api = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
const mail = new URL(process.env.REGISTRATION_MAIL_URL ?? "http://127.0.0.1:56324");
for (const url of [app, api, mail]) {
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname) && url.protocol === "http:", "Only loopback HTTP is permitted");
  assert.ok(!url.username && !url.password && url.pathname === "/" && !url.search && !url.hash);
}
assert.equal(process.env.REGISTRATION_PROJECT, "alumnikonneqt-issue36", "Use the dedicated disposable project");
assert.equal(api.port, "56321", "Never target the existing development or production project");
assert.ok(["on", "off"].includes(process.env.REGISTRATION_CONFIRMATIONS), "Select the actual confirmation mode");
const confirmed = process.env.REGISTRATION_CONFIRMATIONS === "on";
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(publicKey && process.env.SUPABASE_SERVICE_ROLE_KEY);
const sdkOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(api.href, process.env.SUPABASE_SERVICE_ROLE_KEY, sdkOptions);
const anonymous = createClient(api.href, publicKey, sdkOptions);
const browserModule = process.env.REGISTRATION_PLAYWRIGHT_PATH ? pathToFileURL(process.env.REGISTRATION_PLAYWRIGHT_PATH).href : "playwright";
const { chromium } = await import(browserModule);
const browser = await chromium.launch({ headless: true, ...(process.env.REGISTRATION_BROWSER_EXECUTABLE ? { executablePath: process.env.REGISTRATION_BROWSER_EXECUTABLE } : { channel: "chrome" }) });
console.log(`BROWSER: Chrome ${browser.version()}; Playwright acceptance against local services.`);
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();
page.setDefaultTimeout(15_000);
const errors = [];
page.on("pageerror", () => errors.push("Browser JavaScript error"));
const run = `issue36-${randomUUID()}`;
const password = `${randomUUID()}Aa1!`;
const email = label => `${run}-${label}@example.test`;
const evidence = process.env.REGISTRATION_EVIDENCE_DIR;
const fixtureIds = new Set();
let passed = 0;
let stage = "initialization";
let bucketChanged = false;
let originalBucket;
function pass(label) { console.log(`PASS ${++passed}: ${label}`); }
function ok(result, label) { assert.ok(!result.error, label); return result.data; }
async function users() { return ok(await admin.auth.admin.listUsers({ perPage: 1000 }), "Read isolated fixture accounts").users; }
const baseline = (await users()).map(user => user.id).sort();
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=", "base64");
const replacement = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4ICL3HwAFPAIilnqO6wAAAABJRU5ErkJggg==", "base64");
const file = bytes => ({ name: "fixture.png", mimeType: "image/png", buffer: bytes });
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
async function fixture(label) {
  const user = (await users()).find(user => user.email === email(label));
  assert.ok(user, "Expected fixture account exists"); fixtureIds.add(user.id); return user;
}
async function fill(label, photo) {
  await page.goto(new URL("/signup", app).href);
  await page.getByLabel("First name", { exact: true }).fill("  test  ");
  await page.getByLabel("Last name", { exact: true }).fill("  member  ");
  await page.getByLabel("Email", { exact: true }).fill(email(label));
  await page.locator("#password").fill(password);
  await page.locator("#confirm_password").fill(password);
  await page.getByRole("radio", { name: /Mentor Share/ }).check();
  if (photo) await page.locator("#profile_photo").setInputFiles(file(photo));
}
async function confirmMailbox(label) {
  const mailbox = email(label).split("@")[0];
  let message;
  for (let attempt = 0; attempt < 30; attempt++) {
    // Current Supabase CLI uses Mailpit; retain the older Inbucket API fallback.
    const response = await fetch(new URL("/api/v1/messages", mail));
    if (response.ok) {
      const listing = await response.json();
      const summary = listing.messages?.find(item => item.To?.some(recipient => recipient.Address === email(label)));
      if (summary) message = await (await fetch(new URL(`/api/v1/message/${summary.ID}`, mail))).json();
    } else {
      const response = await fetch(new URL(`/api/v1/mailbox/${mailbox}`, mail));
      const listing = response.ok ? await response.json() : [];
      if (listing.length) message = await (await fetch(new URL(`/api/v1/mailbox/${mailbox}/${listing[0].id}`, mail))).json();
    }
    if (message) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(message, "Confirmation must reach the isolated mail sink");
  const body = `${message.Text ?? message.body?.text ?? ""}\n${message.HTML ?? message.body?.html ?? ""}`;
  const match = body.match(/https?:\/\/[^\s"<>]*\/auth\/v1\/verify\?[^\s"<>]+/);
  assert.ok(match, "Mail must contain a provider confirmation link");
  const link = new URL(match[0].replaceAll("&amp;", "&"));
  assert.equal(link.origin, api.origin, "Confirmation must stay on the disposable provider");
  const verified = await fetch(link, { redirect: "manual" });
  assert.ok([302, 303].includes(verified.status), "Actual provider must accept the confirmation link");
  const user = await fixture(label);
  assert.ok(user.email_confirmed_at, "Email must be confirmed by Auth");
}
async function login(label) {
  await page.goto(new URL("/login?next=/profile/photo", app).href);
  await page.getByLabel("Email", { exact: true }).fill(email(label));
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/profile/photo");
}
async function logout() {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/login");
}
async function download(client, id) {
  const data = ok(await client.storage.from("profile-photos").download(`${id}/avatar`), "Owner photo download");
  return Buffer.from(await data.arrayBuffer());
}
async function directSignup(fields) {
  const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8")).node;
  const entry = Object.entries(manifest).find(([, value]) => value.exportedName === "signUp");
  assert.ok(entry, "Build must expose the current signup action");
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  const response = await fetch(new URL("/signup", app), {
    method: "POST", body: await actionClient.encodeReply([{ error: null }, form]), redirect: "manual",
    headers: { "Next-Action": entry[0], Origin: app.origin, Accept: "text/x-component" },
    signal: AbortSignal.timeout(30_000),
  });
  assert.ok(response.ok, "Direct signup validation must return state");
  return response.text();
}
try {
  stage = "provider mode and layouts";
  const settings = await (await fetch(new URL("/auth/v1/settings", api), { headers: { apikey: publicKey } })).json();
  assert.equal(settings.mailer_autoconfirm, !confirmed, "Reported test mode must match the running Auth service");
  await page.goto(new URL("/signup", app).href);
  for (const [width, height] of [[320,844],[375,844],[768,1024],[1366,768],[1440,900]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}px`);
    const first = await page.locator("#first_name").boundingBox();
    const last = await page.locator("#last_name").boundingBox();
    if (width === 320) assert.ok(last.y > first.y, "Mobile name fields stack");
    if (width >= 1366) {
      assert.ok(Math.abs(first.y-last.y) < 2, "Desktop names share a row");
      assert.ok(await page.locator("[data-slot=card]").evaluate(node => node.getBoundingClientRect().width > 1100), "Desktop registration uses the available width");
    }
    await page.getByRole("button", { name: "Create account", exact: true }).scrollIntoViewIfNeeded();
    assert.ok(await page.getByRole("button", { name: "Create account", exact: true }).isVisible());
    if (evidence) {
      await mkdir(evidence, { recursive: true }); await page.evaluate(() => scrollTo(0,0));
      await page.screenshot({ path: `${evidence}/signup-${confirmed ? "on" : "off"}-${width}.png`, fullPage: true });
    }
  }
  pass("320/375/768/1366/1440px responsive form, usable submit and desktop width");
  stage = "keyboard and client validation";
  await page.setViewportSize({ width:1366,height:768 });
  await page.locator("#first_name").focus(); await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").getAttribute("id"), "last_name");
  await page.locator("#password").fill("ValidPass1!");
  await page.getByRole("button", { name:"Show password",exact:true }).first().focus();
  await page.keyboard.press("Enter"); assert.equal(await page.locator("#password").getAttribute("type"),"text");
  await page.getByRole("button", { name:"Hide password",exact:true }).click();
  await fill("validation");
  await page.locator("#password").fill("lowercaseonly");
  await page.locator("#confirm_password").fill("lowercaseonly");
  await page.getByRole("button", { name:"Create account",exact:true }).click();
  await page.getByRole("alert").filter({hasText:"Use at least 8 characters"}).waitFor();
  assert.equal(await page.locator(":focus").getAttribute("id"),"password");
  await page.locator("#password").fill(password);
  await page.locator("#confirm_password").fill(`${password} `);
  await page.getByRole("button", { name:"Create account",exact:true }).click();
  await page.getByRole("alert").filter({hasText:"Passwords do not match"}).waitFor();
  assert.equal(await page.locator(":focus").getAttribute("id"),"confirm_password");
  assert.equal((await users()).some(user=>user.email===email("validation")),false);
  await page.locator("#profile_photo").setInputFiles({name:"large.png",mimeType:"image/png",buffer:Buffer.alloc(524289)});
  await page.getByRole("alert").filter({hasText:"up to 512 KB"}).waitFor();
  assert.equal(await page.locator("#profile_photo").evaluate(node=>node.checkValidity()),false);
  await page.locator("#profile_photo").setInputFiles({name:"unsafe.svg",mimeType:"image/svg+xml",buffer:Buffer.from("<svg/>")});
  await page.getByRole("alert").filter({hasText:"JPG, PNG or WebP"}).waitFor();
  await page.locator("#profile_photo").setInputFiles(file(png));
  await page.getByAltText("Selected profile picture").waitFor();
  assert.ok(await page.getByAltText("Selected profile picture").evaluate(node=>node.complete && node.naturalWidth>0));
  await page.locator("#profile_photo").focus();
  assert.equal(await page.locator(":focus").getAttribute("id"),"profile_photo");
  assert.notEqual(await page.locator('label[for="profile_photo"]').evaluate(node=>getComputedStyle(node).outlineStyle),"none");
  const chooserEvent = page.waitForEvent("filechooser");
  await page.keyboard.press("Space");
  await (await chooserEvent).setFiles(file(png));
  pass("keyboard focus/file picker/password visibility, client password policy/exact confirmation, preview/type/size feedback");
  stage = "server validation";
  const fields={first_name:"Test",last_name:"Member",email:email("invalid"),password,confirm_password:password,role:"mentor"};
  assert.match(await directSignup({...fields,password:"weak",confirm_password:"weak"}),/Use at least 8 characters/);
  assert.match(await directSignup({...fields,confirm_password:`${password} `}),/Passwords do not match/);
  assert.match(await directSignup({...fields,profile_photo:new File(["fake png"],"fake.png",{type:"image/png"})}),/not a supported image/);
  assert.equal((await users()).some(user=>user.email===email("invalid")),false);
  pass("direct Server Action rejects weak/mismatched passwords and spoofed images before account creation");
  stage = "real signup";
  await fill("main",png);
  await page.getByRole("button", {name:"Create account",exact:true}).click();
  if (confirmed) {
    await page.getByRole("heading",{name:"Check your email",exact:true}).waitFor();
    await page.getByText("If you selected a picture, choose it again",{exact:false}).waitFor();
    const user=await fixture("main");
    assert.equal(user.email_confirmed_at,undefined);
    assert.ok((await admin.storage.from("profile-photos").download(`${user.id}/avatar`)).error,"No photo before authentication");
    await confirmMailbox("main"); await login("main");
    await page.locator("#profile_photo").setInputFiles(file(png));
    await page.getByRole("button",{name:"Save picture",exact:true}).click();
    await page.getByText("Profile picture saved.",{exact:true}).waitFor();
  } else await page.waitForURL(url=>url.pathname==="/profile");
  const owner=await fixture("main");
  assert.equal(owner.user_metadata.first_name,"Test"); assert.equal(owner.user_metadata.last_name,"Member");
  const profile=ok(await admin.from("profiles").select("full_name,role").eq("id",owner.id).single(),"Created profile");
  assert.equal(profile.full_name,"Test Member"); assert.equal(profile.role,"mentor");
  assert.equal(hash(await download(admin,owner.id)),hash(png));
  pass(`real signup with confirmations ${confirmed ? "enabled (mail sink and real confirmation)" : "disabled"}, split-name compatibility and authenticated photo persistence`);
  stage = "replacement and permissions";
  await page.goto(new URL("/profile/photo",app).href);
  await page.getByAltText("Your current profile picture").waitFor();
  await page.reload();
  assert.ok(await page.getByAltText("Your current profile picture").evaluate(node=>node.complete&&node.naturalWidth>0));
  const previousImage = hash(await page.getByAltText("Your current profile picture").screenshot());
  await page.locator("#profile_photo").setInputFiles(file(replacement));
  await page.getByRole("button",{name:"Save picture",exact:true}).click();
  await page.getByText("Profile picture saved.",{exact:true}).waitFor();
  assert.equal(hash(await download(admin,owner.id)),hash(replacement));
  let changedImage = false;
  for(let attempt=0;attempt<10;attempt++) {
    if(hash(await page.getByAltText("Your current profile picture").screenshot())!==previousImage) { changedImage=true;break; }
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(changedImage,"Replacement must update the visible image, not only stored bytes");
  const ownerSdk=createClient(api.href,publicKey,sdkOptions);
  ok(await ownerSdk.auth.signInWithPassword({email:email("main"),password}),"Owner password sign-in");
  assert.equal(hash(await download(ownerSdk,owner.id)),hash(replacement));
  assert.ok((await anonymous.storage.from("profile-photos").download(`${owner.id}/avatar`)).error);
  assert.ok((await anonymous.storage.from("profile-photos").upload(`${owner.id}/avatar`,png,{contentType:"image/png",upsert:true})).error);
  const stranger=ok(await admin.auth.admin.createUser({email:email("stranger"),password,email_confirm:true,user_metadata:{full_name:"Legacy Member",role:"mentee"}}),"Create stranger fixture").user;
  fixtureIds.add(stranger.id);
  assert.equal(stranger.user_metadata.first_name,undefined);
  assert.equal(ok(await admin.from("profiles").select("full_name").eq("id",stranger.id).single(),"Legacy profile name").full_name,"Legacy Member");
  const strangerSdk=createClient(api.href,publicKey,sdkOptions);
  ok(await strangerSdk.auth.signInWithPassword({email:email("stranger"),password}),"Stranger sign-in");
  for(const upsert of [false,true]) assert.ok((await strangerSdk.storage.from("profile-photos").upload(`${owner.id}/avatar`,png,{contentType:"image/png",upsert})).error);
  assert.ok((await ownerSdk.storage.from("profile-photos").upload(`${owner.id}/other-path`,png,{contentType:"image/png"})).error);
  const publicRead=await fetch(new URL(`/storage/v1/object/public/profile-photos/${owner.id}/avatar`,api));
  assert.ok(!publicRead.ok,"Private bucket has no anonymous public endpoint");
  assert.equal(hash(await download(admin,owner.id)),hash(replacement),"Rejected writes preserve owner content");
  ok(await ownerSdk.auth.signOut(),"Revoke owner SDK session"); ok(await strangerSdk.auth.signOut(),"Revoke stranger SDK session");
  assert.equal(ok(await admin.from("profiles").select("full_name").eq("id",stranger.id).single(),"Legacy name preserved").full_name,"Legacy Member");
  pass("reload/replacement bytes and legacy full-name compatibility; anonymous reads/writes, other-user inserts/upserts and arbitrary owner paths denied");
  await logout();
  if(!confirmed) {
    stage = "optional upload failure and retry";
    originalBucket=ok(await admin.storage.getBucket("profile-photos"),"Inspect disposable bucket");
    ok(await admin.storage.updateBucket("profile-photos",{fileSizeLimit:1}),"Induce isolated upload failure"); bucketChanged=true;
    await fill("retry",png); await page.getByRole("button",{name:"Create account",exact:true}).click();
    await page.waitForURL(url=>url.pathname==="/profile/photo"&&url.searchParams.get("retry")==="1");
    await page.getByText("Your account was created, but your picture could not be uploaded.",{exact:false}).waitFor();
    const retry=await fixture("retry");
    assert.ok(ok(await admin.from("profiles").select("id").eq("id",retry.id).single(),"Profile survives optional failure"));
    ok(await admin.storage.updateBucket("profile-photos",{fileSizeLimit:originalBucket.file_size_limit}),"Restore disposable bucket"); bucketChanged=false;
    await page.locator("#profile_photo").setInputFiles(file(png)); await page.getByRole("button",{name:"Save picture",exact:true}).click();
    await page.getByText("Profile picture saved.",{exact:true}).waitFor();
    assert.equal(hash(await download(admin,retry.id)),hash(png));
    await logout();
    pass("real optional Storage failure preserves authenticated account/profile and retry succeeds without duplicate registration");
    stage = "signup without a photo";
    await fill("no-photo"); await page.getByRole("button",{name:"Create account",exact:true}).click();
    await page.waitForURL(url=>url.pathname==="/profile"); const noPhoto=await fixture("no-photo");
    assert.ok((await admin.storage.from("profile-photos").download(`${noPhoto.id}/avatar`)).error);
    await logout(); pass("signup without an optional photo remains successful");
  }
  assert.deepEqual(errors,[],"No browser JavaScript exceptions");
} catch(error) {
  console.error(`FAIL during ${stage}: ${error.name}`);
  // Preserve a private diagnostic locally; never print account data or URLs.
  await writeFile("/private/tmp/issue36-private-failure.txt",String(error.stack),{mode:0o600});
  process.exitCode=1;
} finally {
  await context.close(); await browser.close();
  if(bucketChanged) ok(await admin.storage.updateBucket("profile-photos",{fileSizeLimit:originalBucket.file_size_limit}),"Restore bucket after failure");
  for(const user of await users()) if(user.email?.startsWith(`${run}-`)) fixtureIds.add(user.id);
  for(const id of fixtureIds) {
    ok(await admin.storage.from("profile-photos").remove([`${id}/avatar`]),"Remove fixture avatar");
    // Revoke all fixture sessions before deleting the account.
    const session=await anonymous.auth.signInWithPassword({email:(await users()).find(user=>user.id===id)?.email,password});
    if(!session.error) await anonymous.auth.signOut({scope:"global"});
    ok(await admin.auth.admin.deleteUser(id),"Remove fixture account");
  }
  assert.deepEqual((await users()).map(user=>user.id).sort(),baseline,"Original isolated accounts preserved");
  console.log(`CLEANUP PASS: ${fixtureIds.size} fixture accounts/avatars removed; baseline restored.`);
}
console.log(`REGISTRATION ACCEPTANCE ${process.exitCode ? "FAILED" : "PASSED"}: ${passed} checks; confirmations ${confirmed ? "on" : "off"}. Local browser/Auth/Storage only.`);
