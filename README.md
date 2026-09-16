# YL-Claude-garduri

Garduri externe pentru Claude Code Web folosit pe YouLearn.

## Arhitectura folosita acum

In Claude Code Web, gardurile sunt instalate ca **skills-directory plugin** in:

```text
~/.claude/skills/yl-claude-garduri
```

Repo-ul contine `.claude-plugin/plugin.json` si `hooks/hooks.json`, deci Claude Code il poate incarca drept:

```text
yl-claude-garduri@skills-dir
```

Cloud Environment-ul dedicat este:

```text
YL-garduri
```

### Bootstrap-ul environmentului

`cloud-environment-setup.sh` instaleaza codul gardurilor in snapshot-ul environmentului. Setup scripturile Cloud Environment sunt cache-uite de Claude Code Web, deci NU trebuie folosite ca mecanism de refresh pentru reguli care se schimba des.

Scriptul de bootstrap:

1. cloneaza o copie noua intr-un folder temporar;
2. verifica piesele minime ale pluginului;
3. abia apoi inlocuieste instalarea `yl-claude-garduri`;
4. sterge vechiul `personal-reminders` numai dupa instalarea reusita;
5. scrie markerul diagnostic `~/.claude/skills/YL_SETUP_RULAT.txt` cu commitul instalat.

## Sincronizarea regulilor TXT la fiecare prompt

Cele doua fisiere de configurare care trebuie sa poata fi editate rapid pe GitHub sunt:

```text
1 Sursa adevar/blocheazaEditareFisiereSiExceptii.txt
1 Sursa adevar/daca_detecteza_cuvinte_in_prompt_atunci_insereaza_asta.txt
```

Ele NU depind de reconstruirea cache-ului Cloud Environment.

La fiecare `UserPromptSubmit`, inainte ca Claude sa proceseze promptul, programul:

```text
Hook UserPromptSubmit/program_sincronizare_fisiere_sursa_adevar_din_GitHub_inainte_de_fiecare_prompt.mjs
```

face urmatoarele:

1. `git fetch --depth=1 origin main` in repo-ul local al gardurilor;
2. citeste cele doua fisiere din `FETCH_HEAD`;
3. valideaza AMBELE versiuni remote inainte de a modifica fisierele locale;
4. daca sunt valide, actualizeaza numai fisierele care s-au schimbat;
5. daca GitHub nu poate fi verificat sau configuratia remote este invalida, NU suprascrie ultima copie locala valida;
6. afiseaza rezultatul sincronizarii in `Claude Code notice`;
7. abia apoi validatorul si motorul de remindere folosesc copiile locale rezultate.

Consecinta dorita:

```text
editezi TXT pe GitHub
→ trimiti urmatorul prompt, chiar in acelasi chat
→ UserPromptSubmit verifica GitHub
→ regula noua valida este folosita chiar pentru acel prompt
```

Modificarile de COD ale pluginului (handler, module JS, hooks.json etc.) raman alta categorie: ele pot necesita reconstruirea cache-ului environmentului / restartul sau reload-ul pluginului. Sincronizarea per-prompt este deliberat limitata la cele doua fisiere TXT sursa de adevar.

## Verificare dupa instalare

Intr-o sesiune Claude Code Web cu environmentul `YL-garduri`:

```bash
claude plugin list
```

Trebuie sa apara:

```text
yl-claude-garduri@skills-dir
Status: loaded
```

Apoi trimite un prompt care corespunde unui trigger din fisierul de remindere. Hookul `UserPromptSubmit` trebuie sa afiseze in **Claude Code notice**:

- programul principal si programul de sincronizare;
- statusul sincronizarii cu GitHub;
- validarea configuratiei locale folosite pentru promptul curent;
- reminderul injectat, daca exista;
- la final, componenta tehnica si locul real din care ruleaza.

## Directiva generala Claude Notice

Orice mecanism facut de noi care ruleaza efectiv in Claude — hook, plugin, skill, validator, guard, script etc. — trebuie sa isi semnaleze vizibil prezenta in `Claude Code notice`.

Sursa explicita a acestei reguli este:

```text
1 Sursa adevar/directiva-generala-claude-notice.txt
```
