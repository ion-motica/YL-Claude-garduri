# PreToolUse - protectie editare fisiere

## Scop

Acest gard ruleaza inainte de modificarile directe facute prin tool-urile `Edit` si `Write`.

Principiul este: gardul opreste modificarea concreta a fisierului protejat, nu intregul task.

Daca o modificare este oprita, Claude trebuie:

- sa caute mai intai o cale fezabila si necomplicata care respecta protectiile;
- sa nu reincerce aceeasi modificare si sa nu ocoleasca gardul prin alt tool;
- daca nu exista o cale rezonabila, sa justifice concret necesitatea modificarii fisierului/functiei protejate;
- sa continue intre timp subtaskurile independente;
- sa grupeze deciziile care necesita utilizatorul, fara sa transforme un blocaj local intr-un blocaj global.

## Sursa de adevar si listele efective

Sursa de adevar ramane:

`1 Sursa adevar/blocheazaEditareFisiereSiExceptii.txt`

Regulile, exceptiile temporare, folderele recursive si exceptia pentru tot repository-ul sunt interpretate de motor. Claude si hookul consuma apoi doua liste finale, fara sa fie nevoie sa rationeze asupra DSL-ului:

- `lista_fisiere_permise.txt`
- `lista_fisiere_interzise.txt`

Listele sunt generate in director temporar, in afara checkout-ului pluginului, ca sa nu murdareasca repository-ul runtime al gardurilor si sa nu blocheze updaterul GitHub.

Verdictul pentru o modificare este permis numai daca fisierul apare in lista permisa si nu apare in lista interzisa.

## Fail closed

Daca sursa de adevar lipseste, nu poate fi citita, are sintaxa invalida, este ambigua sau listele nu pot fi calculate sigur, modificarea concreta este oprita.

Mesajul catre utilizator trebuie sa fie in limbaj firesc si sa spuna obiectul concret, problema concreta si consecinta. Codurile interne nu sunt suficiente ca mesaj pentru utilizator.

## Limita V1

V1 este inregistrat pe `PreToolUse` cu matcher `Edit|Write`.

Acesta nu pretinde ca blocheaza toate caile posibile de modificare a fisierelor. Comenzi Bash/PowerShell, scripturi sau procese externe pot necesita un strat separat de detectie/audit. Aceasta limita este cunoscuta si nu trebuie ascunsa.

## Activare

Adaugarea evenimentului `PreToolUse` in `hooks/hooks.json` este o schimbare structurala de plugin. Fisierele pot exista in GitHub, dar activarea sigura in Claude Code Web cere instalarea/rebuild-ul environmentului si un chat/sesiune noua.
