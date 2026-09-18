#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  asiguraListeEfectiveDeEditare,
  caleRelativaLaRepository,
  citesteListaGenerata,
  gasesteRootRepository,
  gasesteRootRepositoryPentruTinta,
  verdictPentruCale,
} from "./motor_calculeaza_liste_efective_de_fisiere_permise_si_interzise.mjs";
import {
  CALE_LOG_ACTIVITATE_HOOKS,
  scrieLogActivitateHook,
} from "../shared/program_scrie_log_activitate_hooks.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SURSA_PROTECTIE = path.join(ROOT, "1 Sursa adevar", "blocheazaEditareFisiereSiExceptii.txt");
const FOLDER_HOOK = "Hook PreToolUse - inainte sa modifice Claude un fisier verifica daca e protejat si opreste modificarea";

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

function ccnScurt(actiune) {
  return `${FOLDER_HOOK} a facut ${actiune}.`;
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
      systemMessage: ccnScurt("verificarea si a blocat modificarea deoarece calea fisierului lipseste"),
      reason,
    });
  }

  let rootSesiune;
  let rootTinta;
  try {
    rootSesiune = gasesteRootRepository(input.cwd);
    rootTinta = gasesteRootRepositoryPentruTinta(caleAbsoluta);
  } catch (error) {
    const reason = [
      "Nu pot verifica sigur repository-ul pentru aceasta modificare.",
      `Problema concreta: ${error.message}`,
      "Din siguranta, nu modifica fisierul prin acest apel.",
    ].join("\n");
    return outputDeny({
      systemMessage: ccnScurt("verificarea si a blocat modificarea deoarece repository-ul tintei nu poate fi identificat sigur"),
      reason,
    });
  }

  if (path.resolve(rootTinta) !== path.resolve(rootSesiune)) {
    return {
      systemMessage: ccnScurt("verificarea si a permis modificarea intr-un alt repository Git"),
    };
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
        systemMessage: ccnScurt("verificarea si a blocat modificarea deoarece regulile de protectie nu pot fi citite"),
        reason,
      });
    }
  }

  const rezultat = asiguraListeEfectiveDeEditare({
    cwd: rootSesiune,
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
      systemMessage: ccnScurt("verificarea si a blocat modificarea deoarece protectiile nu pot fi verificate"),
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
      systemMessage: ccnScurt("verificarea si a blocat modificarea deoarece tinta nu poate fi raportata sigur la repository"),
      reason,
    });
  }

  const permise = new Set(citesteListaGenerata(rezultat.fisierPermise));
  const interzise = new Set(citesteListaGenerata(rezultat.fisierInterzise));
  let estePermis = permise.has(tinta);
  let esteInterzis = interzise.has(tinta);

  if (!estePermis && !esteInterzis) {
    const verdict = verdictPentruCale(tinta, rezultat.config);
    estePermis = verdict === "permis";
    esteInterzis = verdict === "interzis";
  }

  if (estePermis && !esteInterzis) {
    return {
      systemMessage: ccnScurt(`verificarea si a permis modificarea ${tinta}`),
    };
  }

  const reason = mesajPentruClaudeCandFisierulEsteInterzis({
    tinta,
    interzise: [...interzise],
    fisierInterzise: rezultat.fisierInterzise,
  });
  return outputDeny({
    systemMessage: ccnScurt(`verificarea si a blocat modificarea ${tinta}`),
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
  const target = input?.tool_input?.file_path || "(cale lipsa)";
  const decision = output?.hookSpecificOutput?.permissionDecision || "fara deny";
  const reason = output?.hookSpecificOutput?.permissionDecisionReason || "";
  const additionalContext = output?.hookSpecificOutput?.additionalContext || "";

  if (Object.keys(output).length > 0) {
    try {
      scrieLogActivitateHook({
        sessionId: input?.session_id,
        hookEvent: "PreToolUse",
        repositoryRoot: input?.cwd,
        folderHookRepo: FOLDER_HOOK,
        toolName: input?.tool_name || "",
        targetPath: target,
        permissionDecision: decision,
        activitate: decision === "deny"
          ? `a blocat apelul ${input?.tool_name || "tool"} pentru ${target}`
          : `a permis continuarea apelului ${input?.tool_name || "tool"} pentru ${target}`,
        ccn: output.systemMessage || "",
        additionalContext,
        permissionDecisionReason: reason,
        alteMesajeCatreClaude: "",
        alteActivitati: [
          `tool_name: ${input?.tool_name || "(lipsa)"}`,
          `file_path: ${target}`,
          `permissionDecision: ${decision}`,
          `runtime plugin root: ${ROOT}`,
        ].join("\n"),
      });
    } catch (error) {
      output.systemMessage = `${output.systemMessage || ccnScurt("verificarea")} | ${FOLDER_HOOK} nu a putut scrie ${path.basename(CALE_LOG_ACTIVITATE_HOOKS)}.`;
    }

    process.stdout.write(`${JSON.stringify(output)}\n`);
  }
}

const esteRulatDirect = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (esteRulatDirect) await main();
