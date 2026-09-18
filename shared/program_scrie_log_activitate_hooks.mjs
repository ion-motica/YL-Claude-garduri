import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const NUME_FISIER_LOG_ACTIVITATE_HOOKS = "log activitate hooks.txt";
export const NUME_FOLDER_LOG_ACTIVITATE_HOOKS = "1 Hook Tests";
export const REGULA_IGNORE_LOG_ACTIVITATE_HOOKS =
  `${NUME_FOLDER_LOG_ACTIVITATE_HOOKS}/${NUME_FISIER_LOG_ACTIVITATE_HOOKS}`;

export function caleLogActivitateHooksDinRepository(repositoryRoot = process.cwd()) {
  const root = typeof repositoryRoot === "string" && repositoryRoot.trim()
    ? path.resolve(repositoryRoot)
    : process.cwd();

  return path.join(
    root,
    NUME_FOLDER_LOG_ACTIVITATE_HOOKS,
    NUME_FISIER_LOG_ACTIVITATE_HOOKS,
  );
}

export const CALE_LOG_ACTIVITATE_HOOKS = caleLogActivitateHooksDinRepository();

export function asiguraIgnorareLocalaGit(
  repositoryRoot = process.cwd(),
  regula = REGULA_IGNORE_LOG_ACTIVITATE_HOOKS,
) {
  const root = typeof repositoryRoot === "string" && repositoryRoot.trim()
    ? path.resolve(repositoryRoot)
    : process.cwd();

  try {
    const gitPathRaw = execFileSync(
      "git",
      ["-C", root, "rev-parse", "--git-path", "info/exclude"],
      { encoding: "utf8" },
    ).trim();

    if (!gitPathRaw) {
      return { ok: false, eroare: "git nu a returnat calea info/exclude" };
    }

    const excludePath = path.isAbsolute(gitPathRaw)
      ? gitPathRaw
      : path.resolve(root, gitPathRaw);

    mkdirSync(path.dirname(excludePath), { recursive: true });

    const existent = existsSync(excludePath)
      ? readFileSync(excludePath, "utf8")
      : "";

    const reguli = existent
      .split(/\r?\n/)
      .map((linie) => linie.trim())
      .filter(Boolean);

    if (!reguli.includes(regula)) {
      const prefix = existent.length > 0 && !existent.endsWith("\n") ? "\n" : "";
      appendFileSync(excludePath, `${prefix}${regula}\n`, "utf8");
    }

    return { ok: true, excludePath, regula };
  } catch (error) {
    return { ok: false, eroare: error?.message || String(error) };
  }
}

const HEADER = `LOG ACTIVITATE HOOKS - YL-Claude-garduri

REGULA:
Fiecare hook trebuie sa inregistreze aici, cu randuri normale:
- ce a facut;
- textul exact trimis in CCN / systemMessage;
- textul exact trimis in additionalContext;
- orice alt mesaj trimis lui Claude, de exemplu permissionDecisionReason;
- alte activitati relevante facute de hook.

CCN ramane foarte scurt: "<nume folder hook in repo> a facut X."
Detaliile tehnice si de audit stau in acest log, nu in CCN.

Acest fisier este runtime si este tinut in repository-ul de lucru,
in folderul "1 Hook Tests". Helperul incearca sa adauge automat
"1 Hook Tests/log activitate hooks.txt" in .git/info/exclude,
ca logarea sa nu murdareasca working tree-ul si sa nu intre in commituri.

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

export function scrieLogActivitateHook({
  sessionId = "necunoscuta",
  hookEvent = "necunoscut",
  folderHookRepo = "necunoscut",
  activitate = "necunoscuta",
  ccn = "",
  additionalContext = "",
  alteMesajeCatreClaude = "",
  alteActivitati = "",
  now = new Date(),
  repositoryRoot = process.cwd(),
  filePath = null,
} = {}) {
  const caleEfectiva = filePath || caleLogActivitateHooksDinRepository(repositoryRoot);
  const rezultatIgnorareGit = filePath
    ? null
    : asiguraIgnorareLocalaGit(repositoryRoot);

  mkdirSync(path.dirname(caleEfectiva), { recursive: true });
  if (!existsSync(caleEfectiva)) {
    writeFileSync(caleEfectiva, HEADER, "utf8");
  }

  const stareIgnorareGit = rezultatIgnorareGit
    ? (rezultatIgnorareGit.ok
      ? `OK: ${rezultatIgnorareGit.regula} in ${rezultatIgnorareGit.excludePath}`
      : `EROARE: ${rezultatIgnorareGit.eroare}`)
    : "(nu se aplica: filePath explicit)";

  const bloc = [
    "============================================================",
    `DATA_ORA: ${dataOraBucuresti(now)}`,
    `SESIUNE: ${sessionId}`,
    `HOOK_EVENT: ${hookEvent}`,
    `FOLDER_HOOK_REPO: ${folderHookRepo}`,
    `ACTIVITATE: ${activitate}`,
    `GIT_LOCAL_EXCLUDE: ${stareIgnorareGit}`,
    "",
    "CCN_BEGIN",
    textSauNimic(ccn),
    "CCN_END",
    "",
    "ADDITIONAL_CONTEXT_BEGIN",
    textSauNimic(additionalContext),
    "ADDITIONAL_CONTEXT_END",
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

  appendFileSync(caleEfectiva, `${bloc}\n`, "utf8");
  return caleEfectiva;
}
