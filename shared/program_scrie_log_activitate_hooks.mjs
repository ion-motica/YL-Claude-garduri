import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export const NUME_FISIER_LOG_ACTIVITATE_HOOKS = "log activitate hooks.txt";
export const NUME_FOLDER_LOG_ACTIVITATE_HOOKS = "1 Hook Tests";

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
in folderul "1 Hook Tests". Fisierul trebuie ignorat de Git,
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

  mkdirSync(path.dirname(caleEfectiva), { recursive: true });
  if (!existsSync(caleEfectiva)) {
    writeFileSync(caleEfectiva, HEADER, "utf8");
  }

  const bloc = [
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
