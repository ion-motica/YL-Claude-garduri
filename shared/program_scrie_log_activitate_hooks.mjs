import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const NUME_FISIER_LOG_HUMAN_READABLE = "log human readable.txt";
export const NUME_FISIER_LOG_TEHNIC = "log tehnic.txt";
export const REPOSITORY_LOG_ACTIVITATE_HOOKS =
  "ion-motica/YL-Claude-garduri-Log-hooks-scris-de-Claude";
export const URL_REPOSITORY_LOG_ACTIVITATE_HOOKS =
  `https://github.com/${REPOSITORY_LOG_ACTIVITATE_HOOKS}.git`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_PLUGIN = path.resolve(__dirname, "..");
const LOG_SCHEMA_VERSION = "2";

function idSigur(value) {
  return String(value || "fara-sesiune").replace(/[^A-Za-z0-9._-]/g, "_");
}

export function caleRepositoryLogLocal(sessionId = "fara-sesiune") {
  return path.join(
    os.tmpdir(),
    "yl-claude-garduri",
    "repo-log-hooks",
    idSigur(sessionId),
  );
}

// Compatibilitate pentru mesajele de eroare din hookuri.
export const CALE_LOG_ACTIVITATE_HOOKS = path.join(
  caleRepositoryLogLocal(),
  NUME_FISIER_LOG_TEHNIC,
);

const HEADER_HUMAN = `LOG HUMAN READABLE - YL-Claude-garduri

Scop: jurnal scurt si usor de citit despre ce a facut fiecare gard.
Un gard = hook Claude Code + programul nostru declansat de acel hook.

Pentru diagnostic complet vezi "log tehnic.txt".

`;

const HEADER_TEHNIC = `LOG TEHNIC - YL-Claude-garduri

Scop: diagnostic complet pentru toate gardurile.
Fiecare intrare are:
1. SECTIUNE_COMUNA - aceleasi campuri pentru toate gardurile;
2. CANALE_CATRE_CLAUDE - textele exacte trimise lui Claude;
3. DETALII_SPECIFICE_GARDULUI - date suplimentare furnizate de gardul concret.

Schema log tehnic: v${LOG_SCHEMA_VERSION}
Repository persistent: ${REPOSITORY_LOG_ACTIVITATE_HOOKS}

`;

function dataOraBucuresti(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}.${parts.month}.${parts.day}-${parts.hour}.${parts.minute}.${parts.second} Europe/Bucharest`;
}

function textSauNimic(value) {
  const text = value == null ? "" : String(value);
  return text.length ? text : "(nimic)";
}

function ruleazaGit(args, { cwd = null } = {}) {
  return execFileSync("git", args, {
    cwd: cwd || undefined,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitSauNecunoscut(args, cwd = null) {
  try {
    const out = ruleazaGit(args, { cwd });
    return out || "(gol)";
  } catch {
    return "(necunoscut)";
  }
}

function esteRepositoryGit(root) {
  try {
    return ruleazaGit(["-C", root, "rev-parse", "--is-inside-work-tree"]) === "true";
  } catch {
    return false;
  }
}

export function asiguraRepositoryLogLocal({
  localRepoPath,
  remoteUrl = URL_REPOSITORY_LOG_ACTIVITATE_HOOKS,
} = {}) {
  if (!localRepoPath) throw new Error("lipseste localRepoPath pentru repository-ul de log");

  if (existsSync(localRepoPath)) {
    if (!esteRepositoryGit(localRepoPath)) {
      throw new Error(`calea de log exista dar nu este repository Git: ${localRepoPath}`);
    }
    return localRepoPath;
  }

  mkdirSync(path.dirname(localRepoPath), { recursive: true });
  ruleazaGit([
    "clone",
    "--branch", "main",
    "--single-branch",
    remoteUrl,
    localRepoPath,
  ]);
  return localRepoPath;
}

function sincronizeazaInainteDeScriere(localRepoPath) {
  ruleazaGit(["-C", localRepoPath, "pull", "--rebase", "origin", "main"]);
}

function commitSiPushLoguri(localRepoPath, mesajCommit) {
  const fisiere = [
    NUME_FISIER_LOG_HUMAN_READABLE,
    NUME_FISIER_LOG_TEHNIC,
  ];

  const stare = ruleazaGit([
    "-C", localRepoPath,
    "status", "--porcelain",
    "--", ...fisiere,
  ]);

  if (!stare) return;

  ruleazaGit([
    "-C", localRepoPath,
    "add", "--",
    ...fisiere,
  ]);

  ruleazaGit([
    "-C", localRepoPath,
    "-c", "user.name=YL-Claude-garduri logger",
    "-c", "user.email=yl-claude-garduri-logger@users.noreply.github.com",
    "commit",
    "-m", mesajCommit,
    "--", ...fisiere,
  ]);

  try {
    ruleazaGit(["-C", localRepoPath, "push", "origin", "HEAD:main"]);
  } catch {
    ruleazaGit(["-C", localRepoPath, "pull", "--rebase", "origin", "main"]);
    ruleazaGit(["-C", localRepoPath, "push", "origin", "HEAD:main"]);
  }
}

function construiesteBlocHuman({
  sessionId,
  hookEvent,
  folderHookRepo,
  activitate,
  ccn,
  additionalContext,
  permissionDecision,
  now,
}) {
  const linii = [
    "============================================================",
    `DATA_ORA: ${dataOraBucuresti(now)}`,
    `GARD: ${folderHookRepo}`,
    `HOOK: ${hookEvent}`,
    `A_FACUT: ${activitate}`,
  ];

  if (permissionDecision) {
    linii.push(`DECIZIE: ${permissionDecision}`);
  }

  if (ccn) {
    linii.push(`CCN: ${ccn}`);
  }

  if (additionalContext) {
    linii.push(
      "",
      "CE_A_TRIMIS_LUI_CLAUDE:",
      additionalContext,
    );
  }

  linii.push(`SESIUNE: ${sessionId}`, "");
  return linii.join("\n");
}

function construiesteBlocTehnic({
  sessionId,
  hookEvent,
  folderHookRepo,
  activitate,
  ccn,
  additionalContext,
  permissionDecision,
  permissionDecisionReason,
  alteMesajeCatreClaude,
  alteActivitati,
  repositoryRoot,
  toolName,
  targetPath,
  rootLog,
  remoteUrl,
  now,
}) {
  const pluginCommit = gitSauNecunoscut(["-C", ROOT_PLUGIN, "rev-parse", "HEAD"]);
  const logRepoCommitInainte = gitSauNecunoscut(["-C", rootLog, "rev-parse", "HEAD"]);

  return [
    "============================================================",
    "SECTIUNE_COMUNA_BEGIN",
    `LOG_SCHEMA_VERSION: ${LOG_SCHEMA_VERSION}`,
    `DATA_ORA: ${dataOraBucuresti(now)}`,
    `SESIUNE: ${sessionId}`,
    `HOOK_EVENT: ${hookEvent}`,
    `FOLDER_GARD_REPO: ${folderHookRepo}`,
    `ACTIVITATE: ${activitate}`,
    `PERMISSION_DECISION: ${textSauNimic(permissionDecision)}`,
    `TOOL_NAME: ${textSauNimic(toolName)}`,
    `TARGET_PATH: ${textSauNimic(targetPath)}`,
    `REPOSITORY_ROOT_PRIMIT: ${textSauNimic(repositoryRoot)}`,
    `PROCESS_CWD: ${process.cwd()}`,
    `PLUGIN_RUNTIME_ROOT: ${ROOT_PLUGIN}`,
    `PLUGIN_RUNTIME_COMMIT: ${pluginCommit}`,
    `NODE_VERSION: ${process.version}`,
    `PLATFORM_ARCH: ${process.platform}/${process.arch}`,
    `LOG_REPOSITORY_REMOTE: ${remoteUrl}`,
    `LOG_REPOSITORY_LOCAL: ${rootLog}`,
    `LOG_REPOSITORY_COMMIT_INAINTE_DE_INTRARE: ${logRepoCommitInainte}`,
    "SECTIUNE_COMUNA_END",
    "",
    "CANALE_CATRE_CLAUDE_BEGIN",
    "CCN_BEGIN",
    textSauNimic(ccn),
    "CCN_END",
    "",
    "ADDITIONAL_CONTEXT_BEGIN",
    textSauNimic(additionalContext),
    "ADDITIONAL_CONTEXT_END",
    "",
    "PERMISSION_DECISION_REASON_BEGIN",
    textSauNimic(permissionDecisionReason),
    "PERMISSION_DECISION_REASON_END",
    "",
    "ALTE_MESAJE_CATRE_CLAUDE_BEGIN",
    textSauNimic(alteMesajeCatreClaude),
    "ALTE_MESAJE_CATRE_CLAUDE_END",
    "CANALE_CATRE_CLAUDE_END",
    "",
    "DETALII_SPECIFICE_GARDULUI_BEGIN",
    textSauNimic(alteActivitati),
    "DETALII_SPECIFICE_GARDULUI_END",
    "",
  ].join("\n");
}

function scrieBlocInFisier(caleEfectiva, header, bloc) {
  mkdirSync(path.dirname(caleEfectiva), { recursive: true });
  if (!existsSync(caleEfectiva)) {
    writeFileSync(caleEfectiva, header, "utf8");
  }
  appendFileSync(caleEfectiva, `${bloc}\n`, "utf8");
}

export function scrieLogActivitateHook({
  sessionId = "necunoscuta",
  hookEvent = "necunoscut",
  folderHookRepo = "necunoscut",
  activitate = "necunoscuta",
  ccn = "",
  additionalContext = "",
  permissionDecision = "",
  permissionDecisionReason = "",
  alteMesajeCatreClaude = "",
  alteActivitati = "",
  repositoryRoot = "",
  toolName = "",
  targetPath = "",
  now = new Date(),
  localRepoPath = null,
  remoteUrl = URL_REPOSITORY_LOG_ACTIVITATE_HOOKS,
} = {}) {
  const rootLog = localRepoPath || caleRepositoryLogLocal(sessionId);
  asiguraRepositoryLogLocal({ localRepoPath: rootLog, remoteUrl });
  sincronizeazaInainteDeScriere(rootLog);

  const blocHuman = construiesteBlocHuman({
    sessionId,
    hookEvent,
    folderHookRepo,
    activitate,
    ccn,
    additionalContext,
    permissionDecision,
    now,
  });

  const blocTehnic = construiesteBlocTehnic({
    sessionId,
    hookEvent,
    folderHookRepo,
    activitate,
    ccn,
    additionalContext,
    permissionDecision,
    permissionDecisionReason,
    alteMesajeCatreClaude,
    alteActivitati,
    repositoryRoot,
    toolName,
    targetPath,
    rootLog,
    remoteUrl,
    now,
  });

  const caleHuman = path.join(rootLog, NUME_FISIER_LOG_HUMAN_READABLE);
  const caleTehnic = path.join(rootLog, NUME_FISIER_LOG_TEHNIC);

  scrieBlocInFisier(caleHuman, HEADER_HUMAN, blocHuman);
  scrieBlocInFisier(caleTehnic, HEADER_TEHNIC, blocTehnic);

  const stamp = dataOraBucuresti(now).replace(" Europe/Bucharest", "");
  commitSiPushLoguri(rootLog, `Log hook ${hookEvent} ${stamp}`);

  return {
    humanReadable: caleHuman,
    tehnic: caleTehnic,
  };
}
