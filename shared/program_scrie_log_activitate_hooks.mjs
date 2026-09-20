import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
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
  "ion-motica/yl";
export const URL_REPOSITORY_LOG_ACTIVITATE_HOOKS =
  `https://github.com/${REPOSITORY_LOG_ACTIVITATE_HOOKS}.git`;
export const RAMURA_LOG_ACTIVITATE_HOOKS = "loguri-hooks";
export const ZILE_PASTRARE_LOGURI = 30;

const NUMAR_MAXIM_INCERCARI_PUSH = 3;

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

function creeazaCaleRepositoryLogTemporar(sessionId) {
  const baza = caleRepositoryLogLocal(sessionId);
  mkdirSync(path.dirname(baza), { recursive: true });
  return path.join(mkdtempSync(`${baza}-`), "repository");
}

const NUME_FISIER_DIAGNOSTIC_FALLBACK = "erori jurnalizare hooks.txt";

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

function textPeUnRand(value, limita = 800) {
  const text = String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "(indisponibil)";
  return text.length > limita ? `${text.slice(0, limita)}...` : text;
}

function mascheazaSecrete(value) {
  return String(value ?? "")
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, "$1[credentiale-mascate]@")
    .replace(/\bgithub_pat_[A-Za-z0-9_]+\b/g, "[token-mascat]")
    .replace(/\bgh[pousr]_[A-Za-z0-9_]+\b/g, "[token-mascat]")
    .replace(/\bAuthorization:\s*[^\r\n]+/gi, "Authorization: [credentiale-mascate]")
    .replace(/\bBearer\s+[^\s]+/gi, "Bearer [credentiale-mascate]");
}

class EroareEtapaJurnalizare extends Error {
  constructor(etapa, cauza, detalii = {}) {
    super(cauza?.message || String(cauza || "eroare necunoscuta"), { cause: cauza });
    this.name = "EroareEtapaJurnalizare";
    this.etapaJurnalizare = etapa;
    this.detaliiJurnalizare = detalii;
    this.code = cauza?.code;
    this.status = cauza?.status;
    this.stderr = cauza?.stderr;
  }
}

function ruleazaEtapaJurnalizare(etapa, operatie, detalii = {}) {
  try {
    return operatie();
  } catch (error) {
    if (error instanceof EroareEtapaJurnalizare) throw error;
    throw new EroareEtapaJurnalizare(etapa, error, detalii);
  }
}

function extrageDiagnosticEroareJurnalizare(error) {
  const cauza = error?.cause || error || {};
  const stderr = cauza?.stderr ?? error?.stderr;
  const cod = cauza?.status ?? cauza?.code ?? error?.status ?? error?.code ?? "necunoscut";
  const textEroare = `${cauza?.message || error?.message || ""}\n${stderr || ""}`;
  const repositoryNeautorizatInSesiune =
    /access denied by the git proxy/i.test(textEroare)
    && /not in this session['’]s authorized repository set/i.test(textEroare);
  return {
    etapa: error?.etapaJurnalizare || "ETAPA_NECUNOSCUTA",
    cod: textPeUnRand(cod, 100),
    mesaj: textPeUnRand(mascheazaSecrete(cauza?.message || error?.message), 800),
    stderr: stderr ? textPeUnRand(mascheazaSecrete(stderr), 800) : "(indisponibil)",
    repositoryLocal: textPeUnRand(
      mascheazaSecrete(error?.detaliiJurnalizare?.repositoryLocal),
      500,
    ),
    repositoryRemote: textPeUnRand(
      mascheazaSecrete(error?.detaliiJurnalizare?.repositoryRemote),
      500,
    ),
    loguriScriseLocal: error?.detaliiJurnalizare?.loguriScriseLocal === true ? "da" : "nu/necunoscut",
    remediere: repositoryNeautorizatInSesiune
      ? `Asigura-te ca repository-ul principal ${REPOSITORY_LOG_ACTIVITATE_HOOKS} este in sursele autorizate ale sesiunii Claude Code, cu acces push; apoi retrimite un prompt pentru retestare.`
      : "(nedeterminata automat; consulta mesajul si stderr)",
  };
}

function caleDiagnosticFallback(sessionId = "fara-sesiune") {
  return path.join(
    os.tmpdir(),
    "yl-claude-garduri",
    "erori-jurnalizare",
    idSigur(sessionId),
    NUME_FISIER_DIAGNOSTIC_FALLBACK,
  );
}

export function construiesteRaportEroareJurnalizare({
  error,
  sessionId = "fara-sesiune",
  folderHookRepo = "hook necunoscut",
  now = new Date(),
} = {}) {
  const diagnostic = extrageDiagnosticEroareJurnalizare(error);
  const caleFallback = caleDiagnosticFallback(sessionId);
  let rezultatFallback;

  const blocFallback = [
    "============================================================",
    `DATA_ORA: ${dataOraBucuresti(now)}`,
    `SESIUNE: ${textPeUnRand(sessionId, 300)}`,
    `FOLDER_GARD_REPO: ${textPeUnRand(folderHookRepo, 500)}`,
    `ETAPA: ${diagnostic.etapa}`,
    `COD: ${diagnostic.cod}`,
    `MESAJ: ${diagnostic.mesaj}`,
    `STDERR: ${diagnostic.stderr}`,
    `REPOSITORY_LOG_LOCAL: ${diagnostic.repositoryLocal}`,
    `REPOSITORY_LOG_REMOTE: ${diagnostic.repositoryRemote}`,
    `LOGURI_SCRISE_LOCAL: ${diagnostic.loguriScriseLocal}`,
    `REMEDIERE: ${diagnostic.remediere}`,
    "",
  ].join("\n");

  try {
    mkdirSync(path.dirname(caleFallback), { recursive: true });
    appendFileSync(caleFallback, `${blocFallback}\n`, "utf8");
    rezultatFallback = caleFallback;
  } catch (fallbackError) {
    rezultatFallback = `NESALVAT (${textPeUnRand(mascheazaSecrete(fallbackError?.message), 300)})`;
  }

  const diagnosticComun = [
    "JURNALIZARE ESUATA",
    `etapa=${diagnostic.etapa}`,
    `cod=${diagnostic.cod}`,
    `mesaj=${diagnostic.mesaj}`,
    `stderr=${diagnostic.stderr}`,
    `repository_local=${diagnostic.repositoryLocal}`,
    `repository_remote=${diagnostic.repositoryRemote}`,
    `loguri_scrise_local=${diagnostic.loguriScriseLocal}`,
    `remediere=${diagnostic.remediere}`,
    `diagnostic_fallback=${textPeUnRand(rezultatFallback, 500)}`,
  ].join("; ");

  return {
    diagnosticComun,
    ccn: `${folderHookRepo} a detectat: ${diagnosticComun}.`,
    additionalContext: [
      "ANUNTA OBLIGATORIU UTILIZATORUL CA:",
      "La SFARSITUL raspunsului tau curent, afiseaza un bloc distinct cu titlul exact:",
      "⚠️ JURNALIZAREA HOOKURILOR A ESUAT",
      "Sub titlu, reda integral diagnosticul urmator.",
      "Nu il omite chiar daca restul sarcinii a reusit. Nu pretinde ca jurnalizarea persistenta a reusit.",
      diagnosticComun,
    ].join("\n"),
    caleFallback: rezultatFallback,
  };
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
  if (stare.chatTitleDeclaratDeUser) return false;
  scrieStareSesiune(sessionId, {
    ...stare,
    chatTitle: titlu,
    chatTitleSource: "session_start",
  });
  return true;
}

export function extrageTitluChatDeclarat(promptText) {
  const text = typeof promptText === "string" ? promptText : "";
  for (const linie of text.split(/\r?\n/)) {
    const potrivire = linie.match(/^\s*TITLU_CHAT\s*:\s*(.*?)\s*$/i);
    if (potrivire?.[1]) return potrivire[1].trim();
  }
  return "";
}

export function memoreazaTitluChatDeclaratDeUser({ sessionId, promptText } = {}) {
  const stare = citesteStareSesiune(sessionId);
  if (stare.chatTitleDeclaratDeUser) {
    return {
      titlu: stare.chatTitle || "",
      acceptatAcum: false,
      motiv: "titlul fusese deja declarat de utilizator pentru aceasta sesiune",
    };
  }

  const titlu = extrageTitluChatDeclarat(promptText);
  if (!titlu) {
    return {
      titlu: stare.chatTitle || "",
      acceptatAcum: false,
      motiv: "promptul nu contine o declaratie TITLU_CHAT",
    };
  }

  scrieStareSesiune(sessionId, {
    ...stare,
    chatTitle: titlu,
    chatTitleSource: "user_prompt",
    chatTitleDeclaratDeUser: true,
  });
  return {
    titlu,
    acceptatAcum: true,
    motiv: "prima declaratie TITLU_CHAT a fost memorata pentru aceasta sesiune",
  };
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
    env: process.env,
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

function verificaRemoteRepositoryLog(localRepoPath, remoteUrlAsteptat) {
  const remoteUrlEfectiv = ruleazaGit([
    "-C", localRepoPath,
    "remote", "get-url", "origin",
  ]);
  if (remoteUrlEfectiv !== remoteUrlAsteptat) {
    const error = new Error(
      `REPOSITORY_LOG_REMOTE_NEASTEPTAT: asteptat=${remoteUrlAsteptat}; efectiv=${remoteUrlEfectiv}`,
    );
    error.code = "REPOSITORY_LOG_REMOTE_NEASTEPTAT";
    throw error;
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
    verificaRemoteRepositoryLog(localRepoPath, remoteUrl);
    return localRepoPath;
  }

  mkdirSync(path.dirname(localRepoPath), { recursive: true });
  ruleazaGit([
    "clone",
    "--branch", RAMURA_LOG_ACTIVITATE_HOOKS,
    "--single-branch",
    remoteUrl,
    localRepoPath,
  ]);
  verificaRemoteRepositoryLog(localRepoPath, remoteUrl);
  return localRepoPath;
}

function sincronizeazaInainteDeScriere(localRepoPath, remoteUrl) {
  verificaRemoteRepositoryLog(localRepoPath, remoteUrl);
  ruleazaGit([
    "-C", localRepoPath,
    "fetch", "origin",
    `${RAMURA_LOG_ACTIVITATE_HOOKS}:refs/remotes/origin/${RAMURA_LOG_ACTIVITATE_HOOKS}`,
  ]);
  ruleazaGit([
    "-C", localRepoPath,
    "reset", "--hard",
    `origin/${RAMURA_LOG_ACTIVITATE_HOOKS}`,
  ]);
}

function extrageDataOraDinBloc(bloc) {
  return bloc.match(/^DATA_ORA: (\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}\.\d{2}) Europe\/Bucharest$/m)?.[1] || "";
}

function filtreazaBlocuriMaiNoiDecat({ continut, header, separator, now }) {
  const corp = continut.startsWith(header) ? continut.slice(header.length) : continut;
  const blocuri = corp
    .split(new RegExp(`(?=^${separator}$)`, "m"))
    .filter((bloc) => bloc.trim());
  const limita = dataOraBucuresti(
    new Date(now.getTime() - ZILE_PASTRARE_LOGURI * 24 * 60 * 60 * 1000),
  ).replace(" Europe/Bucharest", "");
  return blocuri.filter((bloc) => {
    const dataOra = extrageDataOraDinBloc(bloc);
    return !dataOra || dataOra >= limita;
  });
}

function rescrieLogCuRetentie({ cale, header, separator, blocNou, now }) {
  const continut = existsSync(cale) ? readFileSync(cale, "utf8") : header;
  const blocuriPastrate = filtreazaBlocuriMaiNoiDecat({
    continut,
    header,
    separator,
    now,
  });
  if (!blocuriPastrate.includes(blocNou)) blocuriPastrate.push(blocNou);
  const corp = blocuriPastrate.length ? `${blocuriPastrate.join("\n").trimEnd()}\n` : "";
  writeFileSync(cale, `${header}${corp}`, "utf8");
}

function verificaRamuraContineNumaiCeleDouaLoguri(localRepoPath) {
  const fisiere = [
    NUME_FISIER_LOG_HUMAN_READABLE,
    NUME_FISIER_LOG_TEHNIC,
  ];
  const urmarite = ruleazaGit(["-C", localRepoPath, "ls-files"])
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  const asteptate = [...fisiere].sort();
  if (JSON.stringify(urmarite) !== JSON.stringify(asteptate)) {
    const error = new Error(
      `RAMURA_LOG_CONTINE_FISIERE_NEASTEPTATE: asteptat=${asteptate.join(",")}; efectiv=${urmarite.join(",")}`,
    );
    error.code = "RAMURA_LOG_CONTINE_FISIERE_NEASTEPTATE";
    throw error;
  }
}

function scrieCommitSnapshotSiPushCuReincercari({
  localRepoPath,
  remoteUrl,
  mesajCommit,
  blocHuman,
  blocTehnic,
  now,
}) {
  const fisiere = [NUME_FISIER_LOG_HUMAN_READABLE, NUME_FISIER_LOG_TEHNIC];

  const detalii = {
    repositoryLocal: localRepoPath,
    repositoryRemote: remoteUrl,
    loguriScriseLocal: false,
  };

  for (let incercare = 1; incercare <= NUMAR_MAXIM_INCERCARI_PUSH; incercare += 1) {
    if (incercare > 1) {
      verificaRemoteRepositoryLog(localRepoPath, remoteUrl);
      ruleazaEtapaJurnalizare(`RESINCRONIZARE_DUPA_PUSH_RESPINS_${incercare}`, () =>
        sincronizeazaInainteDeScriere(localRepoPath, remoteUrl), detalii);
    }

    verificaRamuraContineNumaiCeleDouaLoguri(localRepoPath);
    const caleHuman = path.join(localRepoPath, NUME_FISIER_LOG_HUMAN_READABLE);
    const caleTehnic = path.join(localRepoPath, NUME_FISIER_LOG_TEHNIC);
    ruleazaEtapaJurnalizare("SCRIERE_LOG_HUMAN_READABLE", () =>
      rescrieLogCuRetentie({
        cale: caleHuman,
        header: HEADER_HUMAN,
        separator: "=======================================",
        blocNou: blocHuman,
        now,
      }), detalii);
    ruleazaEtapaJurnalizare("SCRIERE_LOG_TEHNIC", () =>
      rescrieLogCuRetentie({
        cale: caleTehnic,
        header: HEADER_TEHNIC,
        separator: "============================================================",
        blocNou: blocTehnic,
        now,
      }), detalii);
    detalii.loguriScriseLocal = true;

    ruleazaEtapaJurnalizare("GIT_ADD_LOGURI", () => ruleazaGit([
      "-C", localRepoPath, "add", "--", ...fisiere,
    ]), detalii);

    const commitAsteptat = ruleazaEtapaJurnalizare("CITIRE_COMMIT_REMOTE_ASTEPTAT", () =>
      ruleazaGit(["-C", localRepoPath, "rev-parse", `origin/${RAMURA_LOG_ACTIVITATE_HOOKS}`]),
    detalii);
    const arbore = ruleazaEtapaJurnalizare("GIT_WRITE_TREE_LOGURI", () =>
      ruleazaGit(["-C", localRepoPath, "write-tree"]), detalii);
    const commitNou = ruleazaEtapaJurnalizare("GIT_COMMIT_SNAPSHOT_LOGURI", () =>
      ruleazaGit([
        "-C", localRepoPath,
        "-c", "user.name=YL-Claude-garduri logger",
        "-c", "user.email=yl-claude-garduri-logger@users.noreply.github.com",
        "commit-tree", arbore,
        "-m", mesajCommit,
      ]), detalii);

    try {
      verificaRemoteRepositoryLog(localRepoPath, remoteUrl);
      ruleazaGit([
        "-C", localRepoPath,
        "push",
        `--force-with-lease=refs/heads/${RAMURA_LOG_ACTIVITATE_HOOKS}:${commitAsteptat}`,
        "origin",
        `${commitNou}:refs/heads/${RAMURA_LOG_ACTIVITATE_HOOKS}`,
      ]);
      ruleazaGit(["-C", localRepoPath, "reset", "--hard", commitNou]);
      return;
    } catch (error) {
      if (incercare === NUMAR_MAXIM_INCERCARI_PUSH) {
        throw new EroareEtapaJurnalizare(
          `GIT_PUSH_INCERCARE_${incercare}`,
          error,
          detalii,
        );
      }
    }
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

function ruleazaCuBlocareLogger(rootLog, operatie, { timeoutMs = 15000 } = {}) {
  const caleLock = path.join(
    os.tmpdir(),
    "yl-claude-garduri",
    "blocare-logger-yl-loguri-hooks",
  );
  ruleazaEtapaJurnalizare("PREGATIRE_DIRECTOR_LOCK_LOGGER", () =>
    mkdirSync(path.dirname(caleLock), { recursive: true }), {
    repositoryLocal: rootLog,
    loguriScriseLocal: false,
  });
  const inceput = Date.now();
  while (true) {
    try {
      mkdirSync(caleLock);
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw new EroareEtapaJurnalizare("OBTINERE_LOCK_LOGGER", error, {
          repositoryLocal: rootLog,
          loguriScriseLocal: false,
        });
      }
      if (Date.now() - inceput >= timeoutMs) {
        throw new EroareEtapaJurnalizare(
          "OBTINERE_LOCK_LOGGER",
          new Error(`logger ocupat mai mult de ${timeoutMs} ms: ${caleLock}`),
          { repositoryLocal: rootLog, loguriScriseLocal: false },
        );
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
  const repositoryTemporar = !localRepoPath;
  const rootLog = localRepoPath || creeazaCaleRepositoryLogTemporar(sessionId);
  try {
    return ruleazaCuBlocareLogger(rootLog, () => {
      const detaliiInainteDeScriere = {
        repositoryLocal: rootLog,
        repositoryRemote: remoteUrl,
        loguriScriseLocal: false,
      };
      ruleazaEtapaJurnalizare("PREGATIRE_REPOSITORY_LOG_LOCAL", () =>
        asiguraRepositoryLogLocal({
          localRepoPath: rootLog,
          remoteUrl,
        }),
      detaliiInainteDeScriere);
      ruleazaEtapaJurnalizare("GIT_PULL_INAINTE_DE_SCRIERE", () =>
        sincronizeazaInainteDeScriere(rootLog, remoteUrl),
      detaliiInainteDeScriere);

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

      const stamp = dataOraBucuresti(now).replace(" Europe/Bucharest", "");
      scrieCommitSnapshotSiPushCuReincercari({
        localRepoPath: rootLog,
        remoteUrl,
        mesajCommit: `Snapshot log hook ${hookEvent} ${stamp}`,
        blocHuman,
        blocTehnic,
        now,
      });

      return {
        humanReadable: path.join(rootLog, NUME_FISIER_LOG_HUMAN_READABLE),
        tehnic: path.join(rootLog, NUME_FISIER_LOG_TEHNIC),
      };
    });
  } catch (error) {
    if (error instanceof EroareEtapaJurnalizare) {
      error.detaliiJurnalizare = {
        repositoryLocal: rootLog,
        repositoryRemote: remoteUrl,
        ...error.detaliiJurnalizare,
      };
      throw error;
    }
    throw new EroareEtapaJurnalizare("ETAPA_NECUNOSCUTA", error, {
      repositoryLocal: rootLog,
      repositoryRemote: remoteUrl,
      loguriScriseLocal: false,
    });
  } finally {
    if (repositoryTemporar) {
      rmSync(path.dirname(rootLog), { recursive: true, force: true });
    }
  }
}
