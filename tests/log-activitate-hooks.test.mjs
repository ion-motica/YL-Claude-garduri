import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  caleRepositoryLogLocal,
  NUME_FISIER_LOG_HUMAN_READABLE,
  NUME_FISIER_LOG_TEHNIC,
  scrieLogActivitateHook,
} from "../shared/program_scrie_log_activitate_hooks.mjs";

function git(args, cwd = null) {
  return execFileSync("git", args, {
    cwd: cwd || undefined,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

assert.match(
  caleRepositoryLogLocal("abc/def"),
  /yl-claude-garduri[\\/]repo-log-hooks[\\/]abc_def$/,
);

const dir = mkdtempSync(path.join(os.tmpdir(), "yl-hook-log-dublu-test-"));
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

const rezultat1 = scrieLogActivitateHook({
  sessionId: "sesiune-git-test",
  hookEvent: "UserPromptSubmit",
  folderHookRepo: "Hook UserPromptSubmit - test",
  activitate: "a inserat un reminder",
  ccn: "Hook UserPromptSubmit - test a facut inserarea reminderului.",
  additionalContext: "REMINDER EXACT PENTRU CLAUDE",
  repositoryRoot: "/home/user/yl",
  alteActivitati: "trigger: CP\nremindere: 1",
  localRepoPath: clonaLogger,
  remoteUrl: remoteBare,
  now: new Date("2026-09-18T08:00:00Z"),
});

assert.equal(
  rezultat1.humanReadable,
  path.join(clonaLogger, NUME_FISIER_LOG_HUMAN_READABLE),
);
assert.equal(
  rezultat1.tehnic,
  path.join(clonaLogger, NUME_FISIER_LOG_TEHNIC),
);

scrieLogActivitateHook({
  sessionId: "sesiune-git-test",
  hookEvent: "PreToolUse",
  folderHookRepo: "Hook PreToolUse - test",
  activitate: "a blocat apelul Write pentru /home/user/yl/protejat.txt",
  ccn: "Hook PreToolUse - test a facut blocarea.",
  permissionDecision: "deny",
  permissionDecisionReason: "motiv deny exact",
  toolName: "Write",
  targetPath: "/home/user/yl/protejat.txt",
  repositoryRoot: "/home/user/yl",
  alteActivitati: "lista protectie: activa",
  localRepoPath: clonaLogger,
  remoteUrl: remoteBare,
  now: new Date("2026-09-18T08:01:00Z"),
});

const human = git([
  "--git-dir", remoteBare,
  "show", `main:${NUME_FISIER_LOG_HUMAN_READABLE}`,
]);

assert.match(human, /LOG HUMAN READABLE/);
assert.match(human, /A_FACUT: a inserat un reminder/);
assert.match(human, /CE_A_TRIMIS_LUI_CLAUDE:\nREMINDER EXACT PENTRU CLAUDE/);
assert.match(human, /DECIZIE: deny/);
assert.match(human, /A_FACUT: a blocat apelul Write/);
assert.doesNotMatch(human, /NODE_VERSION:/);
assert.doesNotMatch(human, /motiv deny exact/);

const tehnic = git([
  "--git-dir", remoteBare,
  "show", `main:${NUME_FISIER_LOG_TEHNIC}`,
]);

assert.match(tehnic, /LOG TEHNIC/);
assert.match(tehnic, /SECTIUNE_COMUNA_BEGIN/);
assert.match(tehnic, /LOG_SCHEMA_VERSION: 2/);
assert.match(tehnic, /DATA_ORA: 2026\.09\.18-11\.01\.00 Europe\/Bucharest/);
assert.match(tehnic, /SESIUNE: sesiune-git-test/);
assert.match(tehnic, /HOOK_EVENT: PreToolUse/);
assert.match(tehnic, /FOLDER_GARD_REPO: Hook PreToolUse - test/);
assert.match(tehnic, /PERMISSION_DECISION: deny/);
assert.match(tehnic, /TOOL_NAME: Write/);
assert.match(tehnic, /TARGET_PATH: \/home\/user\/yl\/protejat\.txt/);
assert.match(tehnic, /REPOSITORY_ROOT_PRIMIT: \/home\/user\/yl/);
assert.match(tehnic, /PROCESS_CWD:/);
assert.match(tehnic, /PLUGIN_RUNTIME_ROOT:/);
assert.match(tehnic, /PLUGIN_RUNTIME_COMMIT:/);
assert.match(tehnic, /NODE_VERSION:/);
assert.match(tehnic, /PLATFORM_ARCH:/);
assert.match(tehnic, /LOG_REPOSITORY_REMOTE:/);
assert.match(tehnic, /LOG_REPOSITORY_LOCAL:/);
assert.match(tehnic, /CANALE_CATRE_CLAUDE_BEGIN/);
assert.match(tehnic, /ADDITIONAL_CONTEXT_BEGIN\nREMINDER EXACT PENTRU CLAUDE\nADDITIONAL_CONTEXT_END/);
assert.match(tehnic, /PERMISSION_DECISION_REASON_BEGIN\nmotiv deny exact\nPERMISSION_DECISION_REASON_END/);
assert.match(tehnic, /DETALII_SPECIFICE_GARDULUI_BEGIN\nlista protectie: activa\nDETALII_SPECIFICE_GARDULUI_END/);

const nrCommituri = Number(git([
  "--git-dir", remoteBare,
  "rev-list", "--count", "main",
]));
assert.equal(nrCommituri, 3);

console.log("LOGGING DUBLU + SECTIUNE TEHNICA COMUNA + PUSH TEST OK");
