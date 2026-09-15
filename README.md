# YL-Claude-garduri

Garduri externe pentru Claude Code Web folosit pe YouLearn.

## Arhitectura de instalare folosita acum

In Claude Code Web, gardurile sunt instalate ca **skills-directory plugin** in:

```text
~/.claude/skills/yl-claude-garduri
```

Repo-ul contine deja `.claude-plugin/plugin.json` si `hooks/hooks.json`, deci Claude Code il poate incarca drept:

```text
yl-claude-garduri@skills-dir
```

Pentru instalarea intr-un Cloud Environment folosim `cloud-environment-setup.sh`.
Scriptul:

1. cloneaza mai intai o copie noua intr-un folder temporar;
2. verifica piesele minime ale pluginului;
3. abia apoi inlocuieste instalarea `yl-claude-garduri`;
4. sterge vechiul `personal-reminders` numai dupa instalarea reusita a noului gard.

Marketplace-ul nu este calea critica pentru instalarea Web curenta.

## Verificare dupa instalare

Intr-o sesiune noua Claude Code Web:

```bash
claude plugin list
```

Trebuie sa apara:

```text
yl-claude-garduri@skills-dir
Status: loaded
```

si sa nu mai apara `personal-reminders@skills-dir`.

Apoi trimite promptul:

```text
CP
```

Hookul `UserPromptSubmit` trebuie sa afiseze sub prompt, in **Claude Code notice**, prezenta sa, locul real din care ruleaza, validarea configuratiei si reminderul injectat.

## Directiva generala Claude Notice

Orice mecanism facut de noi care ruleaza efectiv in Claude — hook, plugin, skill, validator, guard, script etc. — trebuie sa isi semnaleze vizibil prezenta in `Claude Code notice`.

Format minim:

```text
<Numele componentei>,
instalat in <locul real din care ruleaza>
functioneaza aici.
```

Daca mecanismul executa ceva in acel moment, notice-ul trebuie sa arate si rezultatul relevant.

Sursa explicita a acestei reguli este:

```text
1 Sursa adevar/directiva-generala-claude-notice.txt
```
