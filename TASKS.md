# TASKS — YL-Claude-garduri

Documentatie de continuitate si learnings verificate:
- `2 Learnings din construirea gardurilor/README.md`
- `2 Learnings din construirea gardurilor/PLAN_CONTINUARE_GARDURI.md`
- `2 Learnings din construirea gardurilor/CI_GITHUB_ACTIONS_TESTE_AUTOMATE.md`
- `2 Learnings din construirea gardurilor/CCN_VS_ADDITIONAL_CONTEXT.md`

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
  - [x] gate CI implementat: inainte de update, `main` trebuie sa fie identic cu reperul `ci-passed`
  - [x] documentat factual `CCN/systemMessage` vs `additionalContext`
  - [x] politica noua: CCN foarte scurt, detaliile complete in `log activitate hooks.txt`
  - [x] UserPromptSubmit nu mai injecteaza preventiv listele PERMISE/INTERZISE in `additionalContext`
  - [ ] audit per eveniment pentru toate canalele user-facing si model-facing
  - [ ] activare runtime a gate-ului CI prin rebuild environment + chat nou
  - [ ] verificare end-to-end dupa separare: noua structura update-global + reminder ruleaza corect intr-un chat nou
  - [ ] verificare end-to-end: schimbare cod simplu `.mjs` -> urmatorul prompt ruleaza codul nou
  - [ ] verificare end-to-end: adaugare hook/skill/componenta -> Notice detecteaza si anunta corect cand este necesar chat nou
- [ ] 3. Handler PreToolUse — blocare editare fisiere/foldere protejate
  - [x] cod + teste automate pentru Edit|Write
  - [x] CCN scurt
  - [x] log complet al deciziei si al `permissionDecisionReason`
  - [ ] test live curat: primul Edit interzis trebuie sa ajunga efectiv la PreToolUse si sa fie blocat
- [ ] 4. Verificare dupa modificarea fisierelor — detectare abatere dupa editare
- [ ] 5. PostToolUseFailure — o singura „ciocanitoare” dupa bateria de teste cu FAIL
- [ ] 6. TaskCompleted — verificare semantica per subtask
- [ ] 7. Stop — verificare semantica globala dupa toate taskurile
- [ ] 8. GitHub PR check — verificare independenta a fisierelor modificate
- [ ] 9. Integrarea gardurilor in Claude Code Web / YouLearn
  - [x] structura compatibila cu `@skills-dir`
  - [x] Cloud Environment dedicat `YL-garduri`
  - [x] script de bootstrap pentru instalarea `yl-claude-garduri`
  - [x] confirmare `yl-claude-garduri@skills-dir` = loaded
  - [x] update complet bazat pe SHA demonstrat in acelasi chat pentru modificarile obisnuite
  - [x] bootstrap pregatit sa cloneze doar `ci-passed`, nu ultimul `main` netestat
  - [ ] cand introducem prima data hookurile noi, deschidere sesiune/chat nou pentru activarea lor
  - [ ] dupa confirmare, eliminarea mufei marketplace redundante din `yl/.claude/settings.json`
- [ ] 10. Teste end-to-end pentru toate gardurile
  - [x] GitHub Actions ruleaza automat sintaxa + toate `tests/*.test.mjs`
  - [x] GitHub Actions dupa PASS muta reperul `refs/heads/ci-passed`
  - [x] test automat pentru logica `main == ci-passed` / `main != ci-passed` / reper lipsa
  - [x] test automat pentru formatul `log activitate hooks.txt`
  - [ ] test end-to-end al gate-ului CI in Claude Code Web
  - [ ] test explicit ca `systemMessage`, `additionalContext` si alte canale ajung unde ne asteptam pentru fiecare hook
  - [ ] test live PreToolUse cu fisier interzis + fisier permis prin exceptie
  - [ ] extindere baterie pe fiecare gard nou

## Directive transversale

1. CCN este foarte scurt: `<nume folder hook in repo> a facut X.`
2. Detaliile complete se scriu in runtime `log activitate hooks.txt`, cu newline-uri normale.
3. Logul trebuie sa contina exact ce a fost trimis in CCN, exact ce a fost trimis in `additionalContext`, alte mesaje catre Claude si alte activitati relevante.
4. Nu presupune ca CCN este identic cu contextul primit de Claude; canalele se auditeaza separat.
5. Folderele pentru actiunile hookurilor folosesc conventia `Hook X - cand Y fa Z`.
6. Daca acelasi hook tehnic face mai multe actiuni, preferam foldere separate pentru actiuni, chemate printr-o singura intrare stabila.
7. `1 Sursa adevar/daca_detecteza_cuvinte_in_prompt_atunci_insereaza_asta.txt` ramane cu aceasta denumire.
8. Handlerul de intrare UserPromptSubmit si portarul sunt bootstrap stabil si nu se autoactualizeaza peste ele insele.
9. Pentru Claude Code Web remote nu folosim `/reload-plugins` ca dependenta; cand este necesar, cerem sesiune/chat nou.
10. Runtime-ul nu instaleaza un `main` nou pana cand `refs/heads/ci-passed` nu indica exact acelasi commit.
11. Nu transforma un blocaj local intr-un blocaj global.
12. Nu largi scope-ul tacit in reparatii si nu rezolva tacit conflicte arhitecturale.
13. Listele de protectie pot fi generate/verificate la UserPromptSubmit fara a fi injectate preventiv lui Claude.

Sursa pentru regulile de Notice si logging:
`1 Sursa adevar/directiva-generala-claude-notice.txt`.
