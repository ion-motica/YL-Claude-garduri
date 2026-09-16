import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  FILE_PROTECTIE,
  FILE_REMINDERE,
  validateProtectie,
  validateRemindere,
} from "./config-validator.mjs";

const SOURCE_RELATIVE_DIR = "1 Sursa adevar";
const REMOTE_NAME = "origin";
const REMOTE_BRANCH = "main";
const FETCH_TIMEOUT_MS = 4000;

const FISIERE_SINCRONIZATE = [
  { file: FILE_PROTECTIE, validator: validateProtectie },
  { file: FILE_REMINDERE, validator: validateRemindere },
];

function mesajScurtEroare(error) {
  const stderr = error?.stderr ? String(error.stderr).trim() : "";
  const message = error?.message ? String(error.message).trim() : "eroare necunoscuta";
  return (stderr || message).replace(/\s+/g, " ").slice(0, 500);
}

function ruleazaGitImplicit(root, args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    timeout: FETCH_TIMEOUT_MS,
    maxBuffer: 2 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function citesteLocalSauGol(filePath) {
  if (!existsSync(filePath)) return { exista: false, continut: "" };
  return { exista: true, continut: readFileSync(filePath, "utf8") };
}

function curataTemporare(tempPaths) {
  for (const tempPath of tempPaths) {
    try {
      rmSync(tempPath, { force: true });
    } catch {
      // best effort
    }
  }
}

function restaureazaFisiereleSchimbate(schimbate) {
  for (const item of schimbate) {
    try {
      if (item.local.exista) {
        writeFileSync(item.destinatie, item.local.continut, "utf8");
      } else {
        rmSync(item.destinatie, { force: true });
      }
    } catch {
      // best effort; eroarea principala de scriere va fi raportata de apelant
    }
  }
}

export function sincronizeazaFisiereleSursaAdevarDinGitHub({
  root,
  ruleazaGit = (args) => ruleazaGitImplicit(root, args),
} = {}) {
  if (!root) {
    throw new Error("sincronizeazaFisiereleSursaAdevarDinGitHub necesita root");
  }

  try {
    ruleazaGit(["fetch", "--depth=1", REMOTE_NAME, REMOTE_BRANCH]);
  } catch (error) {
    return {
      status: "refresh_esuat",
      commit: null,
      fisiereSchimbate: [],
      errors: [],
      mesaj: `nu am putut verifica GitHub; folosesc ultima copie locala valida. ${mesajScurtEroare(error)}`,
    };
  }

  let commit = null;
  try {
    commit = String(ruleazaGit(["rev-parse", "FETCH_HEAD"])).trim();
  } catch {
    commit = null;
  }

  const remoteByFile = new Map();
  try {
    for (const spec of FISIERE_SINCRONIZATE) {
      const repoPath = `${SOURCE_RELATIVE_DIR}/${spec.file}`;
      const raw = String(ruleazaGit(["show", `FETCH_HEAD:${repoPath}`]));
      remoteByFile.set(spec.file, raw);
    }
  } catch (error) {
    return {
      status: "refresh_esuat",
      commit,
      fisiereSchimbate: [],
      errors: [],
      mesaj: `am gasit commitul remote, dar nu am putut citi toate fisierele sursa de adevar; folosesc ultima copie locala valida. ${mesajScurtEroare(error)}`,
    };
  }

  const remoteErrors = [];
  for (const spec of FISIERE_SINCRONIZATE) {
    const raw = remoteByFile.get(spec.file);
    remoteErrors.push(...spec.validator(raw, spec.file));
  }

  if (remoteErrors.length > 0) {
    return {
      status: "remote_invalid",
      commit,
      fisiereSchimbate: [],
      errors: remoteErrors,
      mesaj: "versiunea din GitHub are erori de sintaxa; NU am inlocuit copiile locale valide.",
    };
  }

  const sourceDir = path.join(root, SOURCE_RELATIVE_DIR);
  const schimbate = [];

  for (const spec of FISIERE_SINCRONIZATE) {
    const destinatie = path.join(sourceDir, spec.file);
    const local = citesteLocalSauGol(destinatie);
    const remote = remoteByFile.get(spec.file);
    if (!local.exista || local.continut !== remote) {
      schimbate.push({ file: spec.file, destinatie, local, remote });
    }
  }

  if (schimbate.length === 0) {
    return {
      status: "deja_la_zi",
      commit,
      fisiereSchimbate: [],
      errors: [],
      mesaj: "fisierele sursa de adevar sunt deja identice cu GitHub main.",
    };
  }

  const stamp = `${process.pid}-${Date.now()}`;
  const tempPaths = [];
  const dejaInlocuite = [];

  try {
    for (const item of schimbate) {
      const tempPath = `${item.destinatie}.yl-sync-${stamp}.tmp`;
      writeFileSync(tempPath, item.remote, "utf8");
      item.tempPath = tempPath;
      tempPaths.push(tempPath);
    }

    for (const item of schimbate) {
      renameSync(item.tempPath, item.destinatie);
      dejaInlocuite.push(item);
    }
  } catch (error) {
    restaureazaFisiereleSchimbate(dejaInlocuite);
    curataTemporare(tempPaths);
    return {
      status: "scriere_esuat",
      commit,
      fisiereSchimbate: [],
      errors: [],
      mesaj: `versiunea GitHub era valida, dar actualizarea locala a esuat; am pastrat/restaurat copiile locale anterioare. ${mesajScurtEroare(error)}`,
    };
  }

  curataTemporare(tempPaths);
  return {
    status: "actualizat",
    commit,
    fisiereSchimbate: schimbate.map((item) => item.file),
    errors: [],
    mesaj: `am actualizat ${schimbate.length} fisier/fisiere sursa de adevar din GitHub main.`,
  };
}

export function formatSincronizarePentruNotice(result) {
  const commitScurt = result.commit ? result.commit.slice(0, 12) : "necunoscut";
  const lines = [
    "SINCRONIZARE SURSA DE ADEVAR DIN GITHUB INAINTE DE PROMPT:",
    `rezultat: ${result.status}`,
    `commit GitHub verificat: ${commitScurt}`,
    result.mesaj,
  ];

  if (result.fisiereSchimbate?.length) {
    lines.push(`fisiere actualizate: ${result.fisiereSchimbate.join(" ; ")}`);
  }

  if (result.errors?.length) {
    for (const error of result.errors.slice(0, 10)) {
      lines.push(`${error.file}, linia ${error.line}: ${error.message}`);
    }
    if (result.errors.length > 10) {
      lines.push(`... si inca ${result.errors.length - 10} eroare/erori.`);
    }
  }

  return lines.join("\n");
}

export function formatSincronizareProblemaPentruContext(result) {
  if (!["refresh_esuat", "remote_invalid", "scriere_esuat"].includes(result.status)) {
    return "";
  }

  const lines = [
    "ANUNTA UTILIZATORUL CA:",
    `Sincronizarea fisierelor sursa de adevar din GitHub inainte de prompt are status ${result.status}.`,
    result.mesaj,
  ];

  if (result.errors?.length) {
    for (const error of result.errors.slice(0, 10)) {
      lines.push(`${error.file}, linia ${error.line}: ${error.message}`);
    }
  }

  lines.push("Nu ascunde problema si nu presupune continutul versiunii remote invalide sau inaccesibile.");
  return lines.join("\n");
}
