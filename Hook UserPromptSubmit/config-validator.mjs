import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "1 Sursa adevar");

export const FILE_PROTECTIE = "blocheazaEditareFisiereSiExceptii.txt";
export const FILE_REMINDERE = "daca_detecteza_cuvinte_in_prompt_atunci_insereaza_asta.txt";

function lineOf(text, index) {
  return text.slice(0, Math.max(0, index)).split("\n").length;
}

function stripCommentsPreserveLines(text, fileName) {
  let out = "";
  let i = 0;
  let blockStart = -1;

  while (i < text.length) {
    if (text.startsWith("//", i)) {
      while (i < text.length && text[i] !== "\n") {
        out += " ";
        i += 1;
      }
      continue;
    }

    if (text.startsWith("/*", i)) {
      blockStart = i;
      out += "  ";
      i += 2;
      let closed = false;
      while (i < text.length) {
        if (text.startsWith("*/", i)) {
          out += "  ";
          i += 2;
          closed = true;
          blockStart = -1;
          break;
        }
        out += text[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      if (!closed) {
        return {
          text: out,
          errors: [{
            file: fileName,
            line: lineOf(text, blockStart),
            message: "comentariu /* deschis dar neincheiat cu */",
          }],
        };
      }
      continue;
    }

    out += text[i];
    i += 1;
  }

  return { text: out, errors: [] };
}

function skipWs(text, pos) {
  while (pos < text.length && /\s/.test(text[pos])) pos += 1;
  return pos;
}

function readBalancedSingleBraces(text, openPos, fileName) {
  if (text[openPos] !== "{") {
    return { error: { file: fileName, line: lineOf(text, openPos), message: 'asteptam "{"' } };
  }
  let depth = 0;
  for (let i = openPos; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        return { end: i + 1, body: text.slice(openPos + 1, i) };
      }
      if (depth < 0) break;
    }
  }
  return {
    error: {
      file: fileName,
      line: lineOf(text, openPos),
      message: 'bloc deschis cu "{" dar neincheiat cu "}"',
    },
  };
}

function validatePathsBody(body, bodyStartIndex, fullText, fileName, errors) {
  const lines = body.split(/\r?\n/);
  let offset = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (line && /[{}]/.test(line)) {
      errors.push({
        file: fileName,
        line: lineOf(fullText, bodyStartIndex + offset),
        message: `cale invalida in bloc: ${line}`,
      });
    }
    offset += raw.length + 1;
  }
}

export function validateProtectie(raw, fileName = FILE_PROTECTIE) {
  const stripped = stripCommentsPreserveLines(raw, fileName);
  const errors = [...stripped.errors];
  if (errors.length) return errors;
  const text = stripped.text;
  let pos = 0;

  const patterns = [
    {
      name: "blocheazaEditareFisiereSiFoldere",
      regex: /^blocheazaEditareFisiereSiFoldere\s*/,
      needsDate: false,
    },
    {
      name: "permiteEditarePanaLa",
      regex: /^permiteEditarePanaLa\s*\(\s*(\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2})\s+Europe\/Bucharest\s*\)\s*/,
      needsDate: true,
    },
    {
      name: "permiteEditareTOT_REPOSITORYPanaLa",
      regex: /^permiteEditareTOT_REPOSITORYPanaLa\s*\(\s*(\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2})\s+Europe\/Bucharest\s*\)\s*/,
      needsDate: true,
    },
  ];

  while (true) {
    pos = skipWs(text, pos);
    if (pos >= text.length) break;

    const rest = text.slice(pos);
    const p = patterns.find((x) => x.regex.test(rest));
    if (!p) {
      const snippet = rest.split(/\r?\n/, 1)[0].trim().slice(0, 100);
      errors.push({
        file: fileName,
        line: lineOf(text, pos),
        message: `sintaxa necunoscuta sau incompleta: ${snippet || "(linie goala?)"}`,
      });
      break;
    }

    const m = rest.match(p.regex);
    const headerEnd = pos + m[0].length;
    if (p.needsDate) {
      const [datePart, timePart] = m[1].split("-");
      const [year, month, day] = datePart.split(".").map(Number);
      const [hour, minute] = timePart.split(".").map(Number);
      const d = new Date(Date.UTC(year, month - 1, day, hour, minute));
      const valid = d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
      if (!valid) {
        errors.push({ file: fileName, line: lineOf(text, pos), message: `data/ora invalida: ${m[1]}` });
      }
    }

    const bracePos = skipWs(text, headerEnd);
    const block = readBalancedSingleBraces(text, bracePos, fileName);
    if (block.error) {
      errors.push(block.error);
      break;
    }
    validatePathsBody(block.body, bracePos + 1, text, fileName, errors);
    pos = block.end;
  }

  return errors;
}

function findDoubleClose(text, openPos) {
  const close = text.indexOf("}}", openPos + 2);
  return close === -1 ? null : close;
}

export function validateRemindere(raw, fileName = FILE_REMINDERE) {
  const stripped = stripCommentsPreserveLines(raw, fileName);
  const errors = [...stripped.errors];
  if (errors.length) return errors;
  const text = stripped.text;
  let pos = 0;

  while (true) {
    pos = skipWs(text, pos);
    if (pos >= text.length) break;
    const rest = text.slice(pos);

    if (rest.startsWith("insereazaInToatePrompturile")) {
      pos += "insereazaInToatePrompturile".length;
      pos = skipWs(text, pos);
      if (!text.startsWith("{{", pos)) {
        errors.push({ file: fileName, line: lineOf(text, pos), message: 'dupa insereazaInToatePrompturile asteptam "{{"' });
        break;
      }
      const close = findDoubleClose(text, pos);
      if (close === null) {
        errors.push({ file: fileName, line: lineOf(text, pos), message: 'bloc deschis cu "{{" dar neincheiat cu "}}"' });
        break;
      }
      pos = close + 2;
      continue;
    }

    if (rest.startsWith("dacaGaseste")) {
      const startLine = lineOf(text, pos);
      pos += "dacaGaseste".length;
      pos = skipWs(text, pos);
      if (text[pos] !== "(") {
        errors.push({ file: fileName, line: lineOf(text, pos), message: 'dupa dacaGaseste asteptam "("' });
        break;
      }
      const closeParen = text.indexOf(")", pos + 1);
      if (closeParen === -1) {
        errors.push({ file: fileName, line: startLine, message: 'dacaGaseste are "(" dar lipseste ")"' });
        break;
      }
      const triggersRaw = text.slice(pos + 1, closeParen).trim();
      const triggers = triggersRaw.split("|").map((x) => x.trim());
      if (!triggersRaw || triggers.some((x) => !x)) {
        errors.push({ file: fileName, line: startLine, message: "lista de triggere este goala sau contine o alternativa goala" });
      }
      pos = skipWs(text, closeParen + 1);
      if (!text.startsWith("atunciIncludeInPrompt", pos)) {
        errors.push({ file: fileName, line: lineOf(text, pos), message: "dupa dacaGaseste(...) asteptam atunciIncludeInPrompt" });
        break;
      }
      pos += "atunciIncludeInPrompt".length;
      pos = skipWs(text, pos);
      if (!text.startsWith("{{", pos)) {
        errors.push({ file: fileName, line: lineOf(text, pos), message: 'dupa atunciIncludeInPrompt asteptam "{{"' });
        break;
      }
      const close = findDoubleClose(text, pos);
      if (close === null) {
        errors.push({ file: fileName, line: lineOf(text, pos), message: 'bloc deschis cu "{{" dar neincheiat cu "}}"' });
        break;
      }
      pos = close + 2;
      continue;
    }

    const snippet = rest.split(/\r?\n/, 1)[0].trim().slice(0, 100);
    errors.push({
      file: fileName,
      line: lineOf(text, pos),
      message: `sintaxa necunoscuta sau incompleta: ${snippet || "(linie goala?)"}`,
    });
    break;
  }

  return errors;
}

export function validateAll({ sourceDir = SOURCE_DIR } = {}) {
  const errors = [];
  const specs = [
    [FILE_PROTECTIE, validateProtectie],
    [FILE_REMINDERE, validateRemindere],
  ];

  for (const [name, validator] of specs) {
    const filePath = path.join(sourceDir, name);
    try {
      const raw = readFileSync(filePath, "utf8");
      errors.push(...validator(raw, name));
    } catch (error) {
      errors.push({ file: name, line: 1, message: `nu pot citi fisierul: ${error.message}` });
    }
  }
  return errors;
}

export function formatAnnouncement(errors) {
  if (!errors.length) return "";
  const shown = errors.slice(0, 10);
  const lines = shown.map((e) => `- ${e.file}, linia ${e.line}: ${e.message}`);
  if (errors.length > shown.length) lines.push(`- ... si inca ${errors.length - shown.length} eroare/erori.`);
  return [
    "ANUNTA UTILIZATORUL CA:",
    "Configuratia YL-Claude-garduri are eroare/erori si trebuie corectata.",
    ...lines,
    "Nu presupune ce trebuia sa scrie utilizatorul. Nu folosi regula invalida pana nu este corectata.",
  ].join("\n");
}
