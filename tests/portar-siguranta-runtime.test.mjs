import assert from "node:assert/strict";
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { actualizeazaPluginul } from "../Hook UserPromptSubmit/program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs";

function git(root, args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

const root = mkdtempSync(path.join(os.tmpdir(), "yl-garduri-test-runtime-"));
git(root, ["init"]);
git(root, ["config", "user.email", "test@example.com"]);
git(root, ["config", "user.name", "YL test"]);
writeFileSync(path.join(root, "fisier.txt"), "initial\n", "utf8");
git(root, ["add", "."]);
git(root, ["commit", "-m", "initial"]);
git(root, ["remote", "add", "origin", "https://github.com/ion-motica/YL-Claude-garduri.git"]);

appendFileSync(path.join(root, "fisier.txt"), "NU PIERDE ACEASTA LINIE\n", "utf8");

const rezultat = actualizeazaPluginul({ root });
assert.equal(rezultat.status, "modificari_locale_detectate");
assert.match(rezultat.mesaj, /NU fac reset automat/);
assert.match(readFileSync(path.join(root, "fisier.txt"), "utf8"), /NU PIERDE ACEASTA LINIE/);

console.log("PORTAR SIGURANTA RUNTIME TEST OK");
