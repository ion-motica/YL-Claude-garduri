import assert from "node:assert/strict";
import { formatComponentPresence } from "../shared/claude-notice.mjs";

const text = formatComponentPresence(
  "Hook UserPromptSubmit - Remindere",
  "/root/.claude/skills/yl-claude-garduri",
);

assert.match(text, /Hook UserPromptSubmit - Remindere/);
assert.match(text, /instalat in \/root\/\.claude\/skills\/yl-claude-garduri/);
assert.match(text, /functioneaza aici\./);

console.log("CLAUDE NOTICE TEST OK");
