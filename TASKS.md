# TASKS — YL-Claude-garduri

- [x] 1. Definitivare sursa de adevar pentru fisiere protejate si exceptii
- [x] 2. Hook UserPromptSubmit — ciocanitoare de remindere dupa cuvinte-cheie/context
  - [x] program principal: `Hook UserPromptSubmit/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs`
  - [x] motor selectie: `Hook UserPromptSubmit/motor_alegere_reminder_de_inserat.mjs`
  - [x] program sincronizare la fiecare prompt: `Hook UserPromptSubmit/program_sincronizare_fisiere_sursa_adevar_din_GitHub_inainte_de_fiecare_prompt.mjs`
  - [x] sincronizare `1 Sursa adevar/blocheazaEditareFisiereSiExceptii.txt` + `1 Sursa adevar/daca_detecteza_cuvinte_in_prompt_atunci_insereaza_asta.txt` din GitHub `main` INAINTE de validare/selectie
  - [x] daca versiunea GitHub este invalida sau inaccesibila, nu suprascrie ultima copie locala valida si anunta problema in Claude Code notice/context
  - [x] validare sintaxa pentru cele doua fisiere din `1 Sursa adevar` + anuntarea utilizatorului daca exista erori
  - [x] injectarea efectiva a regulilor permanente si a reminderelor conditionale
  - [x] cautare triggere in promptul curent + ultimul mesaj Claude
  - [x] afisare sub hook a statusului sincronizarii, validatorului si textelor injectate
  - [x] semnalare explicita in Claude Code notice: hook -> program -> actiune, iar la final componenta + loc instalare + „functioneaza aici”
  - [x] verificare end-to-end existenta: prompt `CP` -> trigger detectat + reminder CP injectat + Claude Code notice vizibil
  - [ ] verificare end-to-end noua: editeaza un trigger TXT pe GitHub -> urmatorul prompt DIN ACELASI CHAT il vede fara sesiune noua
- [ ] 3. Handler PreToolUse — blocare editare fisiere/foldere protejate
- [ ] 4. Verificare dupa modificarea fisierelor — detectare abatere dupa editare
- [ ] 5. PostToolUseFailure — o singura „ciocanitoare” dupa bateria de teste cu FAIL
- [ ] 6. TaskCompleted — verificare semantica per subtask
- [ ] 7. Stop — verificare semantica globala dupa toate taskurile
- [ ] 8. GitHub PR check — verificare independenta a fisierelor modificate
- [ ] 9. Integrarea gardurilor in Claude Code Web / YouLearn
  - [x] structura compatibila cu `@skills-dir`
  - [x] Cloud Environment dedicat `YL-garduri`
  - [x] script de bootstrap pentru instalarea `yl-claude-garduri` si eliminarea vechiului `personal-reminders`
  - [x] confirmare `yl-claude-garduri@skills-dir` = loaded
  - [x] confirmare ca setup-ul Cloud Environment este cache-uit de Anthropic si NU este mecanism potrivit pentru refresh-ul regulilor TXT
  - [x] mutarea refresh-ului celor doua fisiere sursa de adevar in `UserPromptSubmit`, adica inainte de fiecare prompt
  - [ ] o singura reconstruire a cache-ului environmentului `YL-garduri` pentru a instala codul nou de sincronizare per-prompt
  - [ ] dupa confirmare, eliminarea mufei marketplace redundante din `yl/.claude/settings.json`
- [ ] 10. Teste end-to-end pentru toate gardurile
  - [x] test unitar adaugat pentru sincronizare: actualizare / deja la zi / remote invalid / refresh esuat
  - [ ] rulare test unitar intr-un mediu cu acces la repo

## Directive transversale

1. Orice componenta facuta de noi care ruleaza efectiv in Claude trebuie sa isi semnaleze prezenta in `Claude Code notice`.
2. `Claude Code notice` spune mai intai ce hook a declansat ce program si ce actiune a facut; la final arata componenta tehnica, locul real din care ruleaza si faptul ca functioneaza aici.
3. Pentru numele alese de noi, prefera denumiri lungi, ne-generice si auto-explicative: categoria obiectului + rolul lui concret. Numele tehnice impuse de Claude Code raman neschimbate.
4. `1 Sursa adevar/daca_detecteza_cuvinte_in_prompt_atunci_insereaza_asta.txt` ramane cu aceasta denumire.
5. Codul gardurilor poate fi cache-uit in Cloud Environment; cele doua fisiere TXT de configurare trebuie sincronizate separat din GitHub inainte de fiecare prompt.

Sursa: `1 Sursa adevar/directiva-generala-claude-notice.txt`.
