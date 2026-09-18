#!/usr/bin/env node
import { memoreazaTitluSesiune } from "../shared/program_scrie_log_activitate_hooks.mjs";

function citesteStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolve(""));
  });
}

const stdinText = await citesteStdin();
let input = {};
try {
  input = JSON.parse(stdinText || "{}");
} catch {
  input = {};
}

memoreazaTitluSesiune({
  sessionId: input?.session_id,
  sessionTitle: input?.session_title,
});
