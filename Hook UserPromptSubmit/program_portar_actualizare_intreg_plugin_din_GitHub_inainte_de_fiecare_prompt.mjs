#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FILE_PROTECTIE,
  FILE_REMINDERE,
  validateProtectie,
  validateRemindere,
} from "./config-validator.mjs";
import {
  parseazaDiffNameStatus,
  clasificaSchimbariPlugin,
} from "./motor_detectare_hooks_skills_si_componente_noi_la_actualizare.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const REMOTE = "origin";
const BRANCH = "main";
const REMOTE_REF = "refs/heads/main";
const SOURCE_DIR = "1 Sursa adevar";
const HANDLER_REL = "Hook UserPromptSubmit/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs";
const PORTAR_REL = "Hook UserPromptSubmit/program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs";
const STATUS_ENV = "YL_GARDURI_STATUS_ACTUALIZARE_PLUGIN";
const TIMEOUT_LS_REMOTE_MS = 3000;
const TIMEOUT_GIT_MS = 6000;
const TIMEOUT_HANDLER_MS = 30000;

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
  return (stderr || message).replace(/\s+/g, " ").slice(0, 500);
}

function git(args, timeout = TIMEOUT_GIT_MS) {
  return execFileSync("git", ["-C", ROOT, ...args], {
    encoding: "utf8",
    timeout,
    maxBuffer: 4 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function shaLocal() {
  try {
    return String(git(["rev-parse", "HEAD"])).trim();
  } catch {
    return null;
  }
}

function shaRemoteFaraFetch() {
  const raw = String(git(["ls-remote", REMOTE, REMOTE_REF], TIMEOUT_LS_REMOTE_MS)).trim();
  const prima = raw.split(/\s+/, 1)[0] || "";
  if (!/^[0-9a-f]{40}$/i.test(prima)) {
    throw new Error(`ls-remote nu a returnat SHA valid pentru ${REMOTE_REF}`);
  }
  return prima;
}

function citesteDinFetchHead(repoPath) {
  return String(git(["show", `FETCH_HEAD:${repoPath}`]));
}

function verificaPieseleCriticeRemote() {
  const lipsuri = [];
  for (const repoPath of [
    PORTAR_REL,
    HANDLER_REL,
    ".claude-plugin/plugin.json",
    "hooks/hooks.json",
  ]) {
    try {
      git(["cat-file", "-e", `FETCH_HEAD:${repoPath}`]);
    } catch {
      lipsuri.push(repoPath);
    }
  }
  if (lipsuri.length) {
    return { ok: false, mesaj: `lipsesc piese critice din versiunea remote: ${lipsuri.join(" ; ")}` };
  }

  try {
    JSON.parse(citesteDinFetchHead(".claude-plugin/plugin.json"));
    JSON.parse(citesteDinFetchHead("hooks/hooks.json"));
  } catch (error) {
    return { ok: false, mesaj: `JSON critic invalid in versiunea remote: ${eroareScurta(error)}` };
  }

  try {
    const protectie = citesteDinFetchHead(`${SOURCE_DIR}/${FILE_PROTECTIE}`);
    const remindere = citesteDinFetchHead(`${SOURCE_DIR}/${FILE_REMINDERE}`);
    const errors = [
      ...validateProtectie(protectie, FILE_PROTECTIE),
      ...validateRemindere(remindere, FILE_REMINDERE),
    ];
    if (errors.length) {
      const rezumat = errors.slice(0, 5).map((e) => `${e.file}:${e.line} ${e.message}`).join(" ; ");
      return { ok: false, mesaj: `sursa de adevar remote este invalida: ${rezumat}` };
    }
  } catch (error) {
    return { ok: false, mesaj: `nu pot valida sursa de adevar remote: ${eroareScurta(error)}` };
  }

  return { ok: true, mesaj: "piesele critice remote sunt valide" };
}

function statusBaza(status, localInainte, remoteCommit, mesaj) {
  return {
    status,
    localInainte,
    remoteCommit,
    localDupa: shaLocal(),
    mesaj,
    schimbari: [],
    categorii: {},
    componenteNoi: [],
    hookuriNoi: [],
    skilluriNoi: [],
    barzauniNoi: [],
    reloadNecesar: false,
    motiveReload: [],
  };
}

function actualizeazaPluginul() {
  const localInainte = shaLocal();
  let remoteCommit;

  try {
    remoteCommit = shaRemoteFaraFetch();
  } catch (error) {
    return statusBaza(
      "verificare_remote_esuat",
      localInainte,
      null,
      `nu am putut verifica SHA-ul GitHub; rulez ultima copie locala. ${eroareScurta(error)}`,
    );
  }

  if (localInainte && localInainte === remoteCommit) {
    return statusBaza(
      "deja_la_zi",
      localInainte,
      remoteCommit,
      "SHA local este identic cu GitHub main; nu am facut fetch.",
    );
  }

  try {
    git(["fetch", "--depth=1", REMOTE, BRANCH]);
  } catch (error) {
    return statusBaza(
      "fetch_esuat",
      localInainte,
      remoteCommit,
      `GitHub are alt SHA, dar fetch-ul a esuat; rulez ultima copie locala. ${eroareScurta(error)}`,
    );
  }

  let fetchHead;
  try {
    fetchHead = String(git(["rev-parse", "FETCH_HEAD"])).trim();
  } catch (error) {
    return statusBaza("fetch_esuat", localInainte, remoteCommit, `nu pot citi FETCH_HEAD. ${eroareScurta(error)}`);
  }

  const verificare = verificaPieseleCriticeRemote();
  if (!verificare.ok) {
    return statusBaza("remote_invalid", localInainte, fetchHead, `NU actualizez pluginul. ${verificare.mesaj}`);
  }

  let schimbari = [];
  try {
    const rawDiff = localInainte
      ? git(["diff", "--name-status", "--find-renames", localInainte, "FETCH_HEAD"])
      : "";
    schimbari = parseazaDiffNameStatus(rawDiff);
  } catch (error) {
    return statusBaza("comparare_esuat", localInainte, fetchHead, `nu pot compara versiunea locala cu GitHub. ${eroareScurta(error)}`);
  }

  const clasificare = clasificaSchimbariPlugin(schimbari, {
    skillsDirExistaInainte: existsSync(path.join(ROOT, "skills")),
  });

  try {
    git(["reset", "--hard", "FETCH_HEAD"]);
  } catch (error) {
    return {
      ...statusBaza("actualizare_esuat", localInainte, fetchHead, `reset-ul la versiunea GitHub a esuat. ${eroareScurta(error)}`),
      schimbari,
      ...clasificare,
    };
  }

  return {
    status: "actualizat",
    localInainte,
    remoteCommit: fetchHead,
    localDupa: fetchHead,
    mesaj: `pluginul local a fost actualizat la GitHub main; ${schimbari.length} schimbare/schimbari detectate.`,
    schimbari,
    ...clasificare,
  };
}

function ruleazaHandler(stdinText, statusActualizare) {
  const handlerPath = path.join(ROOT, HANDLER_REL);
  return execFileSync(process.execPath, [handlerPath], {
    input: stdinText,
    encoding: "utf8",
    timeout: TIMEOUT_HANDLER_MS,
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      [STATUS_ENV]: JSON.stringify(statusActualizare),
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

const stdinText = await citesteStdin();
const statusActualizare = actualizeazaPluginul();

try {
  const out = ruleazaHandler(stdinText, statusActualizare);
  process.stdout.write(out);
} catch (error) {
  const commit = statusActualizare.remoteCommit ? statusActualizare.remoteCommit.slice(0, 12) : "necunoscut";
  const notice = [
    "S-a inserat: necunoscut; handlerul de remindere nu a putut rula.",
    "VERIFICARE TEHNICA:",
    `actualizare plugin: ${statusActualizare.status}`,
    `commit GitHub verificat: ${commit}`,
    statusActualizare.mesaj,
    `EROARE HANDLER: ${eroareScurta(error)}`,
  ].join(" | ");
  console.log(JSON.stringify({ systemMessage: notice }));
}
