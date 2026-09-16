# YL-Claude-garduri

Garduri externe pentru Claude Code Web folosit pe YouLearn.

## Instalare

Pluginul ruleaza ca skills-directory plugin din:

```text
~/.claude/skills/yl-claude-garduri
```

si este incarcat ca:

```text
yl-claude-garduri@skills-dir
```

Cloud Environment-ul dedicat este `YL-garduri`. `cloud-environment-setup.sh` este bootstrap-ul initial; el nu este mecanismul curent de refresh la fiecare prompt.

## Portarul stabil de actualizare

`UserPromptSubmit` intra prin:

```text
Hook UserPromptSubmit - cand trimit prompt insereaza reminder/program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs
```

Calea acestui fisier este infrastructura stabila: nu trebuie stearsa sau redenumita intr-un update obisnuit.

La fiecare prompt, portarul:

1. verifica SHA-ul `origin/main` prin `git ls-remote`;
2. daca SHA-ul remote este identic cu HEAD local, nu face fetch;
3. daca SHA-ul difera, face `git fetch --depth=1 origin main`;
4. compara exact fisierele schimbate cu `git diff --name-status`;
5. valideaza piesele critice si cele doua fisiere din `1 Sursa adevar`;
6. actualizeaza intreaga copie locala a pluginului la `FETCH_HEAD`;
7. detecteaza explicit hookuri noi, skills noi si componente/foldere noi necunoscute ("barzauni");
8. lanseaza handlerul UserPromptSubmit din versiunea tocmai actualizata.

Consecinta:

```text
modifici TXT sau cod in YL-Claude-garduri/main
→ trimiti urmatorul prompt
→ daca SHA-ul s-a schimbat, portarul face fetch + update
→ handlerul nou / regulile noi sunt folosite pentru acel prompt
```

## Cand este necesar /reload-plugins

Portarul poate actualiza fisierele locale, dar Claude Code incarca anumite componente de plugin separat. Daca diff-ul atinge configuratia hookurilor sau alte componente care necesita reincarcare, Claude Code notice spune explicit:

```text
/reload-plugins NECESAR
```

Sunt detectate, intre altele:

- `hooks/` si `.claude-plugin/`;
- hookuri noi `Hook .../`;
- `skills/` si skills noi;
- `agents/`, `commands/`, MCP, LSP, monitors, output styles, themes;
- orice folder/componenta noua necunoscuta ("barzaun nou").

Modificarile obisnuite de cod ale handlerelor/motoarelor sunt actualizate pe disk si handlerul UserPromptSubmit este lansat dupa update. Pentru componentele pe care Claude Code le incarca structural, Notice-ul cere reload in loc sa pretinda ca sunt deja active.

## Claude Code notice

Notice-ul incepe cu rezultatul util:

```text
S-a inserat: CP=<...> ; crc=<...>
```

sau:

```text
S-a inserat: nimic.
```

Abia dupa aceea apar verificarile tehnice: status update GitHub, commit verificat, schimbari detectate, hookuri/skills/barzauni noi, necesitatea de reload, validatorul si prezenta componentei.

Sursa explicita a regulii de afisare este:

```text
1 Sursa adevar/directiva-generala-claude-notice.txt
```

## Verificare dupa instalare

Intr-o sesiune Claude Code Web cu environmentul `YL-garduri`:

```bash
claude plugin list
```

Trebuie sa apara `yl-claude-garduri@skills-dir` cu status loaded. La urmatorul prompt, Notice-ul trebuie sa arate si statusul portarului de actualizare.
