import { readFileSync } from "node:fs";

function stripComments(text) {
  let out = "";
  let i = 0;

  while (i < text.length) {
    if (text.startsWith("//", i)) {
      while (i < text.length && text[i] !== "\n") {
        out += " ";
        i += 1;
      }
      continue;
    }

    if (text.startsWith("/*", i)) {
      out += "  ";
      i += 2;
      while (i < text.length && !text.startsWith("*/", i)) {
        out += text[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      if (i < text.length) {
        out += "  ";
        i += 2;
      }
      continue;
    }

    out += text[i];
    i += 1;
  }

  return out;
}

function skipWs(text, pos) {
  while (pos < text.length && /\s/.test(text[pos])) pos += 1;
  return pos;
}

function readDoubleBraceBody(text, pos) {
  if (!text.startsWith("{{", pos)) return null;
  const close = text.indexOf("}}", pos + 2);
  if (close === -1) return null;
  return {
    body: text.slice(pos + 2, close).trim(),
    end: close + 2,
  };
}

export function parseReminderConfig(raw) {
  const text = stripComments(raw);
  const always = [];
  const conditional = [];
  let pos = 0;

  while (true) {
    pos = skipWs(text, pos);
    if (pos >= text.length) break;

    if (text.startsWith("insereazaInToatePrompturile", pos)) {
      pos += "insereazaInToatePrompturile".length;
      pos = skipWs(text, pos);
      const block = readDoubleBraceBody(text, pos);
      if (!block) break; // validatorul raporteaza sintaxa invalida
      if (block.body) always.push(block.body);
      pos = block.end;
      continue;
    }

    if (text.startsWith("dacaGaseste", pos)) {
      pos += "dacaGaseste".length;
      pos = skipWs(text, pos);
      if (text[pos] !== "(") break;

      const closeParen = text.indexOf(")", pos + 1);
      if (closeParen === -1) break;
      const triggers = text
        .slice(pos + 1, closeParen)
        .split("|")
        .map((x) => x.trim())
        .filter(Boolean);

      pos = skipWs(text, closeParen + 1);
      if (!text.startsWith("atunciIncludeInPrompt", pos)) break;
      pos += "atunciIncludeInPrompt".length;
      pos = skipWs(text, pos);

      const block = readDoubleBraceBody(text, pos);
      if (!block) break;
      conditional.push({ triggers, body: block.body });
      pos = block.end;
      continue;
    }

    break; // validatorul raporteaza sintaxa necunoscuta
  }

  return { always, conditional };
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function triggerMatches(haystack, trigger) {
  if (!trigger) return false;
  const pattern = `(^|[^\\p{L}\\p{N}_])${escapeRegex(trigger)}(?=$|[^\\p{L}\\p{N}_])`;
  return new RegExp(pattern, "iu").test(haystack || "");
}

export function selectReminders(config, currentPrompt = "", previousAssistant = "") {
  const searchText = `${currentPrompt}\n${previousAssistant}`;
  const selected = [];
  const seenBodies = new Set();

  for (const body of config.always) {
    if (body && !seenBodies.has(body)) {
      selected.push({ kind: "toate", matched: [], body });
      seenBodies.add(body);
    }
  }

  for (const rule of config.conditional) {
    const matched = rule.triggers.filter((trigger) => triggerMatches(searchText, trigger));
    if (matched.length > 0 && rule.body && !seenBodies.has(rule.body)) {
      selected.push({ kind: "trigger", matched, body: rule.body });
      seenBodies.add(rule.body);
    }
  }

  return selected;
}

function contentToText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part.text === "string") return part.text;
      if (part && typeof part.content === "string") return part.content;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function assistantTextFromRecord(record) {
  if (!record || typeof record !== "object") return "";
  if (record.role === "assistant") return contentToText(record.content);
  if (record.message?.role === "assistant") return contentToText(record.message.content);
  if (record.type === "assistant") {
    if (record.message) return contentToText(record.message.content ?? record.message);
    return contentToText(record.content);
  }
  return "";
}

export function readLastAssistantMessage(transcriptPath) {
  if (!transcriptPath) return "";

  try {
    const lines = readFileSync(transcriptPath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean);

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        const text = assistantTextFromRecord(JSON.parse(lines[i]));
        if (text.trim()) return text;
      } catch {
        // o linie defecta din transcript nu trebuie sa opreasca hookul
      }
    }
  } catch {
    return "";
  }

  return "";
}

export function formatInjectedForContext(selected) {
  return selected.map((item) => item.body).join("\n\n");
}

export function formatInjectedForDisplay(selected) {
  if (selected.length === 0) return "INJECTAT AUTOMAT: nimic";

  const parts = ["INJECTAT AUTOMAT:"];
  selected.forEach((item, index) => {
    const label = item.kind === "toate"
      ? "toate prompturile"
      : `trigger: ${item.matched.join(" | ")}`;
    parts.push(`\n[${index + 1}] ${label}\n${item.body}`);
  });
  return parts.join("\n");
}
