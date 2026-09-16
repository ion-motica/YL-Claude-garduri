# TASKS — YL-Claude-garduri

Documentatie de continuitate si learnings verificate:
- `2 Learnings din construirea gardurilor/README.md`
- `2 Learnings din construirea gardurilor/PLAN_CONTINUARE_GARDURI.md`

- [x] 1. Definitivare sursa de adevar pentru fisiere protejate si exceptii
- [x] 2. Hook UserPromptSubmit — ciocanitoare de remindere dupa cuvinte-cheie/context
  - [x] intrare stabila: `Hook UserPromptSubmit/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs`
  - [x] motor selectie: `Hook UserPromptSubmit/motor_alegere_reminder_de_inserat.mjs`
  - [x] portar stabil la fiecare prompt: `Hook UserPromptSubmit/program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs`
  - [x] verificare usoara a SHA-ului GitHub prin `git ls-remote`; fara fetch daca SHA-ul este identic
  - [x] la SHA diferit: fetch + diff exact + validare + update al copiei runtime
  - [x] protectie red-team: nu sterge modificari locale neasteptate; verifica origin, istoric local, fisiere critice, JSON si sintaxa `.mjs`
  - [x] bootstrap stabil: handlerul de intrare + portarul nu se autoactualizeaza peste ele insele; schimbarea lor cere instalare explicita
  - [x] detectare explicita pentru HOOKURI NOI, SKILLS NOI si BARZAUNI/COMPONENTE NOI necunoscute
  - [x] semnalare `SESIUNE/CHAT NOU NECESAR` cand s-au schimbat componente structurale care nu pot fi considerate active sigur in chatul curent
  - [x] validare sintaxa pentru cele doua fisiere din `1 Sursa adevar`
  - [x] injectarea efectiva a regulilor permanente si a reminderelor conditionale
  - [x] cautare triggere in promptul curent + ultimul mesaj Claude
  - [x] Claude Code notice: intai `S-a inserat: ...`, apoi verificarile tehnice
  - [x] confirmare end-to-end existenta: prompt cu trigger -> reminder injectat + Claude Code notice vizibil
  - [x] bootstrap nou instalat o singura data in runtime-ul Claude Code Web; confirmat fara dependenta de `/reload-plugins`
  - [x] verificare end-to-end: schimbare TXT `test33 -> test44` -> urmatorul prompt din acelasi chat a vazut imediat versiunea noua
  - [ ] verificare end-to-end: schimbare cod simplu `.mjs` -> urmatorul prompt ruleaza codul nou
  - [ ] verificare end-to-end: adaugare hook/skill/componenta -> Notice detecteaza si anunta corect cand este necesar chat nou
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
  - [x] update complet bazat pe SHA demonstrat in acelasi chat pentru modificarile obisnuite
  - [x] calea stabila `UserPromptSubmit -> handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs` instalata si verificata in runtime
  - [ ] cand introducem prima data hookurile noi (`PreToolUse`, `PostToolUseFailure`, `TaskCompleted`, `Stop` etc.), deschidere sesiune/chat nou pentru activarea lor
  - [ ] dupa confirmare, eliminarea mufei marketplace redundante din `yl/.claude/settings.json`
- [ ] 10. Teste end-to-end pentru toate gardurile
  - [x] test unitar pentru clasificarea hookurilor/skills/barzaunilor noi
  - [x] baterie runtime actuala rulata in Claude Code: 5/5 PASS, 0 fail
  - [x] test runtime `deja_la_zi` cu commit GitHub real
  - [x] test runtime `actualizat` dupa schimbare GitHub in acelasi chat
  - [ ] extindere baterie pe fiecare gard nou

## Directive transversale

1. Orice componenta facuta de noi care ruleaza efectiv in Claude trebuie sa isi semnaleze prezenta in `Claude Code notice`.
2. Notice-ul arata intai rezultatul util (`S-a inserat: ...`), apoi verificarile tehnice; prezenta componentei ramane la final.
3. Pentru numele alese de noi, prefera denumiri lungi, ne-generice si auto-explicative: categoria obiectului + rolul lui concret. Numele tehnice impuse de Claude Code raman neschimbate.
4. `1 Sursa adevar/daca_detecteza_cuvinte_in_prompt_atunci_insereaza_asta.txt` ramane cu aceasta denumire.
5. `handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs` si `program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs` sunt bootstrap stabil: nu se sterg/redenumesca si nu se autoactualizeaza intr-un update obisnuit.
6. Portarul verifica si aparitia de hookuri, skills si componente necunoscute, nu doar modificarea fisierelor deja existente.
7. Pentru Claude Code Web remote nu folosim `/reload-plugins` ca dependenta de arhitectura; cand o componenta structurala noua nu poate fi activata sigur in sesiunea curenta, Notice-ul cere explicit sesiune/chat nou.
8. Nu transforma un blocaj local intr-un blocaj global: continua cu ce se poate continua, iar cand nu se mai poate fara input, opreste si prezinta contextul, motivul si optiunile.
9. Nu largi scope-ul tacit in reparatii si nu rezolva tacit conflicte arhitecturale.

Sursa pentru regulile de Notice: `1 Sursa adevar/directiva-generala-claude-notice.txt`.
