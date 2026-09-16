# 2 Learnings din construirea gardurilor

Scopul acestui folder este sa pastreze ce am invatat factual construind gardurile pentru Claude Code Web, astfel incat sa nu redescoperim aceleasi limite si sa putem continua arhitectura coerent.

## 1. Ce este verificat factual in runtime

### 1.1 UserPromptSubmit deja incarcat poate ramane usa stabila

In chatul Claude Code Web deja deschis, `UserPromptSubmit` continua sa cheme calea pe care a incarcat-o la pornirea sesiunii.

Calea stabila folosita acum este:

`Hook UserPromptSubmit/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs`

Consecinta: nu trebuie sa schimbam `hooks.json` pentru actualizarile obisnuite. Pastram aceeasi usa, iar codul din spatele ei se poate actualiza.

### 1.2 Update-ul din GitHub functioneaza in acelasi chat

A fost verificat end-to-end in acelasi chat Claude Code Web:

- local avea regula `test33`;
- GitHub a fost schimbat la `test44` si s-a dat commit;
- la urmatorul prompt `test44`, portarul a vazut SHA GitHub nou;
- a facut update;
- Notice-ul a raportat `rezultat: actualizat`;
- regula noua `test44` a fost folosita chiar la acel prompt.

Deci pentru modificarile obisnuite:

GitHub commit -> urmatorul prompt -> detectie SHA -> validare -> update local -> ruleaza codul/regulile noi.

### 1.3 Daca GitHub nu s-a schimbat, nu face fetch inutil

Portarul foloseste intai `git ls-remote` pentru SHA-ul `main`.

Daca SHA local = SHA GitHub si copia runtime este curata:

- status `deja_la_zi`;
- nu face fetch;
- continua cu codul local existent.

### 1.4 `/reload-plugins` nu este disponibil in sesiunea remote folosita de noi

Nu construim arhitectura pe presupunerea ca `/reload-plugins` este disponibil in Claude Code Web remote.

Cand o schimbare necesita reincarcarea structurii de plugin, mesajul corect pentru utilizator este `SESIUNE/CHAT NOU NECESAR`, nu instructiunea de a folosi `/reload-plugins`.

### 1.5 Hook complet nou versus cod nou intr-un hook existent

Diferenta importanta:

- modificare de cod in spatele unei usi/hook deja incarcate -> poate deveni activa la urmatorul prompt;
- hook complet nou, adica un eveniment nou adaugat in `hooks.json` -> fisierele pot fi descarcate, dar sesiunea curenta nu poate fi considerata sigur activata pentru acel hook; trebuie chat/sesiune noua.

Detectorul trebuie sa anunte explicit aceasta situatie in Claude Code notice.

## 2. Regula de arhitectura: priza stabila, cod schimbabil in spate

Principiul de baza pentru Claude Code Web:

`hook deja inregistrat -> cale stabila -> cod actualizabil in spate`

Nu schimbam inutil calea pe care Claude o cunoaste deja.

Pentru `UserPromptSubmit`, doua piese sunt tratate ca bootstrap stabil:

- `Hook UserPromptSubmit/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs`
- `Hook UserPromptSubmit/program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs`

Aceste doua fisiere NU se autoactualizeaza peste ele insele. Daca GitHub le modifica, portarul se opreste cu status `bootstrap_stabil_schimbat` si cere instalare explicita.

Motiv: updaterul nu trebuie sa-si inlocuiasca singur chiar piesele prin care se actualizeaza.

## 3. Protectii invatate prin red-team

Updaterul nu trebuie sa faca un `reset --hard` orb.

Inainte de update:

- verifica daca runtime-ul are modificari locale necomise; daca da, se opreste si nu le sterge;
- verifica daca `origin` este exact repo-ul asteptat;
- verifica relatia dintre commitul local si GitHub main; istoric neasteptat/force-push/commit local separat -> se opreste;
- valideaza cele doua fisiere din `1 Sursa adevar` inainte de instalare;
- verifica JSON-urile critice;
- verifica sintaxa fisierelor runtime `.mjs` din versiunea GitHub inainte de instalare;
- verifica existenta pieselor critice;
- daca versiunea noua se instaleaza dar programul de lucru esueaza, incearca revenirea la commitul local anterior, fara a calca peste modificari locale.

Principiul general: GitHub este sursa canonica, dar copia runtime nu se distruge tacit daca exista ceva local neasteptat.

## 4. Ce se actualizeaza automat si ce nu

### Se poate actualiza automat la urmatorul prompt

- fisierele din `1 Sursa adevar`;
- motoare si validatoare `.mjs` obisnuite;
- programul ciocanitoare care ruleaza dupa update;
- cod comun din spatele hookului deja activ;
- alte fisiere runtime care nu sunt bootstrap-ul stabil si nu cer reinregistrare de plugin.

### Nu se autoactualizeaza intentionat

- `handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs`;
- `program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs`.

Acestea cer instalare explicita daca sunt modificate.

### Cere chat/sesiune noua pentru activare sigura

- schimbari in `hooks/hooks.json` care adauga/modifica inregistrari de hook;
- manifest/plugin/configuratii structurale pe care Claude le incarca la pornirea sesiunii;
- alte componente pe care detectorul le clasifica drept necesitand sesiune noua.

## 5. Observabilitate obligatorie

Orice componenta construita de noi care ruleaza efectiv in Claude trebuie sa-si anunte prezenta in `Claude Code notice`.

Pentru UserPromptSubmit ordinea utila este:

1. ce s-a inserat;
2. rezultatul update-ului GitHub;
3. commitul verificat;
4. modificarile detectate si eventual `SESIUNE/CHAT NOU NECESAR`;
5. validarea configuratiei;
6. numele componentelor care au rulat;
7. locatia runtime si `functioneaza aici`.

Nu trebuie sa cerem utilizatorului sa retina limite tehnice care pot fi detectate automat. Daca apare hook nou / componenta structurala noua, Notice-ul trebuie sa spuna asta.

## 6. Dovezi de acceptare deja obtinute

Runtime verificat manual in Claude Code Web:

- commit instalat si `git status` curat;
- `node --check` PASS pentru bootstrap;
- teste runtime: 5/5 PASS;
- test `test33`: `deja_la_zi`, commit GitHub real, regula corecta;
- test `test44` dupa commit nou in GitHub: `actualizat`, schimbare TXT detectata, regula noua folosita in acelasi chat.

Aceste teste sunt referinta de regresie: nu trebuie pierdut comportamentul demonstrat aici cand extindem gardurile.

## 7. Lectie de design pentru continuare

Pentru fiecare gard nou, separa doua lucruri:

1. **priza Claude Code** — evenimentul/hookul pe care Claude trebuie sa-l aiba inregistrat;
2. **programul nostru din spatele prizei** — logica pe care o putem schimba si testa mult mai liber.

Tinta este sa avem putine prize stabile si multa logica modulara in spatele lor.

Astfel, modificarea unui gard nu trebuie sa forteze constant chat nou; chat nou ramane exceptia pentru o priza complet noua sau o schimbare structurala de plugin.
