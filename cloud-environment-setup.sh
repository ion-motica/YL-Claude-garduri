#!/usr/bin/env bash
set -euo pipefail

SKILLS_DIR="${HOME}/.claude/skills"
OLD_PLUGIN="${SKILLS_DIR}/personal-reminders"
NEW_PLUGIN="${SKILLS_DIR}/yl-claude-garduri"
TEMP_PLUGIN="${SKILLS_DIR}/yl-claude-garduri.new"
DIAGNOSTIC_FILE="${SKILLS_DIR}/YL_SETUP_RULAT.txt"
REPO_URL="https://github.com/ion-motica/YL-Claude-garduri.git"

mkdir -p "${SKILLS_DIR}"
rm -rf "${TEMP_PLUGIN}"

echo "[YL-GUARD setup] clonez versiunea curenta in zona temporara..."
git clone --depth 1 "${REPO_URL}" "${TEMP_PLUGIN}"

# Nu inlocui instalarea existenta pana cand noua copie nu are piesele minime de plugin.
test -f "${TEMP_PLUGIN}/.claude-plugin/plugin.json"
test -f "${TEMP_PLUGIN}/hooks/hooks.json"
test -f "${TEMP_PLUGIN}/Hook UserPromptSubmit/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs"
test -f "${TEMP_PLUGIN}/Hook UserPromptSubmit/motor_alegere_reminder_de_inserat.mjs"
test -f "${TEMP_PLUGIN}/Hook UserPromptSubmit/program_sincronizare_fisiere_sursa_adevar_din_GitHub_inainte_de_fiecare_prompt.mjs"

echo "[YL-GUARD setup] instalare noua verificata; o activez ca skills-directory plugin..."
rm -rf "${NEW_PLUGIN}"
mv "${TEMP_PLUGIN}" "${NEW_PLUGIN}"

# Stergem vechiul plugin numai dupa ce YL-Claude-garduri a fost instalat cu succes.
rm -rf "${OLD_PLUGIN}"

# Marker diagnostic: este scris doar dupa ce instalarea noua a ajuns cu succes in locul activ.
INSTALLED_COMMIT="$(git -C "${NEW_PLUGIN}" rev-parse HEAD)"
{
  echo "setup_rulat_la_utc=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "commit_clonat=${INSTALLED_COMMIT}"
  echo "repo=${REPO_URL}"
  echo "instalare=${NEW_PLUGIN}"
} > "${DIAGNOSTIC_FILE}"

echo "[YL-GUARD setup] OK"
echo "[YL-GUARD setup] nou: ${NEW_PLUGIN}"
echo "[YL-GUARD setup] vechi eliminat: ${OLD_PLUGIN}"
echo "[YL-GUARD setup] diagnostic: ${DIAGNOSTIC_FILE}"
