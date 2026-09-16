# TASKS — YL-Claude-garduri

- [x] 1. Definitivare sursa de adevar pentru fisiere protejate si exceptii
- [x] 2. Hook UserPromptSubmit — ciocanitoare de remindere dupa cuvinte-cheie/context
  - [x] program principal: `Hook UserPromptSubmit/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs`
  - [x] motor selectie: `Hook UserPromptSubmit/motor_alegere_reminder_de_inserat.mjs`
  - [x] portar stabil la fiecare prompt: `Hook UserPromptSubmit/program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs`
  - [x] verificare usoara a SHA-ului GitHub prin `git ls-remote`; fara fetch daca SHA-ul este identic
  - [x] la SHA diferit: fetch + diff exact + validare + update complet al pluginului local
  - [x] detectare explicita pentru HOOKURI NOI, SKILLS NOI si BARZAUNI/COMPONENTE NOI necunoscute
  - [x] semnalare `/reload-plugins NECESAR` cand s-au schimbat componente structurale ale pluginului
  - [x] validare sintaxa pentru cele doua fisiere din `1 Sursa adevar`
  - [x] injectarea efectiva a regulilor permanente si a reminderelor conditionale
  - [x] cautare triggere in promptul curent + ultimul mesaj Claude
  - [x] Claude Code notice: intai `S-a inserat: ...`, apoi verificarile tehnice
  - [x] confirmare end-to-end existenta: prompt cu trigger -> reminder injectat + Claude Code notice vizibil
  - [ ] activare o singura data a noului portar in runtime-ul Claude Code Web + `/reload-plugins`
  - [ ] verificare end-to-end: schimbare TXT -> urmatorul prompt o vede imediat
  - [ ] verificare end-to-end: schimbare cod simplu -> urmatorul prompt ruleaza codul nou
  - [ ] verificare end-to-end: adaugare hook/skill/componenta -> Notice detecteaza si cere reload cand este necesar
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
  - [x] confirmare ca setup-ul Cloud Environment este cache-uit si nu este mecanismul potrivit pentru refresh frecvent
  - [x] inlocuirea sincronizatorului TXT separat cu portarul de update complet bazat pe SHA
  - [ ] instalarea o singura data a noii configuratii `hooks/hooks.json` in runtime si `/reload-plugins`
  - [ ] dupa confirmare, eliminarea mufei marketplace redundante din `yl/.claude/settings.json`
- [ ] 10. Teste end-to-end pentru toate gardurile
  - [x] test unitar adaugat pentru clasificarea hookurilor/skills/barzaunilor noi
  - [ ] rulare teste intr-un mediu Claude Code/runtime cu acces complet la repo

## Directive transversale

1. Orice componenta facuta de noi care ruleaza efectiv in Claude trebuie sa isi semnaleze prezenta in `Claude Code notice`.
2. Notice-ul arata intai rezultatul util (`S-a inserat: ...`), apoi verificarile tehnice; prezenta componentei ramane la final.
3. Pentru numele alese de noi, prefera denumiri lungi, ne-generice si auto-explicative: categoria obiectului + rolul lui concret. Numele tehnice impuse de Claude Code raman neschimbate.
4. `1 Sursa adevar/daca_detecteza_cuvinte_in_prompt_atunci_insereaza_asta.txt` ramane cu aceasta denumire.
5. `program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs` este punct de intrare stabil si nu se sterge/redenumește intr-un update obisnuit.
6. Portarul verifica si aparitia de hookuri, skills si componente necunoscute, nu doar modificarea fisierelor deja existente.

Sursa: `1 Sursa adevar/directiva-generala-claude-notice.txt`.
