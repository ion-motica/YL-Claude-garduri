#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FILE_REMINDERE,
  validateAll,
  validateRemindere,
  formatAnnouncement,
} from "./config-validator.mjs";
import {
  parseReminderConfig,
  selectReminders,
  readLastAssistantMessage,
  formatInjectedForContext,
  formatInjectedForDisplay,
} from "./reminder-engine.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "1 Sursa adevar");
const REMINDERS_PATH = path.join(SOURCE_DIR, FILE_REMINDERE);

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolve(""));
  });
}

function formatValidatorForDisplay(errors) {
  if (errors.length === 0) return "VALIDATOR: OK";
  const lines = errors.slice(0, 10).map(
    (e) => `- ${e.file}, linia ${e.line}: ${e.message}`,
  );
  if (errors.length > 10) {
    lines.push(`- ... si inca ${errors.length - 10} eroare/erori.`);
  }
  return `VALIDATOR: EROARE (${errors.length})\n${lines.join("\n")}`;
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
  "YL-GUARD",
  formatValidatorForDisplay(allErrors),
  formatInjectedForDisplay(selected),
].join("\n\n");

const contextParts = [];
if (allErrors.length > 0) {
  contextParts.push(formatAnnouncement(allErrors));
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
