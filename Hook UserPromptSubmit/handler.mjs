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
  formatInjectedForDisplay,
} from "./reminder-engine.mjs";
import { formatComponentPresence } from "../shared/claude-notice.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "1 Sursa adevar");
const REMINDERS_PATH = path.join(SOURCE_DIR, FILE_REMINDERE);
const REPO_NAME = "YL-Claude-garduri";
const SOURCE_RELATIVE_DIR = "1 Sursa adevar";
const VALIDATED_FILES = [FILE_PROTECTIE, FILE_REMINDERE];
const COMPONENT_NAME = "Hook UserPromptSubmit - Remindere";

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

const stdinText = await readStdin();
let input = {};
try {
  input = JSON.parse(stdinText || "{}");
} catch {
  input = {};
}

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
const display = [
  formatComponentPresence(COMPONENT_NAME, ROOT),
  formatValidatorForDisplay(allErrors),
  formatInjectedForDisplay(selected),
].join("\n\n");

const contextParts = [];
if (allErrors.length > 0) {
  contextParts.push(formatErrorAnnouncement(allErrors));
}
if (injectedContext) {
  contextParts.push(injectedContext);
}

const output = {
  systemMessage: display,
};

if (contextParts.length > 0) {
  output.hookSpecificOutput = {
    hookEventName: "UserPromptSubmit",
    additionalContext: contextParts.join("\n\n"),
  };
}

console.log(JSON.stringify(output));
