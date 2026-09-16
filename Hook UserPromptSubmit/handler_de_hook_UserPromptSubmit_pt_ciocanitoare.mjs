#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FILE_PROTECTIE,
  FILE_REMINDERE,
  validateAll,
  validateRemindere,
} from "./config-validator.mjs";
import {
  parseReminderConfig,
  selectReminders,
  readLastAssistantMessage,
  formatInjectedForContext,
} from "./motor_alegere_reminder_de_inserat.mjs";
import { formatComponentPresence } from "../shared/claude-notice.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "1 Sursa adevar");
const REMINDERS_PATH = path.join(SOURCE_DIR, FILE_REMINDERE);
const REPO_NAME = "YL-Claude-garduri";
const SOURCE_RELATIVE_DIR = "1 Sursa adevar";
const VALIDATED_FILES = [FILE_PROTECTIE, FILE_REMINDERE];
const HOOK_NAME = "UserPromptSubmit";
const PROGRAM_NAME = "handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs";
const MOTOR_NAME = "motor_alegere_reminder_de_inserat.mjs";
const PORTAR_NAME = "program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs";
const PLUGIN_NAME = "yl-claude-garduri@skills-dir";
const STATUS_ENV = "YL_GARDURI_STATUS_ACTUALIZARE_PLUGIN";

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

function formatValidatorForDisplay(errors) {
  const lines = [];
  for (const file of VALIDATED_FILES) {
    const fileErrors = errorsForFile(errors, file);
    if (fileErrors.length === 0) {
      lines.push(`validare ok pt repo ${REPO_NAME}, ${repoPath(file)}`);
      continue;
    }
    lines.push(`eroare in repo ${REPO_NAME}, ${repoPath(file)}`);
    for (const e of fileErrors.slice(0, 10)) {
      lines.push(`  linia ${e.line}: ${e.message}`);
    }
    if (fileErrors.length > 10) {
      lines.push(`  ... si inca ${fileErrors.length - 10} eroare/erori.`);
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
    if (fileErrors.length > 10) {
      lines.push(`... si inca ${fileErrors.length - 10} eroare/erori.`);
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

function etichetaReminderPentruNotice(item) {
  if (item.kind === "toate") return "TOATE";
  if (Array.isArray(item.matched) && item.matched.length > 0) {
    return item.matched.join("/");
  }
  return "trigger";
}

function formatInserariPentruNotice(selected) {
  if (selected.length === 0) {
    return "S-a inserat: nimic.";
  }
  const inserari = selected.map((item) => `${etichetaReminderPentruNotice(item)}=${item.body}`);
  return `S-a inserat: ${inserari.join(" ; ")}`;
}

function listaScurta(valori, limita = 10) {
  if (!Array.isArray(valori) || valori.length === 0) return "";
  const afisate = valori.slice(0, limita);
  const extra = valori.length > limita ? ` ; ... +${valori.length - limita}` : "";
  return `${afisate.join(" ; ")}${extra}`;
}

function formatActualizarePluginPentruNotice(status) {
  const commit = status?.remoteCommit ? String(status.remoteCommit).slice(0, 12) : "necunoscut";
  const lines = [
    "ACTUALIZARE GARDURI DIN GITHUB:",
    `rezultat: ${status?.status || "necunoscut"}`,
    `commit GitHub verificat: ${commit}`,
    status?.mesaj || "fara mesaj",
  ];

  if (status?.schimbari?.length) {
    const schimbari = status.schimbari.map((x) => `${x.status}:${x.path}`);
    lines.push(`schimbari detectate: ${listaScurta(schimbari, 15)}`);
  }
  if (status?.hookuriNoi?.length) lines.push(`HOOKURI NOI detectate: ${listaScurta(status.hookuriNoi)}`);
  if (status?.skilluriNoi?.length) lines.push(`SKILLS NOI detectate: ${listaScurta(status.skilluriNoi)}`);
  if (status?.barzauniNoi?.length) lines.push(`BARZAUNI/COMPONENTE NOI necunoscute detectate: ${listaScurta(status.barzauniNoi)}`);
  if (status?.componenteNoi?.length) lines.push(`componente/foldere noi: ${listaScurta(status.componenteNoi)}`);

  if (status?.reloadNecesar) {
    lines.push("/reload-plugins NECESAR pentru ca noile/modificatele componente de plugin sa fie incarcate in sesiunea curenta.");
    if (status.motiveReload?.length) lines.push(`motive reload: ${listaScurta(status.motiveReload, 10)}`);
  }

  return lines.join("\n");
}

function formatVerificareTehnicaPentruNotice(statusActualizare, allErrors) {
  return [
    "VERIFICARE TEHNICA:",
    formatActualizarePluginPentruNotice(statusActualizare),
    `VALIDARE CONFIGURATIE LOCALA FOLOSITA ACUM:\n${formatValidatorForDisplay(allErrors)}`,
    `Hook activ: ${HOOK_NAME}`,
    `Portar actualizare: ${PORTAR_NAME}`,
    `Program hook: ${PROGRAM_NAME}`,
    `Motor remindere: ${MOTOR_NAME}`,
    `PREZENTA COMPONENTEI:\n${formatComponentPresence(PLUGIN_NAME, ROOT)}`,
  ].join("\n\n");
}

function noticePeUnSingurRand(text) {
  return String(text).replace(/\s*\r?\n+\s*/g, " | ");
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
let selected = [];
let reminderFileErrors = [];

try {
  const rawReminders = readFileSync(REMINDERS_PATH, "utf8");
  reminderFileErrors = validateRemindere(rawReminders, FILE_REMINDERE);
  if (reminderFileErrors.length === 0) {
    const config = parseReminderConfig(rawReminders);
    const currentPrompt = typeof input.prompt === "string" ? input.prompt : "";
    const previousAssistant = readLastAssistantMessage(input.transcript_path);
    selected = selectReminders(config, currentPrompt, previousAssistant);
  }
} catch {
  // validateAll() raporteaza deja fisierul lipsa / imposibil de citit
}

const injectedContext = formatInjectedForContext(selected);
const displayCuStructuraNormala = [
  formatInserariPentruNotice(selected),
  formatVerificareTehnicaPentruNotice(statusActualizare, allErrors),
].join("\n\n");
const display = noticePeUnSingurRand(displayCuStructuraNormala);

const contextParts = [];
if (statusActualizare?.reloadNecesar) {
  contextParts.push([
    "ANUNTA UTILIZATORUL CA:",
    "Actualizarea YL-Claude-garduri a detectat componente de plugin noi/modificate care nu devin active sigur doar prin schimbarea fisierelor locale.",
    "Este necesar /reload-plugins in sesiunea curenta inainte sa pretinzi ca noile hookuri/skills/componente sunt active.",
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

const output = { systemMessage: display };
if (contextParts.length > 0) {
  output.hookSpecificOutput = {
    hookEventName: "UserPromptSubmit",
    additionalContext: contextParts.join("\n\n"),
  };
}

console.log(JSON.stringify(output));
