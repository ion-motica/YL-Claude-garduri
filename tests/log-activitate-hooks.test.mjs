import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  caleRepositoryLogLocal,
  scrieLogActivitateHook,
} from "../shared/program_scrie_log_activitate_hooks.mjs";

function git(args, cwd = null) {
  return execFileSync("git", args, {
    cwd: cwd || undefined,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const dir = mkdtempSync(path.join(os.tmpdir(), "yl-hook-log-test-"));
const filePath = path.join(dir, "log activitate hooks.txt");

scrieLogActivitateHook({
  sessionId: "sesiune-test",
  hookEvent: "PreToolUse",
  folderHookRepo: "Hook Test - cand X fa Y",
  activitate: "a facut Y",
  ccn: "Hook Test - cand X fa Y a facut Y.",
  additionalContext: "CONTEXT PENTRU CLAUDE\nlinia 2",
  permissionDecisionReason: "motiv deny exact",
  alteMesajeCatreClaude: "alt mesaj catre Claude",
  alteActivitati: "activitate interna 1\nactivitate interna 2",
  now: new Date("2026-09-17T14:00:00Z"),
  filePath,
});

const text = readFileSync(filePath, "utf8");
assert.match(text, /REGULA:/);
assert.match(text, /CCN_BEGIN\nHook Test - cand X fa Y a facut Y\.\nCCN_END/);
assert.match(text, /ADDITIONAL_CONTEXT_BEGIN\nCONTEXT PENTRU CLAUDE\nlinia 2\nADDITIONAL_CONTEXT_END/);
assert.match(text, /PERMISSION_DECISION_REASON_BEGIN\nmotiv deny exact\nPERMISSION_DECISION_REASON_END/);
assert.match(text, /ALTE_MESAJE_CATRE_CLAUDE_BEGIN\nalt mesaj catre Claude\nALTE_MESAJE_CATRE_CLAUDE_END/);
assert.match(text, /ALTE_ACTIVITATI_BEGIN\nactivitate interna 1\nactivitate interna 2\nALTE_ACTIVITATI_END/);
assert.match(text, /DATA_ORA: 2026\.09\.17-17\.00\.00 Europe\/Bucharest/);

assert.match(
  caleRepositoryLogLocal("abc/def"),
  /yl-claude-garduri[\\/]repo-log-hooks[\\/]abc_def$/,
);

const sursa = path.join(dir, "sursa");
const remoteBare = path.join(dir, "remote.git");
const clonaLogger = path.join(dir, "clona-logger");
mkdirSync(sursa, { recursive: true });
git(["init", "-b", "main"], sursa);
writeFileSync(path.join(sursa, "README.md"), "# test remote\n", "utf8");
git(["add", "README.md"], sursa);
git([
  "-c", "user.name=Test",
  "-c", "user.email=test@example.invalid",
  "commit", "-m", "Initial",
], sursa);
git(["clone", "--bare", sursa, remoteBare]);

const caleRemote1 = scrieLogActivitateHook({
  sessionId: "sesiune-git-test",
  hookEvent: "UserPromptSubmit",
  folderHookRepo: "Hook Test",
  activitate: "prima intrare",
  ccn: "Hook Test a facut prima intrare.",
  localRepoPath: clonaLogger,
  remoteUrl: remoteBare,
  now: new Date("2026-09-18T08:00:00Z"),
});

assert.equal(caleRemote1, path.join(clonaLogger, "log activitate hooks.txt"));

scrieLogActivitateHook({
  sessionId: "sesiune-git-test",
  hookEvent: "PreToolUse",
  folderHookRepo: "Hook Test 2",
  activitate: "a doua intrare",
  ccn: "Hook Test 2 a facut a doua intrare.",
  permissionDecisionReason: "motiv 2",
  localRepoPath: clonaLogger,
  remoteUrl: remoteBare,
  now: new Date("2026-09-18T08:01:00Z"),
});

const textRemote = git([
  "--git-dir", remoteBare,
  "show", "main:log activitate hooks.txt",
]);

assert.match(textRemote, /prima intrare/);
assert.match(textRemote, /a doua intrare/);
assert.match(textRemote, /PERMISSION_DECISION_REASON_BEGIN\nmotiv 2\nPERMISSION_DECISION_REASON_END/);

const nrCommituri = Number(git([
  "--git-dir", remoteBare,
  "rev-list", "--count", "main",
]));
assert.equal(nrCommituri, 3);

console.log("LOG ACTIVITATE HOOKS + REPO SEPARAT + PUSH + PERMISSION DECISION REASON TEST OK");
