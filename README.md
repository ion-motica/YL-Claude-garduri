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

## Conventie de organizare a hookurilor

Folderele controlate de noi folosesc forma:

```text
Hook X - cand Y fa Z
```

Daca acelasi hook tehnic face mai multe actiuni, actiunile pot avea foldere separate. Claude Code pastreaza o singura intrare stabila pentru eveniment, iar acea intrare cheama actiunile in ordinea stabilita.

Pentru `UserPromptSubmit` avem acum doua actiuni separate:

```text
Hook UserPromptSubmit - cand trimit prompt update all garduri din github/
Hook UserPromptSubmit - cand trimit prompt insereaza reminder/
```

Prima este infrastructura globala de sincronizare si deserveste toate gardurile. A doua contine logica specifica reminderelor.

## Update global al gardurilor

`UserPromptSubmit` intra prin:

```text
Hook UserPromptSubmit - cand trimit prompt update all garduri din github/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs
```

La fiecare prompt, portarul:

1. verifica SHA-ul `origin/main` prin `git ls-remote`;
2. daca SHA-ul remote este identic cu HEAD local, nu face fetch;
3. daca SHA-ul difera, face fetch;
4. compara exact fisierele schimbate;
5. valideaza piesele critice si fisierele din `1 Sursa adevar`;
6. actualizeaza intreaga copie locala a pluginului;
7. detecteaza componente structurale noi/modificate;
8. dupa update ruleaza actiunea separata de inserare a reminderelor.

Consecinta:

```text
modifici reguli sau cod obisnuit in YL-Claude-garduri/main
→ trimiti urmatorul prompt
→ portarul verifica si, daca este cazul, actualizeaza toate gardurile
→ actiunile din spatele hookurilor deja active folosesc copia noua
```

Handlerul de intrare si portarul sunt bootstrap stabil si nu se autoactualizeaza peste ele insele.

## Cand este necesar chat nou

Daca se schimba `hooks/hooks.json` sau apare o componenta structurala care trebuie incarcata de Claude Code la pornirea sesiunii, Notice-ul trebuie sa spuna explicit:

```text
SESIUNE/CHAT NOU NECESAR
```

Nu folosim `/reload-plugins` ca dependenta de arhitectura in Claude Code Web remote.

## Claude Code notice

Notice-ul incepe cu rezultatul util:

```text
S-a inserat: CP=<...> ; crc=<...>
```

sau:

```text
S-a inserat: nimic.
```

Abia dupa aceea apar verificarile tehnice: status update GitHub, commit verificat, schimbari detectate, validatorul si prezenta componentei.

Sursa explicita a regulii de afisare este:

```text
1 Sursa adevar/directiva-generala-claude-notice.txt
```
