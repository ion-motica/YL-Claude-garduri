# 2 Learnings din construirea gardurilor

Scopul acestui folder este sa pastreze ce am invatat factual construind gardurile pentru Claude Code Web, astfel incat sa nu redescoperim aceleasi limite si sa putem continua arhitectura coerent.

## 1. Ce este verificat factual in runtime

### 1.1 UserPromptSubmit deja incarcat poate ramane usa stabila

In chatul Claude Code Web deja deschis, `UserPromptSubmit` continua sa cheme calea pe care a incarcat-o la pornirea sesiunii.

Principiul ramane:

`hook deja inregistrat -> cale stabila -> cod actualizabil in spate`

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

Cand o schimbare necesita reincarcarea structurii de plugin, mesajul corect pentru utilizator este `SESIUNE/CHAT NOU NECESAR`.

### 1.5 Hook complet nou versus cod nou intr-un hook existent

Diferenta importanta:

- modificare de cod in spatele unui hook deja incarcat -> poate deveni activa la urmatorul prompt;
- hook complet nou, adica eveniment nou adaugat in `hooks.json` -> fisierele pot fi descarcate, dar activarea sigura cere chat/sesiune noua.

Detectorul trebuie sa anunte explicit aceasta situatie in Claude Code notice.

## 2. Conventie noua: `Hook X - cand Y fa Z`

Pentru memoria umana, numele folderului trebuie sa spuna direct:

- ce hook tehnic este;
- cand se declanseaza;
- ce actiune face.

Forma canonica:

```text
Hook X - cand Y fa Z
```

Daca acelasi hook tehnic face mai multe actiuni, preferam cate un folder separat pentru fiecare actiune, in loc sa amestecam toate responsabilitatile intr-un singur folder.

Exemplul UserPromptSubmit este acum separat astfel:

```text
Hook UserPromptSubmit - cand trimit prompt update all garduri din github/
Hook UserPromptSubmit - cand trimit prompt insereaza reminder/
```

Acestea NU sunt doua evenimente Claude diferite. Sunt doua actiuni ale aceluiasi `UserPromptSubmit`.

Claude Code pastreaza o singura intrare stabila pentru `UserPromptSubmit`; intrarea face mai intai update-ul global si apoi ruleaza actiunea de reminder.

## 3. Update-ul GitHub este infrastructura comuna tuturor gardurilor

Actiunea:

```text
Hook UserPromptSubmit - cand trimit prompt update all garduri din github/
```

nu apartine semantic reminderelor. Ea sincronizeaza intreaga infrastructura `YL-Claude-garduri` si trebuie tratata ca serviciu comun pentru toate hookurile viitoare.

Fluxul tinta:

```text
trimit prompt
-> verifica GitHub
-> daca e nevoie actualizeaza toate gardurile
-> ruleaza actiunile UserPromptSubmit
-> hookurile ulterioare din flux folosesc copia deja actualizata
```

Nu duplicam verificarea GitHub in `PreToolUse`, `PostToolUseFailure`, `TaskCompleted`, `Stop` etc. Doar daca vom descoperi factual un eveniment care poate rula relevant fara sa fi existat inainte un UserPromptSubmit, reevaluam acea exceptie.

## 4. Bootstrap stabil

In noua separare, bootstrap-ul stabil al UserPromptSubmit este in folderul de update global:

- `Hook UserPromptSubmit - cand trimit prompt update all garduri din github/handler_de_hook_UserPromptSubmit_pt_ciocanitoare.mjs`
- `Hook UserPromptSubmit - cand trimit prompt update all garduri din github/program_portar_actualizare_intreg_plugin_din_GitHub_inainte_de_fiecare_prompt.mjs`

Aceste doua fisiere NU se autoactualizeaza peste ele insele. Daca GitHub le modifica, portarul se opreste cu status `bootstrap_stabil_schimbat` si cere instalare explicita.

Motiv: updaterul nu trebuie sa-si inlocuiasca singur chiar piesele prin care se actualizeaza.

## 5. Protectii invatate prin red-team

Updaterul nu trebuie sa faca un `reset --hard` orb.

Inainte de update:

- verifica daca runtime-ul are modificari locale necomise; daca da, se opreste si nu le sterge;
- verifica daca `origin` este repo-ul asteptat;
- verifica relatia dintre commitul local si GitHub main;
- valideaza fisierele din `1 Sursa adevar` inainte de instalare;
- verifica JSON-urile critice;
- verifica sintaxa fisierelor runtime `.mjs` din versiunea GitHub inainte de instalare;
- verifica existenta pieselor critice;
- daca versiunea noua se instaleaza dar programul urmator esueaza, incearca revenirea la commitul local anterior, fara a calca peste modificari locale.

Principiul general: GitHub este sursa canonica, dar copia runtime nu se distruge tacit daca exista ceva local neasteptat.

## 6. Ce se actualizeaza automat si ce nu

### Se poate actualiza automat la urmatorul prompt

- fisierele din `1 Sursa adevar`;
- motoare si validatoare `.mjs` obisnuite;
- programe din spatele hookurilor deja active;
- alte fisiere runtime care nu sunt bootstrap-ul stabil si nu cer reinregistrare de plugin.

### Nu se autoactualizeaza intentionat

- handlerul stabil UserPromptSubmit;
- portarul de update global.

Acestea cer instalare explicita daca sunt modificate.

### Cere chat/sesiune noua pentru activare sigura

- schimbari in `hooks/hooks.json` care adauga/modifica inregistrari de hook;
- manifest/plugin/configuratii structurale pe care Claude le incarca la pornirea sesiunii;
- alte componente pe care detectorul le clasifica drept necesitand sesiune noua.

## 7. Observabilitate obligatorie

Orice componenta construita de noi care ruleaza efectiv in Claude trebuie sa-si anunte prezenta in `Claude Code notice`.

Pentru UserPromptSubmit ordinea utila este:

1. ce s-a inserat;
2. rezultatul update-ului GitHub;
3. commitul verificat;
4. modificarile detectate si eventual `SESIUNE/CHAT NOU NECESAR`;
5. validarea configuratiei;
6. numele componentelor care au rulat;
7. locatia runtime si `functioneaza aici`.

Nu trebuie sa cerem utilizatorului sa retina limite tehnice care pot fi detectate automat.

## 8. Dovezi de acceptare deja obtinute

Runtime verificat manual in Claude Code Web inainte de separarea pe cele doua foldere:

- commit instalat si `git status` curat;
- `node --check` PASS pentru bootstrap;
- teste runtime: 5/5 PASS;
- test `test33`: `deja_la_zi`, commit GitHub real, regula corecta;
- test `test44` dupa commit nou in GitHub: `actualizat`, schimbare TXT detectata, regula noua folosita in acelasi chat.

Dupa separarea pe `update all garduri` + `insereaza reminder`, bateria si comportamentul end-to-end trebuie rerulate intr-un runtime nou. Pana atunci nu confundam validarea structurii GitHub cu validarea runtime a noii cablari.
