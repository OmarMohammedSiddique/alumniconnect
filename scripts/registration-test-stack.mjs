// Disposable local backend for issue #36. Never resets an existing project.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const project = "alumnikonneqt-issue36";
const root = fileURLToPath(new URL("../", import.meta.url));
const directory = "/private/tmp/alumnikonneqt-issue36";
const configPath = join(directory, "supabase/config.toml");
const environmentPath = "/private/tmp/issue36.env";
const logPath = "/private/tmp/issue36-stack-command.log";
const cli = join(root, "node_modules/.bin/supabase");
const command = process.argv[2];
assert.ok(["prepare", "start", "confirmations-on", "stop", "build", "serve", "test"].includes(command), "Usage: node scripts/registration-test-stack.mjs prepare|start|confirmations-on|stop|build|serve|test");
function config() {
  const text = readFileSync(configPath, "utf8");
  assert.ok(text.includes(`project_id = "${project}"`), "Refuse a different project ID");
  assert.ok(text.includes("port = 56321"), "Refuse a different API port");
  return text;
}
function run(args) {
  // Capture CLI output privately: status/start output can contain local keys.
  const result = spawnSync(cli, [...args, "--workdir", directory], { encoding: "utf8", cwd: root, timeout: 300_000 });
  writeFileSync(logPath, `${result.stdout ?? ""}\n${result.stderr ?? ""}`, { mode: 0o600 });
  assert.equal(result.status, 0, `Disposable stack command failed; inspect ${logPath} privately`);
  return result.stdout;
}
function environment() {
  const status = JSON.parse(run(["status", "--output", "json"]));
  assert.equal(new URL(status.API_URL).origin, "http://127.0.0.1:56321");
  const values = {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    SITE_URL: "http://127.0.0.1:3110",
    REGISTRATION_APP_URL: "http://127.0.0.1:3110",
    REGISTRATION_MAIL_URL: "http://127.0.0.1:56324",
    REGISTRATION_PROJECT: project,
    REGISTRATION_CONFIRMATIONS: /\[auth.email\][\s\S]*?enable_confirmations = true/.test(config()) ? "on" : "off",
    REGISTRATION_EVIDENCE_DIR: "/private/tmp/issue36-evidence",
  };
  for(const key of ["REGISTRATION_PLAYWRIGHT_PATH", "REGISTRATION_BROWSER_EXECUTABLE"]) if(process.env[key]) values[key] = process.env[key];
  writeFileSync(environmentPath, Object.entries(values).map(([key,value])=>`${key}=${value}`).join("\n")+"\n", { mode:0o600 });
  console.log(`Private local test settings: ${environmentPath} (contains disposable keys; do not commit).`);
}
if(["build", "serve", "test"].includes(command)) {
  config();
  const settings=Object.fromEntries(readFileSync(environmentPath,"utf8").trim().split("\n").map(line=>{const separator=line.indexOf("=");return [line.slice(0,separator),line.slice(separator+1)];}));
  const args=command==="test" ? [join(root,"scripts/verify-registration.mjs")] : [join(root,"node_modules/next/dist/bin/next"),...(command==="build" ? ["build","--webpack"] : ["start","--hostname","127.0.0.1","--port","3110"])];
  // Spawn without inheriting execArgv: Next workers reject --env-file in NODE_OPTIONS.
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:"inherit",env:{...process.env,...settings}});
  process.exitCode=result.status??1;
} else if(command === "prepare") {
  if(existsSync(configPath)) config();
  mkdirSync(join(directory,"supabase"),{recursive:true});
  for(const name of ["migrations","templates"]) cpSync(join(root,"supabase",name),join(directory,"supabase",name),{recursive:true});
  let text=readFileSync(join(root,"supabase/config.toml"),"utf8")
    .replace('project_id = "alumniconnect"',`project_id = "${project}"`)
    .replace(/543(\d\d)/g,"563$1").replace("8083","8183")
    .replaceAll("http://127.0.0.1:3000","http://127.0.0.1:3110")
    .replace(/(\[db.seed\][\s\S]*?enabled = )true/,"$1false")
    .replace(/(\[auth.external.google\][\s\S]*?enabled = )true/,"$1false")
    .replace(/(\[auth.email\][\s\S]*?enable_confirmations = )true/,"$1false");
  writeFileSync(configPath,text); config();
  console.log("Prepared isolated project/ports with no seed data, external OAuth or production SMTP.");
} else {
  config();
  if(command === "stop" || command === "confirmations-on") run(["stop","--project-id",project]);
  if(command === "confirmations-on") writeFileSync(configPath,config().replace(/(\[auth.email\][\s\S]*?enable_confirmations = )false/,"$1true"));
  if(command !== "stop") {
    run(["start","--exclude","studio,meta,realtime,edge-runtime,functions,analytics,vector,imgproxy"]);
    environment(); console.log("Disposable backend ready; existing local/hosted projects unchanged.");
  } else console.log("Stopped only the disposable backend; test volumes retained.");
}
