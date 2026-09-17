import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateProtectie } from "../Hook UserPromptSubmit - cand trimit prompt update all garduri din github/config-validator.mjs";

export const NUME_LISTA_FISIERE_PERMISE = "lista_fisiere_permise.txt";
export const NUME_LISTA_FISIERE_INTERZISE = "lista_fisiere_interzise.txt";

function stergeComentarii(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("//", i)) {
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (text.startsWith("/*", i)) {
      i += 2;
      while (i < text.length && !text.startsWith("*/", i)) i += 1;
      if (i < text.length) i += 2;
      continue;
    }
    out += text[i];
    i += 1;
  }
  return out;
}

function caleAreTraversal(cale) {
  return cale.split("/").some((segment) => segment === "..");
}

export function normalizeazaRegulaDeCale(caleRaw) {
  const initial = String(caleRaw ?? "").trim().replace(/\\/g, "/");
  const esteFolder = initial.endsWith("/");
  const faraPrefix = initial.replace(/^\.\/+/, "").replace(/\/{2,}/g, "/");
  const faraSlashFinal = faraPrefix.replace(/\/+$/, "");

  if (!faraSlashFinal) throw new Error("cale goala");
  if (faraSlashFinal.startsWith("/") || /^[A-Za-z]:\//.test(faraSlashFinal)) {
    throw new Error(`calea trebuie sa fie relativa la repository: ${initial}`);
  }
  if (caleAreTraversal(faraSlashFinal)) {
    throw new Error(`calea nu poate contine ..: ${initial}`);
  }
  if (/\r|\n/.test(faraSlashFinal)) {
    throw new Error(`calea nu poate contine rand nou: ${initial}`);
  }

  return { cale: faraSlashFinal, esteFolder };
}

export function cheieDataOraBucuresti(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}.${parts.month}.${parts.day}-${parts.hour}.${parts.minute}`;
}

function deadlineEsteActiv(deadline, now) {
  return deadline >= cheieDataOraBucuresti(now);
}

function reguliDinCorp(body) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizeazaRegulaDeCale);
}

export function parseazaReguliProtectie(raw, { now = new Date() } = {}) {
  const eroriValidator = validateProtectie(raw);
  if (eroriValidator.length > 0) {
    return { ok: false, erori: eroriValidator };
  }

  try {
    const text = stergeComentarii(raw);
    const protejate = [];
    const exceptiiActive = [];
    let totRepositoryPermis = false;
    const regex = /(blocheazaEditareFisiereSiFoldere|permiteEditarePanaLa|permiteEditareTOT_REPOSITORYPanaLa)\s*(?:\(\s*(\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2})\s+Europe\/Bucharest\s*\))?\s*\{([\s\S]*?)\}/g;

    for (const match of text.matchAll(regex)) {
      const [, tip, deadline, body] = match;
      if (tip === "blocheazaEditareFisiereSiFoldere") {
        protejate.push(...reguliDinCorp(body));
        continue;
      }

      if (tip === "permiteEditarePanaLa") {
        if (deadlineEsteActiv(deadline, now)) {
          exceptiiActive.push(...reguliDinCorp(body));
        }
        continue;
      }

      if (tip === "permiteEditareTOT_REPOSITORYPanaLa") {
        if (reguliDinCorp(body).length > 0) {
          throw new Error("blocul permiteEditareTOT_REPOSITORYPanaLa trebuie sa fie gol");
        }
        if (deadlineEsteActiv(deadline, now)) totRepositoryPermis = true;
      }
    }

    return { ok: true, protejate, exceptiiActive, totRepositoryPermis, erori: [] };
  } catch (error) {
    return {
      ok: false,
      erori: [{
        file: "blocheazaEditareFisiereSiExceptii.txt",
        line: 1,
        message: error.message,
      }],
    };
  }
}

export function regulaAcoperaCalea(regula, caleRelativa) {
  if (regula.esteFolder) {
    return caleRelativa === regula.cale || caleRelativa.startsWith(`${regula.cale}/`);
  }
  return caleRelativa === regula.cale;
}

export function verdictPentruCale(caleRelativa, config) {
  if (config.totRepositoryPermis) return "permis";
  const esteProtejata = config.protejate.some((regula) => regulaAcoperaCalea(regula, caleRelativa));
  if (!esteProtejata) return "permis";
  const areExceptie = config.exceptiiActive.some((regula) => regulaAcoperaCalea(regula, caleRelativa));
  return areExceptie ? "permis" : "interzis";
}

export function gasesteRootRepository(cwd) {
  return execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function listeazaFisiereRepository(root) {
  const raw = execFileSync("git", ["-C", root, "ls-files", "-co", "--exclude-standard", "-z"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return raw.split("\0").filter(Boolean).map((cale) => cale.replace(/\\/g, "/"));
}

function caleRelativaLaRepository(root, caleAbsoluta) {
  const relativa = path.relative(root, caleAbsoluta).replace(/\\/g, "/");
  if (!relativa || relativa === ".") throw new Error("calea tinta nu este un fisier din repository");
  if (relativa === ".." || relativa.startsWith("../") || path.isAbsolute(relativa)) {
    throw new Error("calea tinta este in afara repository-ului curent");
  }
  return normalizeazaRegulaDeCale(relativa).cale;
}

function directorListe(sessionId) {
  const id = String(sessionId || "fara-sesiune").replace(/[^A-Za-z0-9._-]/g, "_");
  return path.join(os.tmpdir(), "yl-claude-garduri", id, "permisiuni-editare");
}

function scrieLista(filePath, valori) {
  writeFileSync(filePath, valori.length ? `${valori.join("\n")}\n` : "", "utf8");
}

function stergeListeVechi(dir) {
  rmSync(path.join(dir, NUME_LISTA_FISIERE_PERMISE), { force: true });
  rmSync(path.join(dir, NUME_LISTA_FISIERE_INTERZISE), { force: true });
}

export function genereazaListeEfectiveDeEditare({
  cwd,
  caleCerutaAbsoluta,
  rawProtectie,
  sessionId,
  now = new Date(),
}) {
  const dir = directorListe(sessionId);
  mkdirSync(dir, { recursive: true });
  stergeListeVechi(dir);

  const config = parseazaReguliProtectie(rawProtectie, { now });
  if (!config.ok) {
    return { ok: false, tip: "config_invalid", erori: config.erori, directorListe: dir };
  }

  try {
    const root = gasesteRootRepository(cwd);
    const tinta = caleRelativaLaRepository(root, caleCerutaAbsoluta);
    const univers = new Set(listeazaFisiereRepository(root));
    univers.add(tinta);
    for (const regula of config.protejate) {
      if (!regula.esteFolder) univers.add(regula.cale);
    }
    for (const regula of config.exceptiiActive) {
      if (!regula.esteFolder) univers.add(regula.cale);
    }

    const permise = [];
    const interzise = [];
    for (const cale of [...univers].sort((a, b) => a.localeCompare(b))) {
      if (/\r|\n/.test(cale)) {
        throw new Error(`repository-ul contine o cale cu rand nou, care nu poate fi reprezentata sigur in liste: ${JSON.stringify(cale)}`);
      }
      if (verdictPentruCale(cale, config) === "permis") permise.push(cale);
      else interzise.push(cale);
    }

    const fisierPermise = path.join(dir, NUME_LISTA_FISIERE_PERMISE);
    const fisierInterzise = path.join(dir, NUME_LISTA_FISIERE_INTERZISE);
    scrieLista(fisierPermise, permise);
    scrieLista(fisierInterzise, interzise);

    return {
      ok: true,
      root,
      tinta,
      config,
      permise,
      interzise,
      fisierPermise,
      fisierInterzise,
      directorListe: dir,
    };
  } catch (error) {
    return {
      ok: false,
      tip: "nu_pot_calcula_listele",
      erori: [{ file: "repository", line: 1, message: error.message }],
      directorListe: dir,
    };
  }
}
