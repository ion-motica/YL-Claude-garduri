import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
const LOG_SCHEMA_VERSION = "4";

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

Fiecare inregistrare porneste de la un prompt exact scris de utilizator.
Antetul cu data/ora, titlul chatului si promptul apare o singura data.
Toate gardurile declansate de acel prompt sunt listate separat, in ordinea activarii.

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

function doarmeSincron(milisecunde) {
  const semafor = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(semafor, 0, 0, milisecunde);
}

function caleStareSesiune(sessionId = "fara-sesiune") {
  return path.join(
    os.tmpdir(),
    "yl-claude-garduri",
    "stare-sesiuni",
    `${idSigur(sessionId)}.json`,
  );
}

function citesteStareSesiune(sessionId) {
  const cale = caleStareSesiune(sessionId);
  if (!existsSync(cale)) return {};
  try {
    return JSON.parse(readFileSync(cale, "utf8"));
  } catch {
    return {};
  }
}

function scrieStareSesiune(sessionId, stare) {
  const cale = caleStareSesiune(sessionId);
  mkdirSync(path.dirname(cale), { recursive: true });
  const temporar = `${cale}.${process.pid}.tmp`;
  writeFileSync(temporar, `${JSON.stringify(stare, null, 2)}\n`, "utf8");
  renameSync(temporar, cale);
}

export function memoreazaTitluSesiune({ sessionId, sessionTitle } = {}) {
  const titlu = typeof sessionTitle === "string" ? sessionTitle.trim() : "";
  if (!titlu) return false;
  const stare = citesteStareSesiune(sessionId);
  scrieStareSesiune(sessionId, { ...stare, chatTitle: titlu });
  return true;
}

function memoreazaPromptCurent({ sessionId, promptId, promptText, chatTitle, dataOra }) {
  const stare = citesteStareSesiune(sessionId);
  scrieStareSesiune(sessionId, {
    ...stare,
    chatTitle: chatTitle || stare.chatTitle || "",
    promptCurent: {
      promptId: String(promptId || ""),
      promptText: String(promptText || ""),
      dataOra: String(dataOra || ""),
    },
  });
}

function datePromptCurentMemorat({ sessionId, promptId }) {
  const stare = citesteStareSesiune(sessionId);
  const promptCurent = stare?.promptCurent || null;
  const idPrimit = String(promptId || "");
  if (!promptCurent || !idPrimit || promptCurent.promptId !== idPrimit) {
    return { potrivire: false, chatTitle: stare?.chatTitle || "", promptCurent };
  }
  return { potrivire: true, chatTitle: stare?.chatTitle || "", promptCurent };
}

function continutMesajCaText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => {
    if (typeof part === "string") return part;
    if (part && typeof part.text === "string") return part.text;
    if (part && typeof part.content === "string") return part.content;
    return "";
  }).filter(Boolean).join("\n");
}

function citesteTranscriptJsonl(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return [];
  try {
    return readFileSync(transcriptPath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((linie) => {
        try { return JSON.parse(linie); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function citesteTitluChatDinTranscript(transcriptPath) {
  const records = citesteTranscriptJsonl(transcriptPath);
  let titlu = "";
  for (const record of records) {
    if (record?.type === "custom-title" && typeof record.customTitle === "string" && record.customTitle.trim()) {
      titlu = record.customTitle.trim();
    } else if (record?.type === "ai-title" && typeof record.aiTitle === "string" && record.aiTitle.trim()) {
      titlu = record.aiTitle.trim();
    }
  }
  return titlu;
}

export function citesteUltimulPromptUserDinTranscript(transcriptPath) {
  const records = citesteTranscriptJsonl(transcriptPath);
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const record = records[i];
    if (record?.role === "user") {
      const text = continutMesajCaText(record.content);
      if (text.trim()) return text.trim();
    }
    if (record?.message?.role === "user") {
      const text = continutMesajCaText(record.message.content);
      if (text.trim()) return text.trim();
    }
    if (record?.type === "user") {
      const text = continutMesajCaText(record.message?.content ?? record.content);
      if (text.trim()) return text.trim();
    }
  }
  return "";
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

function normalizeazaGarduriHuman(humanGarduri, fallback) {
  if (Array.isArray(humanGarduri) && humanGarduri.length > 0) {
    return humanGarduri.map((gard) => ({
      folder: textSauNimic(gard?.folder),
      actiuni: Array.isArray(gard?.actiuni) && gard.actiuni.length
        ? gard.actiuni.map((x) => String(x))
        : ["Nu a detectat nimic de facut."],
    }));
  }
  return [{
    folder: textSauNimic(fallback.folderHookRepo),
    actiuni: [textSauNimic(fallback.activitate)],
  }];
}

function construiesteSectiuniGarduriHuman({
  humanGarduri,
  folderHookRepo,
  activitate,
}) {
  const garduri = normalizeazaGarduriHuman(humanGarduri, { folderHookRepo, activitate });
  const linii = [];
  for (const gard of garduri) {
    linii.push("", "++++++++++++++++", gard.folder);
    for (const actiune of gard.actiuni) {
      linii.push(actiune);
    }
  }
  linii.push("");
  return linii.join("\n");
}

function construiesteBlocHumanPromptNou({
  chatTitle,
  promptText,
  humanGarduri,
  folderHookRepo,
  activitate,
  now,
}) {
  const linii = [
    "=======================================",
    `DATA_ORA: ${dataOraBucuresti(now)}`,
    `TITLU_CHAT: ${chatTitle || "(titlul nu este furnizat hookurilor de Claude Code)"}`,
    "PROMPT_SCRIS_DE_USER_BEGIN",
    promptText || "(prompt indisponibil)",
    "PROMPT_SCRIS_DE_USER_END",
  ];
  return `${linii.join("\n")}\n${construiesteSectiuniGarduriHuman({
    humanGarduri,
    folderHookRepo,
    activitate,
  })}`;
}

function construiesteBlocTehnic({
  sessionId,
  promptId,
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
  transcriptPath,
  chatTitle,
  promptText,
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
    `PROMPT_ID: ${textSauNimic(promptId)}`,
    `HOOK_EVENT: ${hookEvent}`,
    `FOLDER_GARD_REPO: ${folderHookRepo}`,
    `ACTIVITATE: ${activitate}`,
    `TITLU_CHAT: ${chatTitle || "(indisponibil)"}`,
    "USER_PROMPT_BEGIN",
    textSauNimic(promptText),
    "USER_PROMPT_END",
    `TRANSCRIPT_PATH: ${textSauNimic(transcriptPath)}`,
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

function ruleazaCuBlocareLogger(rootLog, operatie, { timeoutMs = 15000 } = {}) {
  const caleLock = `${rootLog}.lock`;
  mkdirSync(path.dirname(caleLock), { recursive: true });
  const inceput = Date.now();
  while (true) {
    try {
      mkdirSync(caleLock);
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if (Date.now() - inceput >= timeoutMs) {
        throw new Error(`logger ocupat mai mult de ${timeoutMs} ms: ${caleLock}`);
      }
      doarmeSincron(50);
    }
  }

  try {
    return operatie();
  } finally {
    rmSync(caleLock, { recursive: true, force: true });
  }
}

export function scrieLogActivitateHook({
  sessionId = "necunoscuta",
  promptId = "",
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
  transcriptPath = "",
  promptText = "",
  chatTitle = "",
  humanGarduri = null,
  now = new Date(),
  localRepoPath = null,
  remoteUrl = URL_REPOSITORY_LOG_ACTIVITATE_HOOKS,
} = {}) {
  const rootLog = localRepoPath || caleRepositoryLogLocal(sessionId);
  return ruleazaCuBlocareLogger(rootLog, () => {
    asiguraRepositoryLogLocal({ localRepoPath: rootLog, remoteUrl });
    sincronizeazaInainteDeScriere(rootLog);

    const stareInitiala = citesteStareSesiune(sessionId);
    const titluDinTranscript = citesteTitluChatDinTranscript(transcriptPath);
    const estePromptNou = hookEvent === "UserPromptSubmit";
    let titluEfectiv = chatTitle || titluDinTranscript || stareInitiala.chatTitle;
    let promptEfectiv = promptText;
    let blocHuman;

    if (estePromptNou) {
      promptEfectiv = promptText || "";
      memoreazaPromptCurent({
        sessionId,
        promptId,
        promptText: promptEfectiv,
        chatTitle: titluEfectiv,
        dataOra: dataOraBucuresti(now),
      });
      blocHuman = construiesteBlocHumanPromptNou({
        chatTitle: titluEfectiv,
        promptText: promptEfectiv,
        humanGarduri,
        folderHookRepo,
        activitate,
        now,
      });
    } else {
      const memorat = datePromptCurentMemorat({ sessionId, promptId });
      if (memorat.potrivire) {
        promptEfectiv = memorat.promptCurent.promptText;
        titluEfectiv = memorat.chatTitle || titluEfectiv;
        blocHuman = construiesteSectiuniGarduriHuman({
          humanGarduri,
          folderHookRepo,
          activitate,
        });
      } else {
        promptEfectiv = "";
        blocHuman = construiesteBlocHumanPromptNou({
          chatTitle: titluEfectiv,
          promptText: "(promptul exact nu a putut fi corelat prin prompt_id)",
          humanGarduri,
          folderHookRepo,
          activitate,
          now,
        });
      }
    }

    const blocTehnic = construiesteBlocTehnic({
      sessionId,
      promptId,
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
      transcriptPath,
      chatTitle: titluEfectiv,
      promptText: promptEfectiv,
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
  });
}
