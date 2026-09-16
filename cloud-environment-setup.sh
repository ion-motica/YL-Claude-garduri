#!/usr/bin/env bash
set -euo pipefail

SKILLS_DIR="${HOME}/.claude/skills"
OLD_PLUGIN="${SKILLS_DIR}/personal-reminders"
NEW_PLUGIN="${SKILLS_DIR}/yl-claude-garduri"
TEMP_PLUGIN="${SKILLS_DIR}/yl-claude-garduri.new"
DIAGNOSTIC_FILE="${SKILLS_DIR}/YL_SETUP_RULAT.txt"
REPO_URL="https://github.com/ion-motica/YL-Claude-garduri.git"
CI_PASSED_BRANCH="ci-passed"

mkdir -p "${SKILLS_DIR}"
rm -rf "${TEMP_PLUGIN}"

echo "[YL-GUARD setup] clonez ultima versiune care are CI PASS in zona temporara..."
git clone --depth 1 --branch "${CI_PASSED_BRANCH}" --single-branch "${REPO_URL}" "${TEMP_PLUGIN}"

# Nu inlocui instalarea existenta pana cand noua copie nu are piesele minime de plugin.
test -f "${TEMP_PLUGIN}/.claude-plugin/plugin.json"
test -f "${TEMP_PLUGIN}/hooks/hooks.json"

# UserPromptSubmit: actiunea globala de update pentru toate gardurile.
test -f "${TEMP_PLUGIN}/Hook UserPromptSubmit - cand trimit prompt update all garduri din github/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs"
test -f "${TEMP_PLUGIN}/Hook UserPromptSubmit - cand trimit prompt update all garduri din github/program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs"
test -f "${TEMP_PLUGIN}/Hook UserPromptSubmit - cand trimit prompt update all garduri din github/motor_detectare_hooks_skills_si_componente_noi_la_actualizare.mjs"
test -f "${TEMP_PLUGIN}/Hook UserPromptSubmit - cand trimit prompt update all garduri din github/config-validator.mjs"

# UserPromptSubmit: actiunea separata de inserare a reminderelor.
test -f "${TEMP_PLUGIN}/Hook UserPromptSubmit - cand trimit prompt insereaza reminder/program_ciocanitoare_dupa_actualizarea_gardurilor.mjs"
test -f "${TEMP_PLUGIN}/Hook UserPromptSubmit - cand trimit prompt insereaza reminder/motor_alegere_reminder_de_inserat.mjs"

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
  echo "sursa_instalarii=refs/heads/${CI_PASSED_BRANCH}"
  echo "instalare=${NEW_PLUGIN}"
} > "${DIAGNOSTIC_FILE}"

echo "[YL-GUARD setup] OK"
echo "[YL-GUARD setup] commit cu CI PASS: ${INSTALLED_COMMIT}"
echo "[YL-GUARD setup] nou: ${NEW_PLUGIN}"
echo "[YL-GUARD setup] vechi eliminat: ${OLD_PLUGIN}"
echo "[YL-GUARD setup] diagnostic: ${DIAGNOSTIC_FILE}"
