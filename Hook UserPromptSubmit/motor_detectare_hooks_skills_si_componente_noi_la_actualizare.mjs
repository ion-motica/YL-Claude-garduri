export function parseazaDiffNameStatus(raw) {
  const schimbari = [];
  for (const linie of String(raw || "").split(/\r?\n/)) {
    if (!linie.trim()) continue;
    const campuri = linie.split("\t");
    const statusRaw = campuri[0] || "";
    const status = statusRaw[0] || "?";
    if ((status === "R" || status === "C") && campuri.length >= 3) {
      schimbari.push({ status, statusRaw, vechi: campuri[1], path: campuri[2] });
    } else {
      schimbari.push({ status, statusRaw, vechi: null, path: campuri[1] || "" });
    }
  }
  return schimbari;
}

function incepeCu(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function categoriePentruPath(path) {
  if (incepeCu(path, "1 Sursa adevar")) return "sursa_adevar";
  if (incepeCu(path, "hooks")) return "config_hooks";
  if (path === ".claude-plugin/plugin.json" || incepeCu(path, ".claude-plugin")) return "manifest_plugin";
  if (incepeCu(path, "skills") || path === "SKILL.md") return "skill";
  if (incepeCu(path, "commands")) return "command";
  if (incepeCu(path, "agents")) return "agent";
  if (incepeCu(path, "monitors")) return "monitor";
  if (incepeCu(path, "output-styles")) return "output_style";
  if (incepeCu(path, "themes")) return "theme";
  if (path === ".mcp.json" || incepeCu(path, "mcp")) return "mcp";
  if (path === ".lsp.json" || incepeCu(path, "lsp")) return "lsp";
  if (/^Hook [^/]+(?:\/|$)/.test(path)) return "implementare_hook";
  if (incepeCu(path, "shared")) return "cod_shared";
  if (incepeCu(path, "tests")) return "teste";
  if (incepeCu(path, ".claude")) return "config_claude_aux";
  if (!path.includes("/")) return "fisier_radacina";
  return "componenta_necunoscuta";
}

function numeComponenta(path) {
  const [primul] = path.split("/");
  return primul || path;
}

export function clasificaSchimbariPlugin(schimbari, { skillsDirExistaInainte = true } = {}) {
  const categorii = new Map();
  const componenteNoi = new Set();
  const hookuriNoi = new Set();
  const skilluriNoi = new Set();
  const barzauniNoi = new Set();
  const motiveReload = new Set();

  for (const schimbare of schimbari) {
    const path = schimbare.path;
    const categorie = categoriePentruPath(path);
    if (!categorii.has(categorie)) categorii.set(categorie, []);
    categorii.get(categorie).push(schimbare);

    if (schimbare.status === "A") {
      componenteNoi.add(numeComponenta(path));
      if (categorie === "implementare_hook") hookuriNoi.add(numeComponenta(path));
      if (categorie === "skill") {
        const parti = path.split("/");
        if (parti[0] === "skills" && parti[1]) skilluriNoi.add(parti[1]);
        else skilluriNoi.add(numeComponenta(path));
      }
      if (categorie === "componenta_necunoscuta" || categorie === "fisier_radacina") {
        barzauniNoi.add(numeComponenta(path));
      }
    }

    if (["config_hooks", "manifest_plugin", "agent", "command", "mcp", "lsp", "monitor", "output_style", "theme"].includes(categorie)) {
      motiveReload.add(`${categorie}: ${path}`);
    }

    if (categorie === "skill" && schimbare.status !== "M") {
      motiveReload.add(`skill adaugat/eliminat: ${path}`);
    }
  }

  if (!skillsDirExistaInainte && schimbari.some((x) => incepeCu(x.path, "skills"))) {
    motiveReload.add("directorul skills/ a aparut pentru prima data in plugin");
  }

  const categoriiObiect = {};
  for (const [categorie, valori] of categorii) {
    categoriiObiect[categorie] = valori;
  }

  return {
    categorii: categoriiObiect,
    componenteNoi: [...componenteNoi],
    hookuriNoi: [...hookuriNoi],
    skilluriNoi: [...skilluriNoi],
    barzauniNoi: [...barzauniNoi],
    reloadNecesar: motiveReload.size > 0,
    motiveReload: [...motiveReload],
  };
}
