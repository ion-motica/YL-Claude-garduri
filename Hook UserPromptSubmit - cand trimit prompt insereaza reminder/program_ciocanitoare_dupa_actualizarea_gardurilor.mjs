#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FILE_PROTECTIE,
  FILE_REMINDERE,
  validateAll,
  validateRemindere,
} from "../Hook UserPromptSubmit - cand trimit prompt update all garduri din github/config-validator.mjs";
import {
  parseReminderConfig,
  selectReminders,
  readLastAssistantMessage,
  formatInjectedForContext,
} from "./motor_alegere_reminder_de_inserat.mjs";
import { asiguraListeEfectiveDeEditare } from "../Hook PreToolUse - inainte sa modifice Claude un fisier verifica daca e protejat si opreste modificarea/motor_calculeaza_liste_efective_de_fisiere_permise_si_interzise.mjs";
import {
  CALE_LOG_ACTIVITATE_HOOKS,
  scrieLogActivitateHook,
} from "../shared/program_scrie_log_activitate_hooks.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "1 Sursa adevar");
const REMINDERS_PATH = path.join(SOURCE_DIR, FILE_REMINDERE);
const PROTECTIE_PATH = path.join(SOURCE_DIR, FILE_PROTECTIE);
const REPO_NAME = "YL-Claude-garduri";
const SOURCE_RELATIVE_DIR = "1 Sursa adevar";
const VALIDATED_FILES = [FILE_PROTECTIE, FILE_REMINDERE];
const STATUS_ENV = "YL_GARDURI_STATUS_ACTUALIZARE_PLUGIN";
const FOLDER_UPDATE = "Hook UserPromptSubmit - cand trimit prompt update all garduri din github";
const FOLDER_REMINDER = "Hook UserPromptSubmit - cand trimit prompt insereaza reminder";

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolve(""));
  });
}

function repoPath(file) {
  return `${SOURCE_RELATIVE_DIR}/${file}`;
}

function errorsForFile(errors, file) {
  return errors.filter((e) => e.file === file);
}

function formatValidatorPentruLog(errors) {
  const lines = [];
  for (const file of VALIDATED_FILES) {
    const fileErrors = errorsForFile(errors, file);
    if (fileErrors.length === 0) {
      lines.push(`validare ok: ${REPO_NAME}/${repoPath(file)}`);
      continue;
    }
    lines.push(`eroare: ${REPO_NAME}/${repoPath(file)}`);
    for (const e of fileErrors.slice(0, 10)) {
      lines.push(`  linia ${e.line}: ${e.message}`);
    }
  }
  return lines.join("\n");
}

function formatErrorAnnouncement(errors) {
  if (errors.length === 0) return "";
  const lines = ["ANUNTA UTILIZATORUL CA:"];
  for (const file of VALIDATED_FILES) {
    const fileErrors = errorsForFile(errors, file);
    if (fileErrors.length === 0) continue;
    lines.push(`eroare in repo ${REPO_NAME}, ${repoPath(file)}`);
    for (const e of fileErrors.slice(0, 10)) {
      lines.push(`linia ${e.line}: ${e.message}`);
    }
  }
  lines.push("Nu presupune ce trebuia sa scrie utilizatorul. Nu folosi regula invalida pana nu este corectata.");
  return lines.join("\n");
}

function citesteStatusActualizarePlugin() {
  const raw = process.env[STATUS_ENV];
  if (!raw) {
    return {
      status: "handler_rulat_fara_portar",
      remoteCommit: null,
      mesaj: "handlerul a fost rulat direct; statusul actualizarii pluginului nu este disponibil.",
      schimbari: [],
      componenteNoi: [],
      hookuriNoi: [],
      skilluriNoi: [],
      barzauniNoi: [],
      reloadNecesar: false,
      motiveReload: [],
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {
      status: "status_portar_invalid",
      remoteCommit: null,
      mesaj: "nu am putut interpreta statusul primit de la portarul de actualizare.",
      schimbari: [],
      componenteNoi: [],
      hookuriNoi: [],
      skilluriNoi: [],
      barzauniNoi: [],
      reloadNecesar: false,
      motiveReload: [],
    };
  }
}

function pregatesteListeEditare(input) {
  try {
    const rawProtectie = readFileSync(PROTECTIE_PATH, "utf8");
    return asiguraListeEfectiveDeEditare({
      cwd: input?.cwd,
      rawProtectie,
      sessionId: input?.session_id,
      now: new Date(),
    });
  } catch (error) {
    return {
      ok: false,
      tip: "nu_pot_pregati_listele",
      erori: [{ file: FILE_PROTECTIE, line: 1, message: error.message }],
    };
  }
}

function ccnScurt(statusActualizare, selected) {
  const status = statusActualizare?.status || "necunoscut";
  const linieUpdate = `${FOLDER_UPDATE} a facut verificarea/actualizarea gardurilor (${status}).`;
  const linieReminder = `${FOLDER_REMINDER} a facut inserarea reminderelor: ${selected.length}.`;
  return `${linieUpdate} | ${linieReminder}`;
}

function detaliiListePentruLog(statusListe) {
  if (!statusListe?.ok) {
    return [
      "LISTE EFECTIVE DE EDITARE: EROARE",
      ...(statusListe?.erori || []).map((e) => `${e.file}:${e.line || 1} ${e.message}`),
    ].join("\n");
  }
  return [
    `LISTE EFECTIVE DE EDITARE: ${statusListe.statusListe}`,
    `hash sursa: ${statusListe.hashSursa}`,
    `hash stare: ${statusListe.hashStare}`,
    `generate la: ${statusListe.generatedAt}`,
    `PERMISE: ${statusListe.fisierPermise}`,
    `INTERZISE: ${statusListe.fisierInterzise}`,
  ].join("\n");
}

function detaliiReminderePentruLog(selected) {
  if (!selected.length) return "REMINDERE INSERATE: niciunul";
  return [
    `REMINDERE INSERATE: ${selected.length}`,
    ...selected.map((item, index) => {
      const trigger = Array.isArray(item.matched) && item.matched.length ? item.matched.join("/") : item.kind;
      return `${index + 1}. ${trigger}\n${item.body}`;
    }),
  ].join("\n");
}

const stdinText = await readStdin();
let input = {};
try {
  input = JSON.parse(stdinText || "{}");
} catch {
  input = {};
}

const statusActualizare = citesteStatusActualizarePlugin();
const allErrors = validateAll();
const statusListe = pregatesteListeEditare(input);
let selected = [];

try {
  const rawReminders = readFileSync(REMINDERS_PATH, "utf8");
  const reminderFileErrors = validateRemindere(rawReminders, FILE_REMINDERE);
  if (reminderFileErrors.length === 0) {
    const config = parseReminderConfig(rawReminders);
    const currentPrompt = typeof input.prompt === "string" ? input.prompt : "";
    const previousAssistant = readLastAssistantMessage(input.transcript_path);
    selected = selectReminders(config, currentPrompt, previousAssistant);
  }
} catch {
  // validateAll() raporteaza deja fisierul lipsa / imposibil de citit.
}

const injectedContext = formatInjectedForContext(selected);
const contextParts = [];

/*
IMPORTANT pentru testul si arhitectura PreToolUse:
listele PERMISE/INTERZISE sunt generate/verificate aici, dar NU sunt
injectate in additionalContext. Claude nu afla preventiv din UserPromptSubmit
ce fisiere sunt protejate; primul semnal despre un blocaj vine din PreToolUse.
*/

if (statusActualizare?.reloadNecesar) {
  contextParts.push([
    "ANUNTA UTILIZATORUL CA:",
    "Actualizarea YL-Claude-garduri a detectat componente structurale noi/modificate.",
    "In Claude Code Web este necesara o SESIUNE/CHAT NOU pentru activarea sigura a acelor componente.",
    "Nu pretinde ca noile hookuri/skills/componente sunt active in sesiunea curenta.",
    statusActualizare.motiveReload?.length ? `Motive: ${statusActualizare.motiveReload.join(" ; ")}` : "",
  ].filter(Boolean).join("\n"));
}

if (["verificare_remote_esuat", "fetch_esuat", "remote_invalid", "comparare_esuat", "actualizare_esuat"].includes(statusActualizare?.status)) {
  contextParts.push([
    "ANUNTA UTILIZATORUL CA:",
    `Actualizarea automata YL-Claude-garduri are status ${statusActualizare.status}.`,
    statusActualizare.mesaj || "",
    "Nu pretinde ca ruleaza ultima versiune GitHub daca actualizarea nu a reusit.",
  ].join("\n"));
}

if (allErrors.length > 0) {
  contextParts.push(formatErrorAnnouncement(allErrors));
}

if (injectedContext) {
  contextParts.push(injectedContext);
}

const additionalContext = contextParts.join("\n\n");
let display = ccnScurt(statusActualizare, selected);

const detaliiLog = [
  "STATUS ACTUALIZARE GARDURI:",
  JSON.stringify(statusActualizare, null, 2),
  "",
  detaliiListePentruLog(statusListe),
  "",
  "VALIDARE CONFIGURATIE:",
  formatValidatorPentruLog(allErrors),
  "",
  detaliiReminderePentruLog(selected),
  "",
  `ROOT RUNTIME PLUGIN: ${ROOT}`,
].join("\n");

try {
  scrieLogActivitateHook({
    repositoryRoot: input?.cwd,
    sessionId: input?.session_id,
    hookEvent: "UserPromptSubmit",
    folderHookRepo: `${FOLDER_UPDATE} + ${FOLDER_REMINDER}`,
    activitate: "a verificat/actualizat gardurile, a generat/verificat listele de editare si a selectat reminderele",
    ccn: display,
    additionalContext,
    alteMesajeCatreClaude: "",
    alteActivitati: detaliiLog,
  });
} catch (error) {
  display += ` | ${FOLDER_UPDATE} nu a putut scrie ${path.basename(CALE_LOG_ACTIVITATE_HOOKS)}.`;
}

const output = { systemMessage: display };
if (additionalContext) {
  output.hookSpecificOutput = {
    hookEventName: "UserPromptSubmit",
    additionalContext,
  };
}

console.log(JSON.stringify(output));
