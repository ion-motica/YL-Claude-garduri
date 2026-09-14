#!/usr/bin/env node
import { validateAll, formatAnnouncement } from "./config-validator.mjs";

const errors = validateAll();
if (errors.length === 0) {
  console.log(JSON.stringify({ systemMessage: "YL-GUARD CONFIG OK" }));
  process.exit(0);
}

const context = formatAnnouncement(errors);
console.log(JSON.stringify({
  systemMessage: `YL-GUARD CONFIG ERROR: ${errors.length}`,
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: context,
  },
}));
