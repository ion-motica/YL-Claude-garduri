import assert from "node:assert/strict";
import { formatComponentPresence } from "../shared/claude-notice.mjs";

const text = formatComponentPresence(
  "yl-claude-garduri@skills-dir",
  "/root/.claude/skills/yl-claude-garduri",
);

assert.match(text, /Componenta tehnica: yl-claude-garduri@skills-dir/);
assert.match(text, /instalata in \/root\/\.claude\/skills\/yl-claude-garduri/);
assert.match(text, /functioneaza aici\./);

console.log("CLAUDE NOTICE TEST OK");
