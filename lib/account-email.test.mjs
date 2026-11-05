import assert from "node:assert/strict";
import test from "node:test";
import { createServerClient } from "@supabase/ssr";
import { readAccountEmailChallenge, accountEmailRetrySeconds, accountEmailError, requestAccountEmail, verifyAccountEmail } from "./account-email.ts";

test("account-email context is bounded, purpose-specific and not identity evidence", () => {
  const now=1_000_000;
  const challenge={email:"member@example.test",purpose:"signup",requestedAt:now,next:"/profile"};
  assert.deepEqual(readAccountEmailChallenge(JSON.stringify(challenge),"signup",now),challenge);
  assert.equal(readAccountEmailChallenge(JSON.stringify(challenge),"recovery",now),null);
  assert.equal(readAccountEmailChallenge(JSON.stringify(challenge),"signup",now+600_000),null);
  for(const value of ["broken","null","{}",JSON.stringify({...challenge,email:"bad"}),JSON.stringify({...challenge,requestedAt:now+1})])assert.equal(readAccountEmailChallenge(value,"signup",now),null);
  assert.equal(accountEmailRetrySeconds(challenge,now),60);assert.equal(accountEmailRetrySeconds(challenge,now+60_000),0);
});

test("resend and reset requests use supported provider APIs without creating accounts", async () => {
  const calls=[];
  const auth={resend:async value=>{calls.push(["resend",value]);return{error:null};},resetPasswordForEmail:async value=>{calls.push(["reset",value]);return{error:null};}};
  await requestAccountEmail(auth,"signup","member@example.test");await requestAccountEmail(auth,"recovery","member@example.test");
  assert.deepEqual(calls,[["resend",{type:"signup",email:"member@example.test"}],["reset","member@example.test"]]);
  for(const purpose of ["signup","recovery"]){const failure=async()=>{throw Error("private provider detail");};assert.equal(await requestAccountEmail({resend:failure,resetPasswordForEmail:failure},purpose,"unknown@example.test"),undefined);}
});

test("verification needs provider user/session proof and never reflects private errors", async () => {
  for(const purpose of ["signup","recovery"]){
    let called=false;
    assert.match(await verifyAccountEmail({verifyOtp:async()=>{called=true;}},purpose,"member@example.test","bad"),/6–10 digit/);assert.equal(called,false);
    assert.match(await verifyAccountEmail({verifyOtp:async()=>({data:{},error:{status:403,message:"private account detail"}})},purpose,"member@example.test","12345678"),/invalid or has expired/);
    assert.match(await verifyAccountEmail({verifyOtp:async()=>({data:{user:{}},error:null})},purpose,"member@example.test","12345678"),/could not establish/);
    assert.equal(await verifyAccountEmail({verifyOtp:async value=>{assert.equal(value.type,purpose);return{data:{user:{},session:{}},error:null};}},purpose,"member@example.test","12345678"),null);
  }
  assert.match(accountEmailError(429),/Too many attempts/);assert.match(accountEmailError(503),/temporarily unavailable/);
});

test("real SSR SDK sends the selected confirmation/recovery type and persists the verified session", async () => {
  for(const purpose of ["signup","recovery"]){
    const jar=new Map();let request;
    const client=createServerClient("https://project.example.test","public-test-key",{cookies:{getAll:()=>[],setAll:items=>items.forEach(item=>jar.set(item.name,item.value))},global:{fetch:async(url,options)=>{assert.equal(new URL(url).pathname,"/auth/v1/verify");request=JSON.parse(options.body);return Response.json({access_token:"test-access",refresh_token:"test-refresh",expires_in:3600,token_type:"bearer",user:{id:"fixture",email:"member@example.test"}});}}});
    assert.equal(await verifyAccountEmail(client.auth,purpose,"member@example.test","12345678"),null);
    assert.equal(request.type,purpose);assert.ok([...jar.keys()].some(name=>name.includes("auth-token")));
  }
});
