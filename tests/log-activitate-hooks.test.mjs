import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  caleLogActivitateHooksDinRepository,
  scrieLogActivitateHook,
} from "../shared/program_scrie_log_activitate_hooks.mjs";

const dir = mkdtempSync(path.join(os.tmpdir(), "yl-hook-log-test-"));
const filePath = path.join(dir, "log activitate hooks.txt");

const exempluRoot = path.join(dir, "repo-yl");
assert.equal(
  caleLogActivitateHooksDinRepository(exempluRoot),
  path.join(exempluRoot, "1 Hook Tests", "log activitate hooks.txt"),
);

scrieLogActivitateHook({
  sessionId: "sesiune-test",
  hookEvent: "UserPromptSubmit",
  folderHookRepo: "Hook Test - cand X fa Y",
  activitate: "a facut Y",
  ccn: "Hook Test - cand X fa Y a facut Y.",
  additionalContext: "CONTEXT PENTRU CLAUDE\nlinia 2",
  alteMesajeCatreClaude: "permissionDecisionReason de test",
  alteActivitati: "activitate interna 1\nactivitate interna 2",
  now: new Date("2026-09-17T14:00:00Z"),
  filePath,
});

const text = readFileSync(filePath, "utf8");
assert.match(text, /REGULA:/);
assert.match(text, /CCN_BEGIN\nHook Test - cand X fa Y a facut Y\.\nCCN_END/);
assert.match(text, /ADDITIONAL_CONTEXT_BEGIN\nCONTEXT PENTRU CLAUDE\nlinia 2\nADDITIONAL_CONTEXT_END/);
assert.match(text, /ALTE_MESAJE_CATRE_CLAUDE_BEGIN\npermissionDecisionReason de test\nALTE_MESAJE_CATRE_CLAUDE_END/);
assert.match(text, /ALTE_ACTIVITATI_BEGIN\nactivitate interna 1\nactivitate interna 2\nALTE_ACTIVITATI_END/);
assert.match(text, /DATA_ORA: 2026\.09\.17-17\.00\.00 Europe\/Bucharest/);

const repoGit = mkdtempSync(path.join(os.tmpdir(), "yl-hook-log-git-test-"));
execFileSync("git", ["init", repoGit], { stdio: "ignore" });

const caleRuntime = scrieLogActivitateHook({
  sessionId: "sesiune-git-test",
  hookEvent: "UserPromptSubmit",
  folderHookRepo: "Hook Test",
  activitate: "testeaza log in repo",
  repositoryRoot: repoGit,
});

assert.equal(
  caleRuntime,
  path.join(repoGit, "1 Hook Tests", "log activitate hooks.txt"),
);

const caleIgnorata = execFileSync(
  "git",
  ["-C", repoGit, "check-ignore", "1 Hook Tests/log activitate hooks.txt"],
  { encoding: "utf8" },
).trim();

assert.equal(caleIgnorata, "1 Hook Tests/log activitate hooks.txt");

const textRuntime = readFileSync(caleRuntime, "utf8");
assert.match(textRuntime, /GIT_LOCAL_EXCLUDE: OK:/);

console.log("LOG ACTIVITATE HOOKS + CALE YL + GIT LOCAL EXCLUDE TEST OK");
