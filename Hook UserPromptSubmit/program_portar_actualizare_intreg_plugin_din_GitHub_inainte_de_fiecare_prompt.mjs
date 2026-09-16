#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
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
const ENTRY_REL = "Hook UserPromptSubmit/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs";
const WORKER_REL = "Hook UserPromptSubmit/program_ciocanitoare_dupa_actualizarea_gardurilor.mjs";
const PORTAR_REL = "Hook UserPromptSubmit/program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs";
const DETECTOR_REL = "Hook UserPromptSubmit/motor_detectare_hooks_skills_si_componente_noi_la_actualizare.mjs";
const VALIDATOR_REL = "Hook UserPromptSubmit/config-validator.mjs";
const MOTOR_REMINDERE_REL = "Hook UserPromptSubmit/motor_alegere_reminder_de_inserat.mjs";
const NOTICE_REL = "shared/claude-notice.mjs";
const STATUS_ENV = "YL_GARDURI_STATUS_ACTUALIZARE_PLUGIN";
const ORIGIN_ACCEPTAT = "https://github.com/ion-motica/YL-Claude-garduri.git";
const TIMEOUT_LS_REMOTE_MS = 3000;
const TIMEOUT_GIT_MS = 8000;
const TIMEOUT_WORKER_MS = 30000;

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

function git(args, timeout = TIMEOUT_GIT_MS, root = ROOT) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function shaLocal(root = ROOT) {
  try {
    return String(git(["rev-parse", "HEAD"], TIMEOUT_GIT_MS, root)).trim();
  } catch {
    return null;
  }
}

function statusWorktree(root = ROOT) {
  try {
    return String(git(["status", "--porcelain=v1"], TIMEOUT_GIT_MS, root))
      .split(/\r?\n/)
      .map((x) => x.trimEnd())
      .filter(Boolean);
  } catch (error) {
    throw new Error(`nu pot verifica modificarile locale: ${eroareScurta(error)}`);
  }
}

function verificaOrigin(root = ROOT) {
  const origin = String(git(["remote", "get-url", REMOTE], TIMEOUT_GIT_MS, root)).trim();
  if (origin !== ORIGIN_ACCEPTAT) {
    throw new Error(`origin neasteptat: ${origin || "(gol)"}; asteptat: ${ORIGIN_ACCEPTAT}`);
  }
  return origin;
}

function shaRemoteFaraFetch(root = ROOT) {
  const raw = String(git(["ls-remote", REMOTE, REMOTE_REF], TIMEOUT_LS_REMOTE_MS, root)).trim();
  const prima = raw.split(/\s+/, 1)[0] || "";
  if (!/^[0-9a-f]{40}$/i.test(prima)) {
    throw new Error(`ls-remote nu a returnat SHA valid pentru ${REMOTE_REF}`);
  }
  return prima;
}

function citesteDinCommit(repoPath, commit = "FETCH_HEAD", root = ROOT) {
  return String(git(["show", `${commit}:${repoPath}`], TIMEOUT_GIT_MS, root));
}

function existaInCommit(repoPath, commit = "FETCH_HEAD", root = ROOT) {
  const result = spawnSync("git", ["-C", root, "cat-file", "-e", `${commit}:${repoPath}`], {
    encoding: "utf8",
    timeout: TIMEOUT_GIT_MS,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0;
}

function esteStramos(localCommit, remoteCommit, root = ROOT) {
  const result = spawnSync("git", ["-C", root, "merge-base", "--is-ancestor", localCommit, remoteCommit], {
    encoding: "utf8",
    timeout: TIMEOUT_GIT_MS,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error(`nu pot verifica relatia dintre commituri: ${(result.stderr || "").trim()}`);
}

function verificaSintaxaMjsRemote(root = ROOT) {
  const lista = String(git(["ls-tree", "-r", "--name-only", "FETCH_HEAD"], TIMEOUT_GIT_MS, root))
    .split(/\r?\n/)
    .filter((x) => x.endsWith(".mjs") && !x.startsWith("tests/"));

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "yl-garduri-verificare-js-"));
  try {
    for (let i = 0; i < lista.length; i += 1) {
      const repoPath = lista[i];
      const tempPath = path.join(tempDir, `${String(i).padStart(3, "0")}-${path.basename(repoPath)}`);
      writeFileSync(tempPath, citesteDinCommit(repoPath, "FETCH_HEAD", root), "utf8");
      const check = spawnSync(process.execPath, ["--check", tempPath], {
        encoding: "utf8",
        timeout: TIMEOUT_GIT_MS,
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (check.status !== 0) {
        return {
          ok: false,
          mesaj: `sintaxa JS invalida in ${repoPath}: ${(check.stderr || check.stdout || "").replace(/\s+/g, " ").trim().slice(0, 500)}`,
        };
      }
    }
    return { ok: true, mesaj: `sintaxa JS verificata pentru ${lista.length} fisier/fisiere runtime .mjs` };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function verificaPieseleCriticeRemote(root = ROOT) {
  const critice = [
    ENTRY_REL,
    WORKER_REL,
    PORTAR_REL,
    DETECTOR_REL,
    VALIDATOR_REL,
    MOTOR_REMINDERE_REL,
    NOTICE_REL,
    ".claude-plugin/plugin.json",
    "hooks/hooks.json",
    `${SOURCE_DIR}/${FILE_PROTECTIE}`,
    `${SOURCE_DIR}/${FILE_REMINDERE}`,
  ];

  const lipsuri = critice.filter((repoPath) => !existaInCommit(repoPath, "FETCH_HEAD", root));
  if (lipsuri.length) {
    return { ok: false, mesaj: `lipsesc piese critice din versiunea remote: ${lipsuri.join(" ; ")}` };
  }

  let pluginJson;
  let hooksJson;
  try {
    pluginJson = JSON.parse(citesteDinCommit(".claude-plugin/plugin.json", "FETCH_HEAD", root));
    hooksJson = JSON.parse(citesteDinCommit("hooks/hooks.json", "FETCH_HEAD", root));
  } catch (error) {
    return { ok: false, mesaj: `JSON critic invalid in versiunea remote: ${eroareScurta(error)}` };
  }

  if (pluginJson?.name !== "yl-claude-garduri") {
    return { ok: false, mesaj: `plugin.json are nume neasteptat: ${pluginJson?.name ?? "(lipsa)"}` };
  }
  if (!hooksJson || typeof hooksJson !== "object" || Array.isArray(hooksJson) || !hooksJson.hooks || typeof hooksJson.hooks !== "object") {
    return { ok: false, mesaj: "hooks/hooks.json nu are obiectul hooks valid" };
  }

  const hooksText = JSON.stringify(hooksJson);
  if (!hooksText.includes("handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs")) {
    return {
      ok: false,
      mesaj: "hooks/hooks.json nu mai pastreaza calea-stabila handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs pentru UserPromptSubmit",
    };
  }

  try {
    const protectie = citesteDinCommit(`${SOURCE_DIR}/${FILE_PROTECTIE}`, "FETCH_HEAD", root);
    const remindere = citesteDinCommit(`${SOURCE_DIR}/${FILE_REMINDERE}`, "FETCH_HEAD", root);
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

  const js = verificaSintaxaMjsRemote(root);
  if (!js.ok) return js;

  return { ok: true, mesaj: `piesele critice remote sunt valide; ${js.mesaj}` };
}

function statusBaza(status, localInainte, remoteCommit, mesaj, extra = {}, root = ROOT) {
  return {
    status,
    localInainte,
    remoteCommit,
    localDupa: shaLocal(root),
    mesaj,
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
    ...extra,
  };
}

function mesajCuSesiuneNoua(mesaj, clasificare) {
  if (!clasificare?.sesiuneNouaNecesara) return mesaj;
  const motive = Array.isArray(clasificare.motiveSesiuneNoua) ? clasificare.motiveSesiuneNoua.join(" ; ") : "componenta de plugin";
  return `${mesaj} SESIUNE/CHAT NOU NECESAR in Claude Code Web pentru activarea sigura a: ${motive}.`;
}

export function actualizeazaPluginul({ root = ROOT } = {}) {
  const localInainte = shaLocal(root);

  try {
    verificaOrigin(root);
  } catch (error) {
    return statusBaza("origin_neasteptat", localInainte, null, `NU actualizez. ${eroareScurta(error)}`, {}, root);
  }

  let localDirty;
  try {
    localDirty = statusWorktree(root);
  } catch (error) {
    return statusBaza("verificare_locala_esuat", localInainte, null, `NU actualizez. ${eroareScurta(error)}`, {}, root);
  }

  if (localDirty.length > 0) {
    return statusBaza(
      "modificari_locale_detectate",
      localInainte,
      null,
      "NU fac reset automat: copia runtime are modificari locale necomise/neincluse in GitHub. Pastrez totul si cer curatarea explicita a copiei runtime.",
      { modificariLocale: localDirty.slice(0, 30) },
      root,
    );
  }

  let remoteCommit;
  try {
    remoteCommit = shaRemoteFaraFetch(root);
  } catch (error) {
    return statusBaza(
      "verificare_remote_esuat",
      localInainte,
      null,
      `nu am putut verifica SHA-ul GitHub; rulez ultima copie locala. ${eroareScurta(error)}`,
      {},
      root,
    );
  }

  if (localInainte && localInainte === remoteCommit) {
    return statusBaza(
      "deja_la_zi",
      localInainte,
      remoteCommit,
      "SHA local este identic cu GitHub main si copia runtime este curata; nu am facut fetch.",
      {},
      root,
    );
  }

  try {
    git(["fetch", "--depth=50", REMOTE, BRANCH], TIMEOUT_GIT_MS, root);
  } catch (error) {
    return statusBaza(
      "fetch_esuat",
      localInainte,
      remoteCommit,
      `GitHub are alt SHA, dar fetch-ul a esuat; rulez ultima copie locala. ${eroareScurta(error)}`,
      {},
      root,
    );
  }

  let fetchHead;
  try {
    fetchHead = String(git(["rev-parse", "FETCH_HEAD"], TIMEOUT_GIT_MS, root)).trim();
  } catch (error) {
    return statusBaza("fetch_esuat", localInainte, remoteCommit, `nu pot citi FETCH_HEAD. ${eroareScurta(error)}`, {}, root);
  }

  const verificare = verificaPieseleCriticeRemote(root);
  if (!verificare.ok) {
    return statusBaza("remote_invalid", localInainte, fetchHead, `NU actualizez pluginul. ${verificare.mesaj}`, {}, root);
  }

  if (localInainte) {
    try {
      if (!esteStramos(localInainte, fetchHead, root)) {
        return statusBaza(
          "istoric_local_neasteptat",
          localInainte,
          fetchHead,
          "NU fac reset automat: commitul local nu apare ca stramos al GitHub main. Asta poate insemna un commit local separat sau un force-push; necesita decizie explicita.",
          {},
          root,
        );
      }
    } catch (error) {
      return statusBaza("verificare_istoric_esuat", localInainte, fetchHead, `NU actualizez. ${eroareScurta(error)}`, {}, root);
    }
  }

  let schimbari = [];
  try {
    const rawDiff = localInainte
      ? git(["diff", "--name-status", "--find-renames", localInainte, "FETCH_HEAD"], TIMEOUT_GIT_MS, root)
      : "";
    schimbari = parseazaDiffNameStatus(rawDiff);
  } catch (error) {
    return statusBaza("comparare_esuat", localInainte, fetchHead, `nu pot compara versiunea locala cu GitHub. ${eroareScurta(error)}`, {}, root);
  }

  const clasificare = clasificaSchimbariPlugin(schimbari, {
    skillsDirExistaInainte: existsSync(path.join(root, "skills")),
  });

  try {
    git(["reset", "--hard", "FETCH_HEAD"], TIMEOUT_GIT_MS, root);
  } catch (error) {
    return {
      ...statusBaza("actualizare_esuat", localInainte, fetchHead, `reset-ul la versiunea GitHub a esuat. ${eroareScurta(error)}`, {}, root),
      schimbari,
      ...clasificare,
      reloadNecesar: false,
      motiveReload: [],
    };
  }

  const mesaj = mesajCuSesiuneNoua(
    `pluginul local a fost actualizat la GitHub main; ${schimbari.length} schimbare/schimbari detectate.`,
    clasificare,
  );

  return {
    status: "actualizat",
    localInainte,
    remoteCommit: fetchHead,
    localDupa: fetchHead,
    mesaj,
    schimbari,
    ...clasificare,
    reloadNecesar: false,
    motiveReload: [],
  };
}

export function ruleazaProgramCiocanitoare(stdinText, statusActualizare, { root = ROOT } = {}) {
  const workerPath = path.join(root, WORKER_REL);
  return execFileSync(process.execPath, [workerPath], {
    input: stdinText,
    encoding: "utf8",
    timeout: TIMEOUT_WORKER_MS,
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      [STATUS_ENV]: JSON.stringify(statusActualizare),
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export function revinoLaVersiuneaAnterioara(localInainte, { root = ROOT } = {}) {
  if (!localInainte || !/^[0-9a-f]{40}$/i.test(localInainte)) {
    return { ok: false, mesaj: "nu exista un commit local anterior valid pentru revenire" };
  }
  try {
    const dirty = statusWorktree(root);
    if (dirty.length > 0) {
      return { ok: false, mesaj: `nu fac rollback peste modificari locale: ${dirty.slice(0, 10).join(" ; ")}` };
    }
    git(["reset", "--hard", localInainte], TIMEOUT_GIT_MS, root);
    return { ok: true, mesaj: `revenit la ${localInainte.slice(0, 12)}` };
  } catch (error) {
    return { ok: false, mesaj: eroareScurta(error) };
  }
}

export async function ruleazaPortarulCaProgramDirect() {
  const stdinText = await citesteStdin();
  const statusActualizare = actualizeazaPluginul();

  try {
    const out = ruleazaProgramCiocanitoare(stdinText, statusActualizare);
    process.stdout.write(out);
  } catch (error) {
    const commit = statusActualizare.remoteCommit ? statusActualizare.remoteCommit.slice(0, 12) : "necunoscut";
    const notice = [
      "S-a inserat: necunoscut; programul de remindere nu a putut rula.",
      "VERIFICARE TEHNICA:",
      `actualizare plugin: ${statusActualizare.status}`,
      `commit GitHub verificat: ${commit}`,
      statusActualizare.mesaj,
      `EROARE PROGRAM: ${eroareScurta(error)}`,
    ].join(" | ");
    console.log(JSON.stringify({ systemMessage: notice }));
  }
}

const esteRulatDirect = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (esteRulatDirect) {
  await ruleazaPortarulCaProgramDirect();
}
