import assert from "node:assert/strict";
import { validateProtectie, validateRemindere } from "../Hook UserPromptSubmit - cand trimit prompt update all garduri din github/config-validator.mjs";

const protectOk = `
/* comment */
blocheazaEditareFisiereSiFoldere {
  js/a.js
  js/core/
}
permiteEditarePanaLa(2026.09.15-18.00 Europe/Bucharest) {
  js/a.js
}
permiteEditareTOT_REPOSITORYPanaLa(2026.09.15-18.00 Europe/Bucharest) {
}
`;
assert.deepEqual(validateProtectie(protectOk), []);
assert.ok(validateProtectie("blocheazaEditareFisiereSiFoldere {\n js/a.js\n").length > 0);
assert.ok(validateProtectie("permiteEditarePanaLa(2026.99.99-88.99 Europe/Bucharest) {}\n").length > 0);

const remindersOk = `
/*
insereazaInToatePrompturile {{ dezactivat }}
*/
dacaGaseste(CP | control panel | panou de control)
atunciIncludeInPrompt {{Text cu \"ghilimele\".}}

dacaGaseste(crc)
atunciIncludeInPrompt {{Alt text.}}
`;
assert.deepEqual(validateRemindere(remindersOk), []);
assert.ok(validateRemindere("dacaGaseste(CP) atunciIncludeInPrompt {{ text\n").length > 0);
assert.ok(validateRemindere("dacaGaseste(CP | ) atunciIncludeInPrompt {{text}}\n").length > 0);
assert.ok(validateRemindere("dacaGaseste(CP) altceva {{text}}\n").length > 0);

console.log("TESTE OK");
