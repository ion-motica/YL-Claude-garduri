#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  actualizeazaPluginul,
  ruleazaProgramCiocanitoare,
  revinoLaVersiuneaAnterioara,
} from "./program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const REMOTE = "origin";
const REF_MAIN = "refs/heads/main";
const REF_CI_PASSED = "refs/heads/ci-passed";
const TIMEOUT_CI_MS = 4000;

function citesteStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolve(""));
  });
}

function eroareScurta(error) {
  const stderr = error?.stderr ? String(error.stderr).trim() : "";
  const message = error?.message ? String(error.message).trim() : "eroare necunoscuta";
  return (stderr || message).replace(/\s+/g, " ").slice(0, 600);
}

function shaLocal(root = ROOT) {
  try {
    return String(execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8",
      timeout: TIMEOUT_CI_MS,
      stdio: ["ignore", "pipe", "pipe"],
    })).trim();
  } catch {
    return null;
  }
}

export function interpreteazaRefsCiPass(raw) {
  const refs = new Map();
  for (const linie of String(raw || "").split(/\r?\n/)) {
    const m = linie.trim().match(/^([0-9a-f]{40})\s+(refs\/heads\/[^\s]+)$/i);
    if (m) refs.set(m[2], m[1].toLowerCase());
  }

  const mainCommit = refs.get(REF_MAIN) || null;
  const ciPassedCommit = refs.get(REF_CI_PASSED) || null;
  if (!mainCommit || !ciPassedCommit) {
    return {
      ok: false,
      status: "ci_verificare_esuat",
      mainCommit,
      ciPassedCommit,
      mesaj: `NU actualizez: nu pot confirma ambele repere GitHub ${REF_MAIN} si ${REF_CI_PASSED}.`,
    };
  }

  if (mainCommit !== ciPassedCommit) {
    return {
      ok: false,
      status: "ci_main_neaprobat",
      mainCommit,
      ciPassedCommit,
      mesaj: `NU actualizez: GitHub main ${mainCommit.slice(0, 12)} nu este inca reperul CI PASS ${ciPassedCommit.slice(0, 12)}. Testele pot fi in curs sau pot avea FAIL; pastrez ultima copie locala si verific din nou la promptul urmator.`,
    };
  }

  return {
    ok: true,
    status: "ci_pass_confirmat",
    mainCommit,
    ciPassedCommit,
    mesaj: `CI PASS confirmat pentru GitHub main ${mainCommit.slice(0, 12)} prin refs/heads/ci-passed.`,
  };
}

export function verificaCiPassPentruMain({ root = ROOT } = {}) {
  try {
    const raw = String(execFileSync("git", ["-C", root, "ls-remote", REMOTE, REF_MAIN, REF_CI_PASSED], {
      encoding: "utf8",
      timeout: TIMEOUT_CI_MS,
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }));
    return interpreteazaRefsCiPass(raw);
  } catch (error) {
    return {
      ok: false,
      status: "ci_verificare_esuat",
      mainCommit: null,
      ciPassedCommit: null,
      mesaj: `NU actualizez: nu am putut verifica reperul CI PASS din GitHub. ${eroareScurta(error)}`,
    };
  }
}

function statusDinBlocajCI(verificareCI, { root = ROOT } = {}) {
  const local = shaLocal(root);
  const localEsteMainNeaprobat = Boolean(local && verificareCI.mainCommit && local === verificareCI.mainCommit && !verificareCI.ok);
  const avertizare = localEsteMainNeaprobat
    ? " ATENTIE: copia runtime locala este deja pe commitul main care nu este confirmat CI PASS; nu fac alta modificare automata."
    : "";

  return {
    status: localEsteMainNeaprobat ? "ci_runtime_local_neaprobat" : verificareCI.status,
    localInainte: local,
    remoteCommit: verificareCI.mainCommit,
    localDupa: local,
    mesaj: `${verificareCI.mesaj}${avertizare}`,
    schimbari: [],
    categorii: {},
    componenteNoi: [],
    hookuriNoi: [],
    skilluriNoi: [],
    barzauniNoi: [],
    sesiuneNouaNecesara: false,
    motiveSesiuneNoua: [],
    reloadNecesar: false,
    motiveReload: [],
    ciPassedCommit: verificareCI.ciPassedCommit,
  };
}

export async function ruleazaHandlerUserPromptSubmit({ root = ROOT } = {}) {
  const stdinText = await citesteStdin();
  const verificareCI = verificaCiPassPentruMain({ root });
  const statusActualizare = verificareCI.ok
    ? actualizeazaPluginul({ root })
    : statusDinBlocajCI(verificareCI, { root });

  try {
    const out = ruleazaProgramCiocanitoare(stdinText, statusActualizare, { root });
    process.stdout.write(out);
  } catch (errorNou) {
    if (statusActualizare.status === "actualizat" && statusActualizare.localInainte) {
      const rollback = revinoLaVersiuneaAnterioara(statusActualizare.localInainte, { root });
      if (rollback.ok) {
        const statusRollback = {
          ...statusActualizare,
          status: "actualizare_anulata_dupa_eroare",
          remoteCommit: statusActualizare.remoteCommit,
          localDupa: statusActualizare.localInainte,
          mesaj: `Versiunea noua s-a instalat, dar programul de remindere a esuat. ${rollback.mesaj}. Rulez din nou ultima versiune locala functionala. Eroare versiune noua: ${eroareScurta(errorNou)}`,
          reloadNecesar: false,
          motiveReload: [],
        };
        try {
          const outVechi = ruleazaProgramCiocanitoare(stdinText, statusRollback, { root });
          process.stdout.write(outVechi);
          return;
        } catch (errorVechi) {
          const notice = [
            "S-a inserat: necunoscut; nici versiunea revenita nu a putut rula programul de remindere.",
            "VERIFICARE TEHNICA:",
            "rezultat: actualizare_anulata_dupa_eroare",
            statusRollback.mesaj,
            `EROARE DUPA ROLLBACK: ${eroareScurta(errorVechi)}`,
          ].join(" | ");
          console.log(JSON.stringify({ systemMessage: notice }));
          return;
        }
      }
    }

    const commit = statusActualizare.remoteCommit ? String(statusActualizare.remoteCommit).slice(0, 12) : "necunoscut";
    const notice = [
      "S-a inserat: necunoscut; programul de remindere nu a putut rula.",
      "VERIFICARE TEHNICA:",
      `actualizare plugin: ${statusActualizare.status}`,
      `commit GitHub verificat: ${commit}`,
      statusActualizare.mesaj || "",
      `EROARE PROGRAM: ${eroareScurta(errorNou)}`,
    ].filter(Boolean).join(" | ");
    console.log(JSON.stringify({ systemMessage: notice }));
  }
}

const esteRulatDirect = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (esteRulatDirect) {
  await ruleazaHandlerUserPromptSubmit();
}
