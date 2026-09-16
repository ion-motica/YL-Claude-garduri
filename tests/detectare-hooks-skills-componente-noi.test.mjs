import assert from "node:assert/strict";
import {
  parseazaDiffNameStatus,
  clasificaSchimbariPlugin,
} from "../Hook UserPromptSubmit/motor_detectare_hooks_skills_si_componente_noi_la_actualizare.mjs";

const raw = [
  "M\t1 Sursa adevar/daca_detecteza_cuvinte_in_prompt_atunci_insereaza_asta.txt",
  "A\tHook PreToolUse/handler_blocare_editare_fisiere_protejate.mjs",
  "M\thooks/hooks.json",
  "A\tskills/verifica-implementare/SKILL.md",
  "A\tBarzaun Experimental/program.mjs",
].join("\n");

const schimbari = parseazaDiffNameStatus(raw);
assert.equal(schimbari.length, 5);

const rezultat = clasificaSchimbariPlugin(schimbari, { skillsDirExistaInainte: false });

assert.deepEqual(rezultat.hookuriNoi, ["Hook PreToolUse"]);
assert.deepEqual(rezultat.skilluriNoi, ["verifica-implementare"]);
assert.deepEqual(rezultat.barzauniNoi, ["Barzaun Experimental"]);
assert.equal(rezultat.reloadNecesar, true);
assert.ok(rezultat.motiveReload.some((x) => x.includes("hooks/hooks.json")));
assert.ok(rezultat.motiveReload.some((x) => x.includes("skills/")));

const numaiCod = clasificaSchimbariPlugin(
  parseazaDiffNameStatus("M\tHook UserPromptSubmit/motor_alegere_reminder_de_inserat.mjs\n"),
);
assert.equal(numaiCod.reloadNecesar, false);

console.log("DETECTARE HOOKS SKILLS COMPONENTE NOI TEST OK");
