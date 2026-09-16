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

const rezultat = clasificaSchimbariPlugin(schimbari, { skillsDirExistaInainte: true });

assert.deepEqual(rezultat.hookuriNoi, ["Hook PreToolUse"]);
assert.deepEqual(rezultat.skilluriNoi, ["verifica-implementare"]);
assert.deepEqual(rezultat.barzauniNoi, ["Barzaun Experimental"]);
assert.equal(rezultat.sesiuneNouaNecesara, true);
assert.ok(rezultat.motiveSesiuneNoua.some((x) => x.includes("hooks/hooks.json")));
assert.ok(rezultat.motiveSesiuneNoua.some((x) => x.includes("Barzaun Experimental")));

const numaiSkillModificat = clasificaSchimbariPlugin(
  parseazaDiffNameStatus("M\tskills/verifica-implementare/SKILL.md\n"),
  { skillsDirExistaInainte: true },
);
assert.equal(numaiSkillModificat.sesiuneNouaNecesara, false);

const numaiCod = clasificaSchimbariPlugin(
  parseazaDiffNameStatus("M\tHook UserPromptSubmit/motor_alegere_reminder_de_inserat.mjs\n"),
);
assert.equal(numaiCod.sesiuneNouaNecesara, false);

const numaiDocumentatieLearnings = clasificaSchimbariPlugin(
  parseazaDiffNameStatus([
    "A\t2 Learnings din construirea gardurilor/README.md",
    "A\t2 Learnings din construirea gardurilor/PLAN_CONTINUARE_GARDURI.md",
  ].join("\n")),
);
assert.equal(numaiDocumentatieLearnings.sesiuneNouaNecesara, false);
assert.deepEqual(numaiDocumentatieLearnings.barzauniNoi, []);
assert.ok(Array.isArray(numaiDocumentatieLearnings.categorii.documentatie));

console.log("DETECTARE HOOKS SKILLS COMPONENTE NOI TEST OK");
