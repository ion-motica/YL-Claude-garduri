#!/usr/bin/env node
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

const stdinText = await citesteStdin();
const statusActualizare = actualizeazaPluginul({ root: ROOT });

try {
  const out = ruleazaProgramCiocanitoare(stdinText, statusActualizare, { root: ROOT });
  process.stdout.write(out);
} catch (errorNou) {
  if (statusActualizare.status === "actualizat" && statusActualizare.localInainte) {
    const rollback = revinoLaVersiuneaAnterioara(statusActualizare.localInainte, { root: ROOT });
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
        const outVechi = ruleazaProgramCiocanitoare(stdinText, statusRollback, { root: ROOT });
        process.stdout.write(outVechi);
        process.exit(0);
      } catch (errorVechi) {
        const notice = [
          "S-a inserat: necunoscut; nici versiunea revenita nu a putut rula programul de remindere.",
          "VERIFICARE TEHNICA:",
          "rezultat: actualizare_anulata_dupa_eroare",
          statusRollback.mesaj,
          `EROARE DUPA ROLLBACK: ${eroareScurta(errorVechi)}`,
        ].join(" | ");
        console.log(JSON.stringify({ systemMessage: notice }));
        process.exit(0);
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
