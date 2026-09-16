# Plan de continuare — YL-Claude-garduri

Acest plan porneste de la infrastructura UserPromptSubmit deja functionala si de la limitarile verificate in Claude Code Web.

## Principiu de lucru

Pentru fiecare gard nou:

1. stabilim exact ce eveniment Claude Code il declanseaza;
2. pastram o cale de intrare stabila pentru acel eveniment;
3. mutam logica schimbabila in programe separate din spatele caii stabile;
4. fiecare componenta care ruleaza trebuie sa se vada in Claude Code notice;
5. definim testele de acceptare inainte de a considera gardul terminat;
6. nu extindem scope-ul in timpul repararii unei erori.

## Etapa urmatoare 1 — PreToolUse: blocare editare fisiere/foldere protejate

Scop: Claude sa fie oprit inainte de modificare daca tinta este protejata de `1 Sursa adevar/blocheazaEditareFisiereSiExceptii.txt` si nu exista exceptie activa.

De facut:

- introducerea hookului `PreToolUse` in `hooks/hooks.json`;
- handler cu nume lung si explicit pentru blocarea modificarilor;
- parser comun pentru protectie, astfel incat UserPromptSubmit si PreToolUse sa nu aiba reguli paralele incompatibile;
- suport pentru fisiere si foldere recursive;
- suport pentru exceptii temporare pe cai selectate;
- suport pentru `permiteEditareTOT_REPOSITORYPanaLa(...)`;
- mesaj clar in Notice: cale verificata, regula aplicata, ALLOW/DENY, fisierul sursa folosit;
- testare pentru editari directe si, separat, pentru comenzi shell capabile sa modifice fisiere.

Conditie de acceptare:

- fisier protejat fara exceptie -> editarea este blocata;
- fisier protejat cu exceptie valida -> editarea este permisa;
- fisier neprotejat -> nu este blocat de acest gard;
- expirarea exceptiei restaureaza automat blocarea.

Observatie runtime: fiind un hook nou, prima instalare cere chat/sesiune noua pentru activare. Dupa ce priza PreToolUse exista, logica din spatele ei trebuie proiectata sa poata fi actualizata fara chat nou.

## Etapa urmatoare 2 — verificare dupa modificare

Scop: chiar daca o cale de modificare a ocolit PreToolUse, verificam ce s-a schimbat efectiv.

De facut:

- hook potrivit dupa folosirea uneltelor de editare;
- comparatie intre fisierele efectiv schimbate si lista protejata;
- semnalare clara daca a fost atins ceva interzis;
- nu repara automat abaterea fara aprobarea utilizatorului;
- pregatire pentru verificarea independenta de la PR.

Conditie de acceptare:

- orice fisier protejat modificat nepermis este raportat explicit, cu cale exacta si regula incalcata.

## Etapa urmatoare 3 — PostToolUseFailure: ciocanitoarea dupa FAIL

Scop: dupa o baterie de teste care esueaza, Claude sa nu intre intr-o spirala de reparatii care uita taskul si gardurile.

Flux tinta:

`modifica -> teste -> FAIL -> reaminteste taskul + scope-ul + regulile PFM/PFE -> analizeaza -> repara -> retesteaza`

Reguli:

- o singura reinjectare dupa bateria de teste, nu spam dupa fiecare subcomanda;
- nu transforma un FAIL local intr-un refactor global;
- nu largeste scope-ul fara aprobare;
- continua independent cu ce se poate continua; se opreste doar cand inputul utilizatorului este necesar.

Conditie de acceptare:

- dupa FAIL, in Notice si context apar taskul relevant, scope-ul aprobat si regulile de protectie inainte de tentativa de reparare.

## Etapa urmatoare 4 — TaskCompleted: verificare semantica per subtask

Scop: Claude sa nu marcheze un subtask ca terminat doar pentru ca testele sunt verzi.

Verificare:

- ce cerea subtaskul aprobat;
- ce fisiere/functii s-au schimbat;
- ce teste s-au rulat;
- daca rezultatul respecta taskul mare si gardurile.

Rezultate canonice propuse:

- `COMPLET`
- `INCOMPLET`
- `DEVIAT`
- `NU POATE FI VERIFICAT`

Doar `COMPLET` permite inchiderea normala a subtaskului.

## Etapa urmatoare 5 — Stop: verificare globala

Scop: inainte de oprirea finala, verificam taskul original, nu doar ultimul subtask.

Verificari:

- toate subtaskurile au rezultat acceptabil;
- nu exista cerinte uitate din taskul mare;
- nu exista fisiere modificate in afara scope-ului;
- testele relevante sunt trecute;
- nu exista conflict lasat tacit neraportat.

Scurtatura manuala dorita: `verifica implementare task`.

## Etapa urmatoare 6 — GitHub PR guard independent

Scop: verificare externa runtime-ului Claude.

La PR:

- lista exacta a fisierelor modificate;
- comparatie cu protectiile canonice;
- fisier protejat modificat fara exceptie -> FAIL;
- raport usor de citit cu caile exacte.

Aceasta este plasa de siguranta independenta daca un hook local nu a rulat sau a fost ocolit.

## Etapa urmatoare 7 — contract pentru plan + aprobare inainte de implementare

Flux tinta pentru taskurile mari:

`clarificare task -> plan detaliat -> utilizator aproba "incepe" -> implementare pe subtasks -> teste -> verificari -> commit/PR -> guard GitHub -> testare vizuala/umana`

Planul trebuie sa contina per subtask:

- ce se modifica;
- fisiere/functii implicate;
- de ce;
- ce cai protejate sunt implicate;
- criteriul de "gata".

Dupa aprobare, sensul taskului nu se largeste tacit.

## Etapa urmatoare 8 — matricea prizelor stabile

Inainte sa adaugam mai multe garduri, documentam intr-un singur loc ce hookuri Claude Code vrem sa folosim pe termen lung.

Candidati deja stabiliti conceptual:

- `UserPromptSubmit`
- `PreToolUse`
- hook dupa modificare / folosire unealta pentru audit
- `PostToolUseFailure`
- `TaskCompleted`
- `Stop`

Scopul este sa introducem deliberat prizele necesare, apoi sa schimbam in principal codul din spatele lor, nu configuratia `hooks.json` la fiecare iteratie.

## Teste transversale obligatorii

Pentru fiecare etapa noua trebuie testate cel putin:

- happy path;
- refuz/blocare;
- configuratie invalida;
- eroare de retea unde este relevant;
- modificari locale in runtime unde este relevant;
- Notice vizibil si corect;
- persistenta comportamentului dupa update GitHub in acelasi chat, cand tipul de hook era deja incarcat;
- cazul in care este necesar chat nou si Notice-ul spune explicit asta.

## Invariante de pastrat

- `1 Sursa adevar` ramane sursa umana/canonica pentru reguli declarative.
- `daca_detecteza_cuvinte_in_prompt_atunci_insereaza_asta.txt` nu se redenumeste.
- numele fisierelor/programelor controlate de noi sunt lungi, clare si spun categoria + rolul.
- orice componenta activa isi anunta prezenta in Claude Code notice.
- nu pretindem ca o componenta noua este activa doar pentru ca fisierul ei exista pe disc.
- nu folosim `/reload-plugins` ca mecanism necesar in Claude Code Web remote.
- nu stergem tacit modificari locale neasteptate din copia runtime.
- nu rezolvam tacit conflicte de scope sau arhitectura; le raportam si cerem decizie cand este necesar.
