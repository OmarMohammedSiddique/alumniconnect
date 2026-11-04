import assert from "node:assert/strict";
import test from "node:test";
import { createServerClient } from "@supabase/ssr";
import { beginGoogleSignIn, checkGoogleProvider, finishGoogleSignIn, getGoogleAuthMessage, getGoogleAuthOrigin, getGoogleCallbackOrigin } from "./google-auth.ts";
import { getSafeSignInRedirect } from "./auth-redirect.ts";

const serviceUrl = "https://project.example.test";

test("uses an explicit production origin and permits loopback-only development inference", () => {
  assert.equal(getGoogleAuthOrigin("http://127.0.0.1:3000", undefined, false), "http://127.0.0.1:3000");
  assert.equal(getGoogleAuthOrigin("http://localhost:3000", undefined, false), "http://localhost:3000");
  assert.equal(getGoogleAuthOrigin("https://attacker.test", "https://app.example.test", true), "https://app.example.test");
  for (const [request, configured, production] of [
    ["https://attacker.test", undefined, false], ["http://localhost:3000", undefined, true],
    ["", "http://app.example.test", true], ["", "https://user:password@app.example.test", true],
    ["", "https://app.example.test/path", true], ["", "https://app.example.test/?next=evil", true],
    ["", "javascript:alert(1)", true], ["", "//attacker.test", true],
  ]) assert.throws(() => getGoogleAuthOrigin(request, configured, production));
});

test("checks the actual provider flag without caching or exposing provider errors", async () => {
  let options;
  assert.equal(await checkGoogleProvider(serviceUrl, "public-test-key", async (url, init) => {
    assert.equal(url, `${serviceUrl}/auth/v1/settings`); options = init;
    return Response.json({ external: { google: true } });
  }), null);
  assert.equal(options.cache, "no-store");
  assert.equal(options.headers.apikey, "public-test-key");
  for (const settings of [{}, {external:{google:false}}, {external:{google:"true"}}]) {
    assert.equal(await checkGoogleProvider(serviceUrl, "key", async () => Response.json(settings)), "not_configured");
  }
  assert.equal(await checkGoogleProvider(serviceUrl, "key", async () => new Response("private service detail", {status:500})), "unavailable");
  assert.equal(await checkGoogleProvider(serviceUrl, "key", async () => { throw Error("private connection detail"); }), "unavailable");
});

test("real SSR SDK creates a PKCE verifier cookie and an OAuth authorize URL", async () => {
  const cookies = new Map();
  const supabase = createServerClient(serviceUrl, "public-test-key", { cookies: {
    getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
    setAll: (values) => values.forEach(({name, value}) => cookies.set(name, value)),
  }});
  const callback = "http://localhost:3000/auth/callback?next=%2Fprofile";
  const result = await beginGoogleSignIn(supabase.auth, callback, serviceUrl);
  assert.equal(result.error, null);
  const target = new URL(result.url);
  assert.equal(target.origin, serviceUrl);
  assert.equal(target.pathname, "/auth/v1/authorize");
  assert.equal(target.searchParams.get("provider"), "google");
  assert.equal(target.searchParams.get("redirect_to"), callback);
  assert.equal(target.searchParams.get("code_challenge_method"), "s256");
  assert.ok(target.searchParams.get("code_challenge"));
  assert.equal(target.searchParams.get("prompt"), "select_account");
  assert.equal(target.searchParams.get("scopes"), "openid email profile");
  assert.ok([...cookies.keys()].some(name => name.includes("code-verifier")));
});

test("does not navigate to unexpected authorize URLs or expose SDK failures", async () => {
  for (const url of ["https://attacker.test/auth/v1/authorize?provider=google", `${serviceUrl}/other?provider=google`, `${serviceUrl}/auth/v1/authorize?provider=github`, "javascript:alert(1)"]) {
    const result = await beginGoogleSignIn({signInWithOAuth: async () => ({data:{url},error:null})}, "https://app.example.test/auth/callback", serviceUrl);
    assert.equal(result.url, null); assert.equal(result.error, "unavailable");
  }
  assert.equal((await beginGoogleSignIn({signInWithOAuth: async () => {throw Error("private detail");}}, "https://app.example.test/auth/callback", serviceUrl)).error, "unavailable");
});

test("cancellation and missing codes do not attempt a session exchange", async () => {
  const auth = { exchangeCodeForSession: async () => { assert.fail("must not exchange"); } };
  assert.equal(await finishGoogleSignIn(new URLSearchParams("error=access_denied&error_description=private"), auth), "cancelled");
  assert.equal(await finishGoogleSignIn(new URLSearchParams("error=server_error"), auth), "exchange_failed");
  assert.equal(await finishGoogleSignIn(new URLSearchParams(), auth), "exchange_failed");
});

test("exchanges a code once, requires a full session, and keeps redirects internal", async () => {
  const calls = [];
  const auth = {exchangeCodeForSession: async code => {calls.push(code); return {data:{session:{},user:{id:"test-user"}},error:null};}};
  assert.equal(await finishGoogleSignIn(new URLSearchParams("code=disposable-test-code"), auth), null);
  assert.deepEqual(calls, ["disposable-test-code"]);
  for (const data of [{session:null,user:null}, {session:{},user:null}]) {
    assert.equal(await finishGoogleSignIn(new URLSearchParams("code=test"), {exchangeCodeForSession:async()=>({data,error:null})}), "exchange_failed");
  }
  assert.equal(await finishGoogleSignIn(new URLSearchParams("code=test"), {exchangeCodeForSession: async()=>{throw Error("token must not leak");}}), "exchange_failed");
  for (const next of ["//attacker.test", "https://attacker.test", "/\\attacker.test"]) assert.equal(getSafeSignInRedirect(next), "/discover");
  assert.equal(getGoogleAuthMessage("untrusted provider detail"), null);
});

test("real SSR SDK exchanges PKCE and persists session cookies with a mocked Auth service", async () => {
  const cookieJar = new Map();
  const writes = [];
  const cookies = {
    getAll: () => [...cookieJar].map(([name,value]) => ({name,value})),
    setAll: values => values.forEach(({name,value}) => { cookieJar.set(name,value); writes.push(name); }),
  };
  const expiresAt = Math.floor(Date.now()/1000) + 3600;
  const accessToken = [
    Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url"),
    Buffer.from(JSON.stringify({sub:"00000000-0000-4000-8000-000000000001",exp:expiresAt,aud:"authenticated",role:"authenticated"})).toString("base64url"),
    "test-signature",
  ].join(".");
  let exchanges = 0;
  const fetcher = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/auth/v1/token");
    assert.equal(url.searchParams.get("grant_type"), "pkce");
    const body = JSON.parse(init.body);
    assert.equal(body.auth_code, "disposable-test-code");
    assert.ok(body.code_verifier);
    exchanges++;
    return Response.json({
      access_token: accessToken, refresh_token:"disposable-test-refresh", expires_in:3600, expires_at:expiresAt, token_type:"bearer",
      user:{id:"00000000-0000-4000-8000-000000000001",aud:"authenticated",email:"oauth-test@example.test",created_at:new Date().toISOString(),app_metadata:{provider:"google"},user_metadata:{full_name:"Test User"}},
    });
  };
  const initiator = createServerClient(serviceUrl, "public-test-key", {cookies, global:{fetch:fetcher}});
  assert.equal((await beginGoogleSignIn(initiator.auth, "http://localhost:3000/auth/callback", serviceUrl)).error, null);
  assert.ok(writes.some(name => name.includes("code-verifier")));
  const callbackClient = createServerClient(serviceUrl, "public-test-key", {cookies, global:{fetch:fetcher}});
  assert.equal(await finishGoogleSignIn(new URLSearchParams("code=disposable-test-code"), callbackClient.auth), null);
  assert.equal(exchanges, 1);
  assert.ok(writes.some(name => name.endsWith("auth-token")));
  const {data:{session}} = await callbackClient.auth.getSession();
  assert.equal(session.user.id, "00000000-0000-4000-8000-000000000001");
});

test("callback preserves loopback cookies when Next dev reconstructs the request URL", () => {
  const request = new Request("http://localhost:3000/auth/callback", {headers:{host:"127.0.0.1:3000"}});
  assert.equal(getGoogleCallbackOrigin(request, undefined, false), "http://127.0.0.1:3000");
  const forged = new Request("http://localhost:3000/auth/callback", {headers:{host:"attacker.test","x-forwarded-host":"attacker.test"}});
  assert.throws(() => getGoogleCallbackOrigin(forged, undefined, false));
  assert.equal(getGoogleCallbackOrigin(forged, "https://app.example.test", true), "https://app.example.test");
});
