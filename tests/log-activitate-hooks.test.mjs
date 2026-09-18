import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  caleRepositoryLogLocal,
  citesteTitluChatDinTranscript,
  citesteUltimulPromptUserDinTranscript,
  memoreazaTitluSesiune,
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

const dir = mkdtempSync(path.join(os.tmpdir(), "yl-hook-log-human-ordonat-test-"));
const transcriptPath = path.join(dir, "transcript.jsonl");
writeFileSync(
  transcriptPath,
  [
    JSON.stringify({ type: "ai-title", aiTitle: "Titlu AI initial" }),
    JSON.stringify({ type: "user", message: { role: "user", content: "primul prompt" } }),
    JSON.stringify({ type: "custom-title", customTitle: "Titlu chat test" }),
    JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "text", text: "prompt curent din transcript" }] } }),
  ].join("\n") + "\n",
  "utf8",
);

assert.equal(citesteTitluChatDinTranscript(transcriptPath), "Titlu chat test");
assert.equal(citesteUltimulPromptUserDinTranscript(transcriptPath), "prompt curent din transcript");

const transcriptIntarziatPath = path.join(dir, "transcript-intarziat.jsonl");
writeFileSync(
  transcriptIntarziatPath,
  `${JSON.stringify({ type: "user", message: { role: "user", content: "PROMPT VECHI DIN TRANSCRIPT" } })}\n`,
  "utf8",
);

const sursa = path.join(dir, "sursa");
const remoteBare = path.join(dir, "remote.git");
const clonaLogger = path.join(dir, "clona-logger");
const sessionId = `sesiune-git-test-${process.pid}-${Date.now()}`;
const promptId = "prompt-id-corect-001";

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

assert.equal(memoreazaTitluSesiune({
  sessionId,
  sessionTitle: "Titlu capturat la SessionStart",
}), true);

const rezultat1 = scrieLogActivitateHook({
  sessionId,
  promptId,
  hookEvent: "UserPromptSubmit",
  folderHookRepo: "Hook updater + Hook reminder",
  activitate: "a rulat updaterul si reminderul",
  ccn: "CCN tehnic combinat",
  additionalContext: "REMINDER EXACT PENTRU CLAUDE",
  repositoryRoot: "/home/user/yl",
  transcriptPath: transcriptIntarziatPath,
  promptText: "promptul trimis acum",
  humanGarduri: [
    {
      folder: "Hook UserPromptSubmit - cand trimit prompt update all garduri din github",
      actiuni: [
        "Nu a detectat nimic de actualizat.",
        "A inserat in CCN:",
        "Hook updater a facut verificarea.",
      ],
    },
    {
      folder: "Hook UserPromptSubmit - cand trimit prompt insereaza reminder",
      actiuni: [
        "A inserat in CCN:",
        "Hook reminder a facut inserarea reminderelor: 1.",
        "A inserat in additional context:",
        "REMINDER EXACT PENTRU CLAUDE",
      ],
    },
  ],
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
  sessionId,
  promptId,
  hookEvent: "PreToolUse",
  folderHookRepo: "Hook PreToolUse - test",
  activitate: "a blocat apelul Write pentru /home/user/yl/protejat.txt",
  ccn: "Hook PreToolUse - test a facut blocarea.",
  permissionDecision: "deny",
  permissionDecisionReason: "In plan ai convenit sa nu modifici acest fisier.",
  toolName: "Write",
  targetPath: "/home/user/yl/protejat.txt",
  repositoryRoot: "/home/user/yl",
  transcriptPath: transcriptIntarziatPath,
  humanGarduri: [
    {
      folder: "Hook PreToolUse - test",
      actiuni: [
        "A blocat activarea uneltei Write pentru /home/user/yl/protejat.txt.",
        "Motiv: In plan ai convenit sa nu modifici acest fisier.",
      ],
    },
  ],
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
assert.match(human, /=======================================/);
assert.match(human, /DATA_ORA: 2026\.09\.18-11\.00\.00 Europe\/Bucharest/);
assert.doesNotMatch(human, /DATA_ORA: 2026\.09\.18-11\.01\.00 Europe\/Bucharest/);
assert.equal((human.match(/DATA_ORA:/g) || []).length, 1);
assert.match(human, /TITLU_CHAT: Titlu capturat la SessionStart/);
assert.match(human, /PROMPT_SCRIS_DE_USER_BEGIN\npromptul trimis acum\nPROMPT_SCRIS_DE_USER_END/);
assert.doesNotMatch(human, /PROMPT VECHI DIN TRANSCRIPT/);
assert.equal((human.match(/PROMPT_SCRIS_DE_USER_BEGIN/g) || []).length, 1);
assert.equal((human.match(/\+{16}/g) || []).length, 3);
assert.match(
  human,
  /\+{16}\nHook UserPromptSubmit - cand trimit prompt update all garduri din github\nNu a detectat nimic de actualizat\./,
);
assert.match(
  human,
  /Hook UserPromptSubmit - cand trimit prompt insereaza reminder[\s\S]*A inserat in additional context:\nREMINDER EXACT PENTRU CLAUDE/,
);
assert.match(
  human,
  /PROMPT_SCRIS_DE_USER_BEGIN\npromptul trimis acum\nPROMPT_SCRIS_DE_USER_END[\s\S]*\+{16}\nHook PreToolUse - test\nA blocat activarea uneltei Write/,
);
assert.doesNotMatch(human, /GARD: Hook updater \+ Hook reminder/);
assert.doesNotMatch(human, /NODE_VERSION:/);
assert.doesNotMatch(human, /PERMISSION_DECISION_REASON_BEGIN/);

const tehnic = git([
  "--git-dir", remoteBare,
  "show", `main:${NUME_FISIER_LOG_TEHNIC}`,
]);

assert.match(tehnic, /LOG TEHNIC/);
assert.match(tehnic, /SECTIUNE_COMUNA_BEGIN/);
assert.match(tehnic, /LOG_SCHEMA_VERSION: 4/);
assert.match(tehnic, /TITLU_CHAT: Titlu capturat la SessionStart/);
assert.match(tehnic, /USER_PROMPT_BEGIN\npromptul trimis acum\nUSER_PROMPT_END/);
assert.doesNotMatch(tehnic, /PROMPT VECHI DIN TRANSCRIPT/);
assert.equal((tehnic.match(/USER_PROMPT_BEGIN\npromptul trimis acum\nUSER_PROMPT_END/g) || []).length, 2);
assert.match(tehnic, /TRANSCRIPT_PATH:/);
assert.match(tehnic, /DATA_ORA: 2026\.09\.18-11\.01\.00 Europe\/Bucharest/);
assert.match(tehnic, new RegExp(`SESIUNE: ${sessionId}`));
assert.match(tehnic, /PROMPT_ID: prompt-id-corect-001/);
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
assert.match(
  tehnic,
  /PERMISSION_DECISION_REASON_BEGIN\nIn plan ai convenit sa nu modifici acest fisier\.\nPERMISSION_DECISION_REASON_END/,
);
assert.match(tehnic, /DETALII_SPECIFICE_GARDULUI_BEGIN\nlista protectie: activa\nDETALII_SPECIFICE_GARDULUI_END/);

const nrCommituri = Number(git([
  "--git-dir", remoteBare,
  "rev-list", "--count", "main",
]));
assert.equal(nrCommituri, 3);

console.log("LOG HUMAN PE PROMPT + GARDURI SEPARATE + LOG TEHNIC V4 TEST OK");
