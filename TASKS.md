# TASKS — YL-Claude-garduri

Documentatie de continuitate si learnings verificate:
- `2 Learnings din construirea gardurilor/README.md`
- `2 Learnings din construirea gardurilor/PLAN_CONTINUARE_GARDURI.md`
- `2 Learnings din construirea gardurilor/CI_GITHUB_ACTIONS_TESTE_AUTOMATE.md`

- [x] 1. Definitivare sursa de adevar pentru fisiere protejate si exceptii
- [x] 2. Hook UserPromptSubmit — infrastructura + remindere
  - [x] separare pe actiuni in foldere de forma `Hook X - cand Y fa Z`
  - [x] actiune globala de update: `Hook UserPromptSubmit - cand trimit prompt update all garduri din github/`
  - [x] actiune reminder: `Hook UserPromptSubmit - cand trimit prompt insereaza reminder/`
  - [x] intrare stabila UserPromptSubmit in folderul de update global
  - [x] motor selectie remindere ramas separat in folderul de reminder
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
  - [x] gate CI implementat: inainte de update, `main` trebuie sa fie identic cu reperul `ci-passed`
  - [ ] activare runtime a gate-ului CI prin rebuild environment + chat nou
  - [ ] verificare end-to-end dupa separare: noua structura update-global + reminder ruleaza corect intr-un chat nou
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
  - [x] bootstrap pregatit sa cloneze doar `ci-passed`, nu ultimul `main` netestat
  - [ ] rebuild environment dupa introducerea gate-ului CI si confirmare runtime
  - [ ] instalare/rebuild dupa separarea folderelor UserPromptSubmit si confirmare runtime
  - [ ] cand introducem prima data hookurile noi (`PreToolUse`, `PostToolUseFailure`, `TaskCompleted`, `Stop` etc.), deschidere sesiune/chat nou pentru activarea lor
  - [ ] dupa confirmare, eliminarea mufei marketplace redundante din `yl/.claude/settings.json`
- [ ] 10. Teste end-to-end pentru toate gardurile
  - [x] test unitar pentru clasificarea hookurilor/skills/barzaunilor noi
  - [x] baterie runtime anterioara rulata in Claude Code: 5/5 PASS, 0 fail
  - [x] test runtime `deja_la_zi` cu commit GitHub real
  - [x] test runtime `actualizat` dupa schimbare GitHub in acelasi chat
  - [x] GitHub Actions ruleaza automat sintaxa + toate `tests/*.test.mjs` la push/PR
  - [x] GitHub Actions dupa PASS muta reperul `refs/heads/ci-passed` la commitul testat
  - [x] test automat pentru logica `main == ci-passed` / `main != ci-passed` / reper lipsa
  - [x] bateria GitHub Actions dupa separarea folderelor a avut PASS
  - [ ] test end-to-end al gate-ului CI in Claude Code Web
  - [ ] extindere baterie pe fiecare gard nou

## Directive transversale

1. Orice componenta facuta de noi care ruleaza efectiv in Claude trebuie sa isi semnaleze prezenta in `Claude Code notice`.
2. Notice-ul arata intai rezultatul util (`S-a inserat: ...`), apoi verificarile tehnice; prezenta componentei ramane la final.
3. Folderele pentru actiunile hookurilor folosesc conventia `Hook X - cand Y fa Z`.
4. Daca acelasi hook tehnic face mai multe actiuni, preferam foldere separate pentru actiuni, chemate printr-o singura intrare stabila a hookului.
5. `1 Sursa adevar/daca_detecteza_cuvinte_in_prompt_atunci_insereaza_asta.txt` ramane cu aceasta denumire.
6. Handlerul de intrare UserPromptSubmit si portarul de update sunt bootstrap stabil: nu se autoactualizeaza peste ele insele intr-un update obisnuit.
7. Portarul verifica si aparitia de hookuri, skills si componente necunoscute, nu doar modificarea fisierelor deja existente.
8. Pentru Claude Code Web remote nu folosim `/reload-plugins` ca dependenta de arhitectura; cand o componenta structurala noua nu poate fi activata sigur in sesiunea curenta, Notice-ul cere explicit sesiune/chat nou.
9. Runtime-ul nu instaleaza un `main` nou pana cand `refs/heads/ci-passed` nu indica exact acelasi commit; daca verificarea CI nu poate fi confirmata, update-ul este fail-safe blocat.
10. Nu transforma un blocaj local intr-un blocaj global: continua cu ce se poate continua, iar cand nu se mai poate fara input, opreste si prezinta contextul, motivul si optiunile.
11. Nu largi scope-ul tacit in reparatii si nu rezolva tacit conflicte arhitecturale.

Sursa pentru regulile de Notice: `1 Sursa adevar/directiva-generala-claude-notice.txt`.
