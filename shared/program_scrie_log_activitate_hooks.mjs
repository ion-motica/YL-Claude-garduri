import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const NUME_FISIER_LOG_ACTIVITATE_HOOKS = "log activitate hooks.txt";
export const REPOSITORY_LOG_ACTIVITATE_HOOKS =
  "ion-motica/YL-Claude-garduri-Log-hooks-scris-de-Claude";
export const URL_REPOSITORY_LOG_ACTIVITATE_HOOKS =
  `https://github.com/${REPOSITORY_LOG_ACTIVITATE_HOOKS}.git`;

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

export const CALE_LOG_ACTIVITATE_HOOKS = path.join(
  caleRepositoryLogLocal(),
  NUME_FISIER_LOG_ACTIVITATE_HOOKS,
);

const HEADER = `LOG ACTIVITATE HOOKS - YL-Claude-garduri

REGULA:
Fiecare hook trebuie sa inregistreze aici, cu randuri normale:
- ce a facut;
- textul exact trimis in CCN / systemMessage;
- textul exact trimis in additionalContext;
- permissionDecisionReason, cand exista;
- orice alt mesaj trimis lui Claude;
- alte activitati relevante facute de hook.

CCN ramane foarte scurt: "<nume folder hook in repo> a facut X."
Detaliile tehnice si de audit stau in acest log, nu in CCN.

Acest fisier este persistent in repository-ul separat:
${REPOSITORY_LOG_ACTIVITATE_HOOKS}

Toate hookurile folosesc acelasi helper comun de logging.
Helperul sincronizeaza fiecare intrare prin git commit + push.

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

function commitSiPushLog(localRepoPath, mesajCommit) {
  const stare = ruleazaGit([
    "-C", localRepoPath,
    "status", "--porcelain",
    "--", NUME_FISIER_LOG_ACTIVITATE_HOOKS,
  ]);

  if (!stare) return;

  ruleazaGit([
    "-C", localRepoPath,
    "add", "--",
    NUME_FISIER_LOG_ACTIVITATE_HOOKS,
  ]);

  ruleazaGit([
    "-C", localRepoPath,
    "-c", "user.name=YL-Claude-garduri logger",
    "-c", "user.email=yl-claude-garduri-logger@users.noreply.github.com",
    "commit",
    "-m", mesajCommit,
    "--", NUME_FISIER_LOG_ACTIVITATE_HOOKS,
  ]);

  try {
    ruleazaGit(["-C", localRepoPath, "push", "origin", "HEAD:main"]);
  } catch {
    ruleazaGit(["-C", localRepoPath, "pull", "--rebase", "origin", "main"]);
    ruleazaGit(["-C", localRepoPath, "push", "origin", "HEAD:main"]);
  }
}

function construiesteBlocLog({
  sessionId,
  hookEvent,
  folderHookRepo,
  activitate,
  ccn,
  additionalContext,
  permissionDecisionReason,
  alteMesajeCatreClaude,
  alteActivitati,
  now,
}) {
  return [
    "============================================================",
    `DATA_ORA: ${dataOraBucuresti(now)}`,
    `SESIUNE: ${sessionId}`,
    `HOOK_EVENT: ${hookEvent}`,
    `FOLDER_HOOK_REPO: ${folderHookRepo}`,
    `ACTIVITATE: ${activitate}`,
    "",
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
    "",
    "ALTE_ACTIVITATI_BEGIN",
    textSauNimic(alteActivitati),
    "ALTE_ACTIVITATI_END",
    "",
  ].join("\n");
}

function scrieBlocInFisier(caleEfectiva, bloc) {
  mkdirSync(path.dirname(caleEfectiva), { recursive: true });
  if (!existsSync(caleEfectiva)) {
    writeFileSync(caleEfectiva, HEADER, "utf8");
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
  permissionDecisionReason = "",
  alteMesajeCatreClaude = "",
  alteActivitati = "",
  now = new Date(),
  filePath = null,
  localRepoPath = null,
  remoteUrl = URL_REPOSITORY_LOG_ACTIVITATE_HOOKS,
} = {}) {
  const bloc = construiesteBlocLog({
    sessionId,
    hookEvent,
    folderHookRepo,
    activitate,
    ccn,
    additionalContext,
    permissionDecisionReason,
    alteMesajeCatreClaude,
    alteActivitati,
    now,
  });

  if (filePath) {
    scrieBlocInFisier(filePath, bloc);
    return filePath;
  }

  const rootLog = localRepoPath || caleRepositoryLogLocal(sessionId);
  asiguraRepositoryLogLocal({ localRepoPath: rootLog, remoteUrl });
  sincronizeazaInainteDeScriere(rootLog);

  const caleEfectiva = path.join(rootLog, NUME_FISIER_LOG_ACTIVITATE_HOOKS);
  scrieBlocInFisier(caleEfectiva, bloc);

  const stamp = dataOraBucuresti(now).replace(" Europe/Bucharest", "");
  commitSiPushLog(rootLog, `Log hook ${hookEvent} ${stamp}`);

  return caleEfectiva;
}
