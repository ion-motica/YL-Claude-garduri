# TASKS — YL-Claude-garduri

- [x] 1. Definitivare sursa de adevar pentru fisiere protejate si exceptii
- [x] 2. Hook UserPromptSubmit — ciocanitoare de remindere dupa cuvinte-cheie/context
  - [x] program principal: `Hook UserPromptSubmit/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs`
  - [x] motor selectie: `Hook UserPromptSubmit/motor_alegere_reminder_de_inserat.mjs`
  - [x] validare sintaxa pentru cele doua fisiere din `1 Sursa adevar` + anuntarea utilizatorului daca exista erori
  - [x] injectarea efectiva a regulilor permanente si a reminderelor conditionale
  - [x] cautare triggere in promptul curent + ultimul mesaj Claude
  - [x] afisare sub hook a statusului validatorului si a textelor injectate
  - [x] semnalare explicita in Claude Code notice: hook -> program -> actiune, iar la final componenta + loc instalare + „functioneaza aici”
  - [x] verificare end-to-end in Claude Code Web: prompt `CP` -> trigger detectat + reminder CP injectat + Claude Code notice vizibil
- [ ] 3. Handler PreToolUse — blocare editare fisiere/foldere protejate
- [ ] 4. Verificare dupa modificarea fisierelor — detectare abatere dupa editare
- [ ] 5. PostToolUseFailure — o singura „ciocanitoare” dupa bateria de teste cu FAIL
- [ ] 6. TaskCompleted — verificare semantica per subtask
- [ ] 7. Stop — verificare semantica globala dupa toate taskurile
- [ ] 8. GitHub PR check — verificare independenta a fisierelor modificate
- [ ] 9. Integrarea gardurilor in Claude Code Web / YouLearn
  - [x] structura compatibila cu `@skills-dir`
  - [x] script de Cloud Environment setup pentru instalarea `yl-claude-garduri` si eliminarea vechiului `personal-reminders`
  - [x] instalare efectiva in Cloud Environment `Default`
  - [x] confirmare `yl-claude-garduri@skills-dir` = loaded
  - [x] confirmare end-to-end: prompt `CP` -> noul Claude Code notice + reminder injectat
  - [ ] dupa confirmare, eliminarea mufei marketplace redundante din `yl/.claude/settings.json`
- [ ] 10. Teste end-to-end pentru toate gardurile

## Directive transversale

1. Orice componenta facuta de noi care ruleaza efectiv in Claude trebuie sa isi semnaleze prezenta in `Claude Code notice`.
2. `Claude Code notice` spune mai intai ce hook a declansat ce program si ce actiune a facut; la final arata componenta tehnica, locul real din care ruleaza si faptul ca functioneaza aici.
3. Pentru numele alese de noi, prefera denumiri lungi, ne-generice si auto-explicative: categoria obiectului + rolul lui concret. Numele tehnice impuse de Claude Code raman neschimbate.
4. `1 Sursa adevar/daca_detecteza_cuvinte_in_prompt_atunci_insereaza_asta.txt` ramane cu aceasta denumire.

Sursa: `1 Sursa adevar/directiva-generala-claude-notice.txt`.
