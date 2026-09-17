import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  asiguraListeEfectiveDeEditare,
  citesteListaGenerata,
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
  const now1 = new Date("2026-09-17T11:00:00Z");
  const rezultat1 = asiguraListeEfectiveDeEditare({
    cwd: root,
    rawProtectie: RAW_BAZA,
    sessionId: "liste-hash",
    now: now1,
  });
  assert.equal(rezultat1.ok, true);
  assert.equal(rezultat1.statusListe, "regenerate");
  assert.ok(existsSync(rezultat1.fisierPermise));
  assert.ok(existsSync(rezultat1.fisierInterzise));
  const continutPermise1 = readFileSync(rezultat1.fisierPermise, "utf8");
  const continutInterzise1 = readFileSync(rezultat1.fisierInterzise, "utf8");
  assert.match(continutPermise1, /^# HASH_SURSA: [0-9a-f]{64}$/m);
  assert.match(continutPermise1, /^# GENERAT_LA: 2026\.09\.17-14\.00 Europe\/Bucharest$/m);
  assert.deepEqual(citesteListaGenerata(rezultat1.fisierInterzise).sort(), ["js/fix.js", "js/protejat/a.js"].sort());

  const rezultat2 = asiguraListeEfectiveDeEditare({
    cwd: root,
    rawProtectie: RAW_BAZA,
    sessionId: "liste-hash",
    now: new Date("2026-09-17T11:05:00Z"),
  });
  assert.equal(rezultat2.ok, true);
  assert.equal(rezultat2.statusListe, "neschimbate");
  assert.equal(readFileSync(rezultat2.fisierPermise, "utf8"), continutPermise1);
  assert.equal(readFileSync(rezultat2.fisierInterzise, "utf8"), continutInterzise1);

  const rezultat3 = asiguraListeEfectiveDeEditare({
    cwd: root,
    rawProtectie: `${RAW_BAZA}\n// schimbare in sursa mama\n`,
    sessionId: "liste-hash",
    now: new Date("2026-09-17T11:06:00Z"),
  });
  assert.equal(rezultat3.ok, true);
  assert.equal(rezultat3.statusListe, "regenerate");
  assert.notEqual(rezultat3.hashSursa, rezultat1.hashSursa);
  assert.notEqual(readFileSync(rezultat3.fisierPermise, "utf8"), continutPermise1);
}

{
  const root = repoTemporar();
  const rawCuExceptieCareExpira = `
blocheazaEditareFisiereSiFoldere {
  js/fix.js
}
permiteEditarePanaLa(2026.09.17-15.00 Europe/Bucharest) {
  js/fix.js
}
`;
  const inainte = asiguraListeEfectiveDeEditare({
    cwd: root,
    rawProtectie: rawCuExceptieCareExpira,
    sessionId: "expirare-exceptie",
    now: new Date("2026-09-17T11:00:00Z"),
  });
  assert.equal(inainte.ok, true);
  assert.ok(inainte.permise.includes("js/fix.js"));

  const dupa = asiguraListeEfectiveDeEditare({
    cwd: root,
    rawProtectie: rawCuExceptieCareExpira,
    sessionId: "expirare-exceptie",
    now: new Date("2026-09-17T13:00:00Z"),
  });
  assert.equal(dupa.ok, true);
  assert.equal(dupa.statusListe, "regenerate");
  assert.equal(dupa.hashSursa, inainte.hashSursa);
  assert.notEqual(dupa.hashStare, inainte.hashStare);
  assert.ok(dupa.interzise.includes("js/fix.js"));
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
  assert.match(output.systemMessage, /a facut verificarea si a blocat modificarea js\/fix\.js/);
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
  assert.match(output.systemMessage, /a facut verificarea si a permis modificarea js\/liber\.js/);
}

{
  const root = repoTemporar();
  const outputNou = proceseazaPreToolUse({
    session_id: "hook-fisier-nou",
    cwd: root,
    tool_name: "Write",
    tool_input: { file_path: path.join(root, "js", "nou.js") },
  }, { rawProtectie: RAW_BAZA });
  assert.equal(outputNou.hookSpecificOutput, undefined);
  assert.match(outputNou.systemMessage, /a facut verificarea si a permis modificarea js\/nou\.js/);

  const outputNouProtejat = proceseazaPreToolUse({
    session_id: "hook-fisier-nou-protejat",
    cwd: root,
    tool_name: "Write",
    tool_input: { file_path: path.join(root, "js", "protejat", "nou.js") },
  }, { rawProtectie: RAW_BAZA });
  assert.equal(outputNouProtejat.hookSpecificOutput.permissionDecision, "deny");
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
  assert.match(output.systemMessage, /a facut verificarea si a blocat modificarea deoarece protectiile nu pot fi verificate/);
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
  assert.match(output.systemMessage, /a facut verificarea si a blocat modificarea deoarece tinta nu poate fi raportata sigur la repository/);
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /in afara repository-ului curent/i);
}

console.log("PRETOOLUSE PROTECTIE EDITARE + LISTE HASH + CCN SCURT TEST OK");
