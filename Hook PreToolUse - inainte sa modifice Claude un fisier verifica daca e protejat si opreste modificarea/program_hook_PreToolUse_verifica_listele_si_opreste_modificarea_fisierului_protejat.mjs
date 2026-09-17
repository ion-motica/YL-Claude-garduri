#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  asiguraListeEfectiveDeEditare,
  caleRelativaLaRepository,
  citesteListaGenerata,
  NUME_LISTA_FISIERE_INTERZISE,
  NUME_LISTA_FISIERE_PERMISE,
  verdictPentruCale,
} from "./motor_calculeaza_liste_efective_de_fisiere_permise_si_interzise.mjs";
import { formatComponentPresence } from "../shared/claude-notice.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SURSA_PROTECTIE = path.join(ROOT, "1 Sursa adevar", "blocheazaEditareFisiereSiExceptii.txt");
const NUME_HOOK = "PreToolUse";
const NUME_PROGRAM = "program_hook_PreToolUse_verifica_listele_si_opreste_modificarea_fisierului_protejat.mjs";
const NUME_MOTOR = "motor_calculeaza_liste_efective_de_fisiere_permise_si_interzise.mjs";
const NUME_COMPONENTA = "yl-claude-garduri@skills-dir";

function citesteStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", () => resolve(""));
  });
}

function listaPentruMesaj(valori, fisierInterzise, limita = 80) {
  const linii = valori.slice(0, limita).map((cale) => `- ${cale}`);
  if (valori.length > limita) {
    linii.push(`- ... si inca ${valori.length - limita}; lista completa este in ${fisierInterzise}`);
  }
  return linii.length ? linii.join("\n") : "- (lista goala)";
}

function mesajErori(erori) {
  return erori
    .slice(0, 8)
    .map((eroare) => `${eroare.file}${eroare.line ? `, linia ${eroare.line}` : ""}: ${eroare.message}`)
    .join(" ; ");
}

function mesajTehnic({ rezultat, stareListe, hashSursa, generatedAt, fisierPermise, fisierInterzise }) {
  return [
    "VERIFICARE TEHNICA:",
    `Hook activ: ${NUME_HOOK}`,
    `rezultat: ${rezultat}`,
    stareListe ? `liste efective: ${stareListe}` : "",
    hashSursa ? `hash sursa reguli: ${hashSursa.slice(0, 16)}` : "",
    generatedAt ? `liste generate la: ${generatedAt}` : "",
    fisierPermise ? `${NUME_LISTA_FISIERE_PERMISE}: ${fisierPermise}` : "",
    fisierInterzise ? `${NUME_LISTA_FISIERE_INTERZISE}: ${fisierInterzise}` : "",
    `Program hook: ${NUME_PROGRAM}`,
    `Motor liste: ${NUME_MOTOR}`,
    "PREZENTA COMPONENTEI:",
    formatComponentPresence(NUME_COMPONENTA, ROOT),
  ].filter(Boolean).join("\n");
}

function mesajPentruClaudeCandFisierulEsteInterzis({ tinta, interzise, fisierInterzise }) {
  return [
    "In plan ai convenit sa nu modifici acest fisier.",
    `Fisierul pe care ai incercat sa-l modifici: ${tinta}`,
    "",
    "Uite lista de fisiere interzise acum:",
    listaPentruMesaj(interzise, fisierInterzise),
    "",
    "Cauta mai intai o cale fezabila si necomplicata de a respecta si cerinta curenta, si aceste protectii.",
    "Nu reincerca aceeasi modificare si nu ocoli protectia prin alt tool.",
    "Daca nu gasesti o cale rezonabila, justifica exact necesitatea modificarii fisierului sau functiei protejate si de ce alternativele simple nu rezolva cerinta.",
    "Daca poti continua cu alte subtaskuri care nu depind de aceasta decizie, continua cu ele.",
    "Grupeaza deciziile care trebuie luate de utilizator; nu transforma un blocaj local intr-un blocaj global.",
    "Cand nu mai poti continua fara decizia utilizatorului, spune-i vizibil, in limbaj firesc: ce subtask nu poate continua, ce fisier/functie protejata ar trebui modificata si motivul concret.",
  ].join("\n");
}

function outputDeny({ systemMessage, reason }) {
  return {
    systemMessage,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

export function proceseazaPreToolUse(input, {
  rawProtectie = null,
  now = new Date(),
} = {}) {
  if (!input || !["Edit", "Write"].includes(input.tool_name)) {
    return {};
  }

  const caleAbsoluta = input?.tool_input?.file_path;
  if (typeof caleAbsoluta !== "string" || !caleAbsoluta) {
    const reason = "Nu pot verifica sigur protectia deoarece tool-ul nu a furnizat file_path. Din siguranta, nu modifica fisierul prin acest apel.";
    return outputDeny({
      systemMessage: [
        "NU AM PERMIS MODIFICAREA: nu am primit calea fisierului si nu pot verifica sigur protectiile.",
        mesajTehnic({ rezultat: "modificare oprita deoarece lipseste calea fisierului" }),
      ].join("\n\n"),
      reason,
    });
  }

  let continutProtectie = rawProtectie;
  if (continutProtectie === null) {
    try {
      continutProtectie = readFileSync(SURSA_PROTECTIE, "utf8");
    } catch (error) {
      const reason = [
        "Nu pot verifica sigur regulile de protectie.",
        `Fisierul de reguli nu poate fi citit: ${error.message}`,
        "Din siguranta, nu modifica fisierul prin acest apel. Continua cu subtaskurile independente si cere decizia utilizatorului numai daca acest blocaj ramane necesar.",
      ].join("\n");
      return outputDeny({
        systemMessage: [
          `NU AM MODIFICAT ${caleAbsoluta}. Nu pot verifica sigur regulile de protectie deoarece fisierul de reguli nu poate fi citit.`,
          mesajTehnic({ rezultat: "modificare oprita deoarece regulile de protectie nu pot fi citite" }),
        ].join("\n\n"),
        reason,
      });
    }
  }

  const rezultat = asiguraListeEfectiveDeEditare({
    cwd: input.cwd,
    rawProtectie: continutProtectie,
    sessionId: input.session_id,
    now,
  });

  if (!rezultat.ok) {
    const problema = mesajErori(rezultat.erori || []);
    const reason = [
      "Nu pot verifica sigur regulile de protectie, deci aceasta modificare este oprita.",
      `Problema concreta: ${problema || "necunoscuta"}`,
      "Nu presupune ce ar fi trebuit sa insemne configuratia si nu ocoli protectia.",
      "Continua cu subtaskurile independente. Daca taskul chiar depinde de aceasta modificare, explica utilizatorului ce trebuie decis si de ce.",
    ].join("\n");
    return outputDeny({
      systemMessage: [
        `NU AM MODIFICAT ${caleAbsoluta}. Nu pot verifica sigur protectiile: ${problema || "configuratia nu poate fi interpretata sigur"}.`,
        "Am oprit doar aceasta modificare.",
        mesajTehnic({ rezultat: "modificare oprita deoarece protectiile nu pot fi verificate" }),
      ].join("\n\n"),
      reason,
    });
  }

  let tinta;
  try {
    tinta = caleRelativaLaRepository(rezultat.root, caleAbsoluta);
  } catch (error) {
    const reason = [
      "Nu pot verifica sigur aceasta cale fata de repository.",
      `Problema concreta: ${error.message}`,
      "Din siguranta, nu modifica fisierul prin acest apel.",
    ].join("\n");
    return outputDeny({
      systemMessage: [
        `NU AM MODIFICAT ${caleAbsoluta}. ${error.message}.`,
        mesajTehnic({
          rezultat: "modificare oprita deoarece tinta nu poate fi raportata sigur la repository",
          stareListe: rezultat.statusListe,
          hashSursa: rezultat.hashSursa,
          generatedAt: rezultat.generatedAt,
          fisierPermise: rezultat.fisierPermise,
          fisierInterzise: rezultat.fisierInterzise,
        }),
      ].join("\n\n"),
      reason,
    });
  }

  const permise = new Set(citesteListaGenerata(rezultat.fisierPermise));
  const interzise = new Set(citesteListaGenerata(rezultat.fisierInterzise));
  let estePermis = permise.has(tinta);
  let esteInterzis = interzise.has(tinta);

  // Un fisier nou nu exista inca in listele generate la prompt. In acest caz
  // aplicam verdictul aceleiasi configuratii efective, fara sa rescriem listele.
  if (!estePermis && !esteInterzis) {
    const verdict = verdictPentruCale(tinta, rezultat.config);
    estePermis = verdict === "permis";
    esteInterzis = verdict === "interzis";
  }

  if (estePermis && !esteInterzis) {
    return {
      systemMessage: [
        `VERIFICARE PROTECTIE EDITARE: ${tinta} este permis pentru modificare de starea efectiva curenta.`,
        mesajTehnic({
          rezultat: "modificarea acestui fisier este permisa",
          stareListe: rezultat.statusListe,
          hashSursa: rezultat.hashSursa,
          generatedAt: rezultat.generatedAt,
          fisierPermise: rezultat.fisierPermise,
          fisierInterzise: rezultat.fisierInterzise,
        }),
      ].join("\n\n"),
    };
  }

  const reason = mesajPentruClaudeCandFisierulEsteInterzis({
    tinta,
    interzise: [...interzise],
    fisierInterzise: rezultat.fisierInterzise,
  });
  return outputDeny({
    systemMessage: [
      `NU AM MODIFICAT ${tinta}. Fisierul este interzis de protectiile efective curente.`,
      "Claude trebuie sa caute mai intai o cale fezabila si necomplicata care respecta protectia. Daca ramane necesara o decizie, trebuie sa continue intai subtaskurile independente si apoi sa-ti prezinte grupat ce are nevoie sa decizi.",
      mesajTehnic({
        rezultat: "modificarea acestui fisier a fost oprita",
        stareListe: rezultat.statusListe,
        hashSursa: rezultat.hashSursa,
        generatedAt: rezultat.generatedAt,
        fisierPermise: rezultat.fisierPermise,
        fisierInterzise: rezultat.fisierInterzise,
      }),
    ].join("\n\n"),
    reason,
  });
}

async function main() {
  const stdinText = await citesteStdin();
  let input = {};
  try {
    input = JSON.parse(stdinText || "{}");
  } catch {
    input = {};
  }
  const output = proceseazaPreToolUse(input);
  if (Object.keys(output).length > 0) {
    process.stdout.write(`${JSON.stringify(output)}\n`);
  }
}

const esteRulatDirect = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (esteRulatDirect) await main();
