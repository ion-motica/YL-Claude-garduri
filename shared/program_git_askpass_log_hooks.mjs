#!/usr/bin/env node

const NUME_VARIABILA_TOKEN = "YL_GARDURI_LOG_GITHUB_TOKEN";
const prompt = String(process.argv[2] || "");

if (/username/i.test(prompt)) {
  process.stdout.write("x-access-token\n");
  process.exit(0);
}

if (/password/i.test(prompt)) {
  const token = process.env[NUME_VARIABILA_TOKEN];
  if (!token) {
    process.stderr.write(`CREDENTIAL_LOG_GITHUB_LIPSA: ${NUME_VARIABILA_TOKEN}\n`);
    process.exit(1);
  }
  process.stdout.write(`${token}\n`);
  process.exit(0);
}

process.stderr.write("PROMPT_GIT_ASKPASS_NECUNOSCUT\n");
process.exit(1);
