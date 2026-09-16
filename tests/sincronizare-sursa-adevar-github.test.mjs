import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  sincronizeazaFisiereleSursaAdevarDinGitHub,
} from "../Hook UserPromptSubmit/program_sincronizare_fisiere_sursa_adevar_din_GitHub_inainte_de_fiecare_prompt.mjs";
import {
  FILE_PROTECTIE,
  FILE_REMINDERE,
} from "../Hook UserPromptSubmit/config-validator.mjs";

const root = mkdtempSync(path.join(os.tmpdir(), "yl-garduri-sync-test-"));
const sourceDir = path.join(root, "1 Sursa adevar");
mkdirSync(sourceDir, { recursive: true });

const protectieLocala = `blocheazaEditareFisiereSiFoldere {\n  js/vechi.js\n}\n`;
const remindereLocale = `dacaGaseste(vechi)\natunciIncludeInPrompt {{regula veche}}\n`;
const protectieRemote = `blocheazaEditareFisiereSiFoldere {\n  js/nou.js\n}\n`;
const remindereRemote = `dacaGaseste(buton | apasare)\natunciIncludeInPrompt {{regula noua}}\n`;

writeFileSync(path.join(sourceDir, FILE_PROTECTIE), protectieLocala, "utf8");
writeFileSync(path.join(sourceDir, FILE_REMINDERE), remindereLocale, "utf8");

function gitMockCuRemoteValid(args) {
  if (args[0] === "fetch") return "";
  if (args[0] === "rev-parse") return "1234567890abcdef\n";
  if (args[0] === "show") {
    const spec = args[1];
    if (spec.endsWith(`1 Sursa adevar/${FILE_PROTECTIE}`)) return protectieRemote;
    if (spec.endsWith(`1 Sursa adevar/${FILE_REMINDERE}`)) return remindereRemote;
  }
  throw new Error(`comanda git neasteptata: ${args.join(" ")}`);
}

try {
  const actualizat = sincronizeazaFisiereleSursaAdevarDinGitHub({
    root,
    ruleazaGit: gitMockCuRemoteValid,
  });
  assert.equal(actualizat.status, "actualizat");
  assert.equal(actualizat.commit, "1234567890abcdef");
  assert.deepEqual(actualizat.fisiereSchimbate.sort(), [FILE_PROTECTIE, FILE_REMINDERE].sort());
  assert.equal(readFileSync(path.join(sourceDir, FILE_PROTECTIE), "utf8"), protectieRemote);
  assert.equal(readFileSync(path.join(sourceDir, FILE_REMINDERE), "utf8"), remindereRemote);

  const dejaLaZi = sincronizeazaFisiereleSursaAdevarDinGitHub({
    root,
    ruleazaGit: gitMockCuRemoteValid,
  });
  assert.equal(dejaLaZi.status, "deja_la_zi");
  assert.deepEqual(dejaLaZi.fisiereSchimbate, []);

  const remindereInvalide = `${remindereRemote}\n}}\n`;
  function gitMockCuRemoteInvalid(args) {
    if (args[0] === "fetch") return "";
    if (args[0] === "rev-parse") return "fedcba0987654321\n";
    if (args[0] === "show") {
      const spec = args[1];
      if (spec.endsWith(`1 Sursa adevar/${FILE_PROTECTIE}`)) return protectieRemote;
      if (spec.endsWith(`1 Sursa adevar/${FILE_REMINDERE}`)) return remindereInvalide;
    }
    throw new Error(`comanda git neasteptata: ${args.join(" ")}`);
  }

  const invalid = sincronizeazaFisiereleSursaAdevarDinGitHub({
    root,
    ruleazaGit: gitMockCuRemoteInvalid,
  });
  assert.equal(invalid.status, "remote_invalid");
  assert.ok(invalid.errors.length > 0);
  assert.equal(readFileSync(path.join(sourceDir, FILE_REMINDERE), "utf8"), remindereRemote);

  const refreshEsuat = sincronizeazaFisiereleSursaAdevarDinGitHub({
    root,
    ruleazaGit(args) {
      if (args[0] === "fetch") throw new Error("network indisponibil");
      throw new Error("nu trebuia apelat");
    },
  });
  assert.equal(refreshEsuat.status, "refresh_esuat");
  assert.equal(readFileSync(path.join(sourceDir, FILE_REMINDERE), "utf8"), remindereRemote);

  console.log("SINCRONIZARE SURSA ADEVAR GITHUB TEST OK");
} finally {
  rmSync(root, { recursive: true, force: true });
}
