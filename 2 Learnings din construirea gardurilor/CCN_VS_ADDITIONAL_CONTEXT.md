# CCN (Claude Code Notice) vs `additionalContext`

## Diferenta esentiala

Pentru hookurile sincrone folosite acum, in special `UserPromptSubmit` si `PreToolUse`:

- `systemMessage` = mesaj vizibil utilizatorului in Claude Code Notice. Pentru aceste hookuri sincrone, simplul fapt ca textul apare in CCN nu il introduce in contextul lui Claude.
- `hookSpecificOutput.additionalContext` = text introdus in contextul lui Claude ca system reminder. Claude il citeste, dar textul nu apare ca mesaj normal in interfata.
- la `PreToolUse` cu `permissionDecision: "deny"`, `permissionDecisionReason` este transmis lui Claude ca motiv al blocarii.

Pe scurt:

```text
CCN / systemMessage       = vede omul
additionalContext         = primeste Claude
permissionDecisionReason  = primeste Claude dupa deny
```

Programul hookului controleaza explicit aceste iesiri.

## Important: regula nu este universala pentru toate evenimentele

Documentatia Anthropic are exceptii:
- unele evenimente ignora `systemMessage`;
- unele il livreaza diferit;
- la hookuri async, `systemMessage` si `additionalContext` pot ajunge la Claude ulterior, fara afisare utilizatorului.

De aceea fiecare eveniment nou se verifica separat in documentatia curenta.

## Learning din primul test live PreToolUse

Primul test a fost contaminat: `UserPromptSubmit` injecta in `additionalContext`
existenta si caile listelor `PERMISE` / `INTERZISE` inainte ca Claude sa incerce primul `Edit`.
Claude a citit listele si s-a oprit singur, deci primul fisier interzis nu a ajuns sa testeze efectiv `PreToolUse`.

Corectia:
- UserPromptSubmit continua sa genereze/verifice listele intern;
- listele de protectie nu mai sunt injectate preventiv in `additionalContext`;
- primul semnal de blocare poate veni din `PreToolUse`.

## Regula stabilita: CCN scurt, audit complet in log

CCN nu mai este panou de debug.

Forma tinta:

```text
<nume folder hook in repo> a facut X.
```

Detaliile complete merg in fisierul runtime:

```text
/tmp/yl-claude-garduri/log activitate hooks.txt
```

Fisierul este intentionat in afara checkout-ului pluginului, ca hookurile sa poata scrie
in el fara sa faca repository-ul runtime "dirty" si fara sa blocheze updaterul GitHub.

Fiecare intrare din log trebuie sa contina:
- data/ora si sesiunea;
- hookul/folderul;
- ce a facut;
- textul exact CCN;
- textul exact `additionalContext`;
- alte mesaje catre Claude, inclusiv `permissionDecisionReason`;
- alte activitati tehnice relevante.

In log se pastreaza newline-uri normale; nu se compacteaza totul cu ` | `.

## Regula de audit

Nu mai acceptam un canal model-facing invizibil si neauditat.

Daca un program de hook trimite text lui Claude prin `additionalContext`,
`permissionDecisionReason` sau alt canal suportat de eveniment, acel text trebuie
sa fie inregistrat in `log activitate hooks.txt`.

CCN poate ramane foarte scurt tocmai pentru ca detaliul complet este disponibil in log.

## TODO ramas

Trebuie verificat explicit, per fiecare hook/eveniment nou:
- ce campuri ajung la user;
- ce campuri ajung la Claude;
- ce campuri sunt ignorate;
- diferentele pentru hookuri async.

Nu presupunem mecanic aceeasi semantica pentru toate evenimentele.

## Sursa verificata

Anthropic Claude Code Hooks Reference:
- `systemMessage`: warning/message pentru utilizator in schema generala, cu exceptii per eveniment;
- `additionalContext`: text introdus in contextul lui Claude;
- `permissionDecisionReason` la `PreToolUse deny`: motivul este aratat lui Claude;
- comportamentul exact poate diferi per eveniment si mod sync/async.
