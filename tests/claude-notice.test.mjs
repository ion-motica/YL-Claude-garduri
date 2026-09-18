import assert from "node:assert/strict";
import {
  formatAvertizareSesiuneNoua,
  formatComponentPresence,
} from "../shared/claude-notice.mjs";

const text = formatComponentPresence(
  "yl-claude-garduri@skills-dir",
  "/root/.claude/skills/yl-claude-garduri",
);

assert.match(text, /Componenta tehnica: yl-claude-garduri@skills-dir/);
assert.match(text, /instalata in \/root\/\.claude\/skills\/yl-claude-garduri/);
assert.match(text, /functioneaza aici\./);

const avertizare = formatAvertizareSesiuneNoua({
  sesiuneNouaNecesara: true,
  motiveSesiuneNoua: ["config_hooks: hooks/hooks.json"],
  reloadNecesar: false,
  motiveReload: [],
});
assert.match(avertizare, /SESIUNE\/CHAT NOU/);
assert.match(avertizare, /config_hooks: hooks\/hooks\.json/);
assert.equal(formatAvertizareSesiuneNoua({
  sesiuneNouaNecesara: false,
  motiveSesiuneNoua: [],
  reloadNecesar: true,
  motiveReload: ["camp vechi care nu trebuie folosit"],
}), "");

console.log("CLAUDE NOTICE TEST OK");
