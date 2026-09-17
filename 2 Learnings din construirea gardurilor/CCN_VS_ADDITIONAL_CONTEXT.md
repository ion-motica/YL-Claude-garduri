# CCN (Claude Code Notice) vs `additionalContext`

## Diferenta esentiala

Pentru hookurile sincrone pe care le folosim acum, in special `UserPromptSubmit`:

- `systemMessage` = mesaj pentru utilizator; apare ca Claude Code Notice / avertizare vizibila. Nu este introdus in contextul lui Claude doar pentru ca apare in Notice.
- `hookSpecificOutput.additionalContext` = text introdus in contextul lui Claude ca system reminder. Claude il citeste la urmatorul model request, dar textul nu apare ca mesaj in interfata / CCN.

Pe scurt:

```text
CCN / systemMessage = vede omul
additionalContext   = primeste Claude
```

Ambele sunt controlate explicit de programul hookului: codul nostru decide daca le emite si ce text contin.

## Ce il influenteaza pe Claude

In `UserPromptSubmit` sincron, continutul din CCN (`systemMessage`) este pentru utilizator. Pentru a transmite informatie/instructiuni lui Claude folosim `additionalContext`.

La `PreToolUse`, daca hookul blocheaza un tool, `permissionDecisionReason` este transmis lui Claude ca motiv al blocarii; acesta este un alt canal care poate influenta comportamentul lui Claude dupa deny.

## Exceptii importante: nu generaliza mecanic

Comportamentul `systemMessage` este dependent de eveniment si de modul de rulare. Documentatia Anthropic precizeaza exceptii, de exemplu:

- unele evenimente ignora `systemMessage`;
- unele evenimente il livreaza diferit;
- pentru hookuri async, dupa terminare, atat `additionalContext`, cat si `systemMessage` pot fi livrate lui Claude la urmatorul turn, iar niciunul nu este afisat utilizatorului.

De aceea, pentru fiecare hook nou trebuie verificata schema exacta a evenimentului, nu presupusa o regula universala.

## Learning din testul PreToolUse

Primul test live PreToolUse a fost contaminat: `UserPromptSubmit` a injectat in `additionalContext` existenta si caile listelor `PERMISE` / `INTERZISE` inainte ca Claude sa incerce primul `Edit`. Claude a consultat singur listele si s-a oprit inainte ca `PreToolUse` sa fie testat pe fisierul interzis.

Consecinta: pentru un test curat al PreToolUse, Claude nu trebuie informat inainte de primul `Edit` despre listele de protectie. UserPromptSubmit poate continua sa genereze/verifice listele intern, dar primul semnal catre Claude despre blocare trebuie sa vina din PreToolUse.

## Regula de observabilitate de analizat / stabilit

Trebuie sa definim explicit politica dintre cele doua canale:

- ce informatie poate exista doar in CCN;
- ce informatie poate intra in `additionalContext`;
- daca orice informatie/instructiune trimisa lui Claude prin `additionalContext` trebuie sa aiba obligatoriu un echivalent vizibil pentru utilizator in CCN;
- cum tratam exceptiile de test in care vrem intentionat zero informatie pentru Claude inaintea unui anumit hook.

Pana la stabilirea regulii finale, nu presupunem ca "ce vede utilizatorul in CCN" este identic cu "ce a primit Claude".

## Sursa verificata

Anthropic Claude Code hooks reference:
- `systemMessage`: mesaj de avertizare pentru utilizator in schema JSON generala, cu exceptii per eveniment;
- `additionalContext`: text introdus in contextul lui Claude ca system reminder, fara mesaj vizibil in interfata;
- comportamentul exact trebuie verificat per eveniment.
