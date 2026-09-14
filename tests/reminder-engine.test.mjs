import assert from "node:assert/strict";
import {
  parseReminderConfig,
  selectReminders,
  triggerMatches,
  formatInjectedForContext,
  formatInjectedForDisplay,
} from "../Hook UserPromptSubmit/reminder-engine.mjs";

const raw = `
/* bloc dezactivat
insereazaInToatePrompturile {{NU TREBUIE SA APARA}}
*/
insereazaInToatePrompturile {{REGULA PERMANENTA}}

dacaGaseste(CP | control panel | panou de control)
atunciIncludeInPrompt {{REMINDER CP}}

dacaGaseste(crc)
atunciIncludeInPrompt {{REMINDER CRC}}
`;

const config = parseReminderConfig(raw);
assert.deepEqual(config.always, ["REGULA PERMANENTA"]);
assert.equal(config.conditional.length, 2);

assert.equal(triggerMatches("lucram la CP acum", "cp"), true);
assert.equal(triggerMatches("scp", "cp"), false);
assert.equal(triggerMatches("modificam CONTROL PANEL", "control panel"), true);

const fromPrompt = selectReminders(config, "lucram la CP", "");
assert.equal(fromPrompt.length, 2);
assert.equal(fromPrompt[0].body, "REGULA PERMANENTA");
assert.equal(fromPrompt[1].body, "REMINDER CP");

const fromClaude = selectReminders(config, "continua", "Am modificat control panel-ul.");
assert.equal(fromClaude.length, 2);
assert.equal(fromClaude[1].body, "REMINDER CP");

const both = selectReminders(config, "CP si crc", "control panel");
assert.equal(both.length, 3);
assert.match(formatInjectedForContext(both), /REMINDER CP/);
assert.match(formatInjectedForContext(both), /REMINDER CRC/);
assert.match(formatInjectedForDisplay(both), /VALIDATOR|INJECTAT AUTOMAT|trigger/i);

console.log("REMINDER ENGINE TESTE OK");
