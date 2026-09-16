# CI GitHub Actions — teste automate pentru garduri

## De ce exista

Mediul ChatGPT folosit pentru administrarea repo-ului nu poate fi considerat un runner de teste de incredere: uneori nu poate clona GitHub din cauza retelei/DNS. Verdictul automat pentru codul din `YL-Claude-garduri` trebuie sa fie produs de GitHub, nu de disponibilitatea mediului ChatGPT.

## Workflow canonic

Workflow:

`/.github/workflows/teste-garduri.yml`

Se declanseaza automat la:

- push pe `main`;
- pull request catre `main`.

Jobul canonic de test se numeste:

`teste-garduri`

Ruleaza doua straturi:

1. `node --check` pentru toate fisierele `.mjs` din repo;
2. toate fisierele `tests/*.test.mjs`.

Orice eroare opreste jobul si produce FAIL.

## Reperul persistent `ci-passed`

Exista ramura tehnica:

`refs/heads/ci-passed`

Ea NU este ramura de dezvoltare si nu se editeaza manual in fluxul normal.

Dupa ce un push pe `main` termina cu PASS la jobul `teste-garduri`, al doilea job al workflow-ului, `marcheaza-ci-pass`, muta `ci-passed` exact la acel commit.

Daca testele sunt in curs sau au FAIL, `ci-passed` ramane pe ultimul commit cunoscut ca bun.

Astfel avem doua repere foarte simple pentru runtime:

```text
refs/heads/main       = ultima versiune propusa
refs/heads/ci-passed  = ultima versiune care a trecut testele
```

Un update este eligibil numai cand cele doua SHA-uri sunt identice.

## Gate-ul runtime

Intrarea stabila UserPromptSubmit verifica inainte sa porneasca portarul:

```text
main SHA == ci-passed SHA ?
```

- DA -> CI PASS confirmat; portarul poate continua verificarea si update-ul normal.
- NU -> NU se instaleaza main; se pastreaza ultima copie locala si se verifica din nou la promptul urmator.
- unul dintre repere nu poate fi citit -> fail-safe: NU se actualizeaza.

Statusurile introduse sunt:

- `ci_pass_confirmat`;
- `ci_main_neaprobat`;
- `ci_verificare_esuat`;
- `ci_runtime_local_neaprobat` pentru situatia anormala in care runtime-ul este deja pe un main care nu are marker CI PASS.

Markerul evita dependenta de GitHub Actions REST API si de rate-limituri: runtime-ul foloseste doar `git ls-remote`, mecanism deja folosit pentru verificarea SHA-ului GitHub.

## Bootstrap / environment

`cloud-environment-setup.sh` cloneaza acum ramura `ci-passed`, nu `main`.

Prin urmare si o instalare/reconstructie de environment porneste de la ultima versiune care are CI PASS, nu de la un commit main aflat eventual in curs de testare.

Atentie: schimbarea scriptului din repo nu invalideaza singura cache-ul unui Cloud Environment deja construit. Pentru activarea noului bootstrap trebuie fortata reconstruirea environmentului conform procedurii Claude Code Web deja documentate, apoi deschis chat nou.

## Dovezi obtinute inainte de gate

Primul run GitHub Actions a rulat pentru commitul:

`52effc09b6274171bfc46c498496c1615842f066`

Rezultat: `success`.

Au trecut verificarea de sintaxa pentru toate fisierele `.mjs` si toate cele 5 teste existente. Un run ulterior pentru commitul `5d40c70f4fc286dcf7ca3ebda42f82104b01d72d` a avut de asemenea `success`.

Ramura `ci-passed` a fost initializata la acest ultim commit deja verificat, inainte de introducerea gate-ului automat.

## Ce NU demonstreaza CI

GitHub Actions demonstreaza ca fisierele si testele automate sunt valide. Nu demonstreaza ca Claude Code Web a incarcat efectiv o cale noua de hook intr-un chat real.

Pentru schimbari structurale de hook/bootstrap ramane necesar testul end-to-end in Claude Code Web:

`environment reconstruit -> chat nou -> hook declansat -> Claude Code Notice observat -> comportament verificat`.
