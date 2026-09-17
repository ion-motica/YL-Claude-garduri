import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  genereazaListeEfectiveDeEditare,
  parseazaReguliProtectie,
  verdictPentruCale,
} from "../Hook PreToolUse - inainte sa modifice Claude un fisier verifica daca e protejat si opreste modificarea/motor_calculeaza_liste_efective_de_fisiere_permise_si_interzise.mjs";
import { proceseazaPreToolUse } from "../Hook PreToolUse - inainte sa modifice Claude un fisier verifica daca e protejat si opreste modificarea/program_hook_PreToolUse_verifica_listele_si_opreste_modificarea_fisierului_protejat.mjs";

function repoTemporar() {
  const root = mkdtempSync(path.join(os.tmpdir(), "yl-pretooluse-test-"));
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  mkdirSync(path.join(root, "js", "protejat"), { recursive: true });
  writeFileSync(path.join(root, "js", "liber.js"), "liber\n", "utf8");
  writeFileSync(path.join(root, "js", "fix.js"), "fix\n", "utf8");
  writeFileSync(path.join(root, "js", "protejat", "a.js"), "a\n", "utf8");
  return root;
}

const RAW_BAZA = `
blocheazaEditareFisiereSiFoldere {
  js/fix.js
  js/protejat/
}

permiteEditarePanaLa(2000.01.01-00.00 Europe/Bucharest) {
  js/fix.js
}

permiteEditareTOT_REPOSITORYPanaLa(2000.01.01-00.00 Europe/Bucharest) {
}
`;

{
  const config = parseazaReguliProtectie(RAW_BAZA, { now: new Date("2026-09-17T10:00:00Z") });
  assert.equal(config.ok, true);
  assert.equal(verdictPentruCale("js/liber.js", config), "permis");
  assert.equal(verdictPentruCale("js/fix.js", config), "interzis");
  assert.equal(verdictPentruCale("js/protejat/a.js", config), "interzis");
  assert.equal(verdictPentruCale("js/protejat/sub/b.js", config), "interzis");
}

{
  const rawExceptie = `
blocheazaEditareFisiereSiFoldere {
  js/fix.js
}
permiteEditarePanaLa(2099.01.01-00.00 Europe/Bucharest) {
  js/fix.js
}
`;
  const config = parseazaReguliProtectie(rawExceptie);
  assert.equal(config.ok, true);
  assert.equal(verdictPentruCale("js/fix.js", config), "permis");
}

{
  const rawTot = `
blocheazaEditareFisiereSiFoldere {
  js/fix.js
  js/protejat/
}
permiteEditareTOT_REPOSITORYPanaLa(2099.01.01-00.00 Europe/Bucharest) {
}
`;
  const config = parseazaReguliProtectie(rawTot);
  assert.equal(config.ok, true);
  assert.equal(verdictPentruCale("js/fix.js", config), "permis");
  assert.equal(verdictPentruCale("js/protejat/a.js", config), "permis");
}

{
  const rawComentat = `
/*
blocheazaEditareFisiereSiFoldere {
  js/fix.js
}
*/
blocheazaEditareFisiereSiFoldere {
  js/protejat/
}
`;
  const config = parseazaReguliProtectie(rawComentat);
  assert.equal(config.ok, true);
  assert.equal(verdictPentruCale("js/fix.js", config), "permis");
  assert.equal(verdictPentruCale("js/protejat/a.js", config), "interzis");
}

{
  const invalid = `blocheazaEditareFisiereSiFoldere {\n  js/fix.js\n`;
  const config = parseazaReguliProtectie(invalid);
  assert.equal(config.ok, false);
  assert.ok(config.erori.some((e) => e.message.includes("neincheiat")));
}

{
  const root = repoTemporar();
  const rezultat = genereazaListeEfectiveDeEditare({
    cwd: root,
    caleCerutaAbsoluta: path.join(root, "js", "liber.js"),
    rawProtectie: RAW_BAZA,
    sessionId: "liste-baza",
  });
  assert.equal(rezultat.ok, true);
  assert.equal(rezultat.tinta, "js/liber.js");
  assert.ok(existsSync(rezultat.fisierPermise));
  assert.ok(existsSync(rezultat.fisierInterzise));
  const permise = readFileSync(rezultat.fisierPermise, "utf8");
  const interzise = readFileSync(rezultat.fisierInterzise, "utf8");
  assert.match(permise, /^js\/liber\.js$/m);
  assert.doesNotMatch(permise, /^js\/fix\.js$/m);
  assert.match(interzise, /^js\/fix\.js$/m);
  assert.match(interzise, /^js\/protejat\/a\.js$/m);
}

{
  const root = repoTemporar();
  const rezultatNouLiber = genereazaListeEfectiveDeEditare({
    cwd: root,
    caleCerutaAbsoluta: path.join(root, "js", "nou.js"),
    rawProtectie: RAW_BAZA,
    sessionId: "nou-liber",
  });
  assert.equal(rezultatNouLiber.ok, true);
  assert.ok(rezultatNouLiber.permise.includes("js/nou.js"));

  const rezultatNouProtejat = genereazaListeEfectiveDeEditare({
    cwd: root,
    caleCerutaAbsoluta: path.join(root, "js", "protejat", "nou.js"),
    rawProtectie: RAW_BAZA,
    sessionId: "nou-protejat",
  });
  assert.equal(rezultatNouProtejat.ok, true);
  assert.ok(rezultatNouProtejat.interzise.includes("js/protejat/nou.js"));
}

{
  const root = repoTemporar();
  const output = proceseazaPreToolUse({
    session_id: "hook-blocat",
    cwd: root,
    tool_name: "Edit",
    tool_input: { file_path: path.join(root, "js", "fix.js") },
  }, { rawProtectie: RAW_BAZA });

  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  assert.match(output.systemMessage, /NU AM MODIFICAT js\/fix\.js/);
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /In plan ai convenit sa nu modifici acest fisier/);
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /js\/fix\.js/);
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /continua cu alte subtaskuri/i);
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /nu transforma un blocaj local intr-un blocaj global/i);
}

{
  const root = repoTemporar();
  const output = proceseazaPreToolUse({
    session_id: "hook-permis",
    cwd: root,
    tool_name: "Write",
    tool_input: { file_path: path.join(root, "js", "liber.js") },
  }, { rawProtectie: RAW_BAZA });

  assert.equal(output.hookSpecificOutput, undefined);
  assert.match(output.systemMessage, /js\/liber\.js este permis/);
  assert.match(output.systemMessage, /functioneaza aici/);
}

{
  const root = repoTemporar();
  const invalid = `blocheazaEditareFisiereSiFoldere {\n  js/fix.js\n`;
  const output = proceseazaPreToolUse({
    session_id: "hook-config-invalid",
    cwd: root,
    tool_name: "Edit",
    tool_input: { file_path: path.join(root, "js", "liber.js") },
  }, { rawProtectie: invalid });

  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  assert.match(output.systemMessage, /Nu pot verifica sigur protectiile/);
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /nu ocoli protectia/i);
}

{
  const root = repoTemporar();
  const outside = path.join(path.dirname(root), "in-afara.js");
  const output = proceseazaPreToolUse({
    session_id: "hook-outside",
    cwd: root,
    tool_name: "Write",
    tool_input: { file_path: outside },
  }, { rawProtectie: RAW_BAZA });

  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  assert.match(output.systemMessage, /NU AM MODIFICAT/);
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /in afara repository-ului curent/i);
}

console.log("PRETOOLUSE PROTECTIE EDITARE TEST OK");
