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

function incepeCu(p, prefix) {
  return p === prefix || p.startsWith(`${prefix}/`);
}

function categoriePentruPath(p) {
  if (incepeCu(p, "1 Sursa adevar")) return "sursa_adevar";
  if (incepeCu(p, "2 Learnings din construirea gardurilor")) return "documentatie";
  if (incepeCu(p, "hooks")) return "config_hooks";
  if (p === ".claude-plugin/plugin.json" || incepeCu(p, ".claude-plugin")) return "manifest_plugin";
  if (incepeCu(p, "skills") || p === "SKILL.md") return "skill";
  if (incepeCu(p, "commands")) return "command";
  if (incepeCu(p, "agents")) return "agent";
  if (incepeCu(p, "monitors")) return "monitor";
  if (incepeCu(p, "output-styles")) return "output_style";
  if (incepeCu(p, "themes")) return "theme";
  if (p === ".mcp.json" || incepeCu(p, "mcp")) return "mcp";
  if (p === ".lsp.json" || incepeCu(p, "lsp")) return "lsp";
  if (/^Hook [^/]+(?:\/|$)/.test(p)) return "implementare_hook";
  if (incepeCu(p, "shared")) return "cod_shared";
  if (incepeCu(p, "tests")) return "teste";
  if (incepeCu(p, ".claude")) return "config_claude_aux";
  if (!p.includes("/")) return "fisier_radacina";
  return "componenta_necunoscuta";
}

function numeComponenta(p) {
  const [primul] = p.split("/");
  return primul || p;
}

export function clasificaSchimbariPlugin(schimbari, { skillsDirExistaInainte = true } = {}) {
  const categorii = new Map();
  const componenteNoi = new Set();
  const hookuriNoi = new Set();
  const skilluriNoi = new Set();
  const barzauniNoi = new Set();
  const motiveSesiuneNoua = new Set();

  for (const schimbare of schimbari) {
    const p = schimbare.path;
    const categorie = categoriePentruPath(p);
    if (!categorii.has(categorie)) categorii.set(categorie, []);
    categorii.get(categorie).push(schimbare);

    if (schimbare.status === "A") {
      componenteNoi.add(numeComponenta(p));
      if (categorie === "implementare_hook") hookuriNoi.add(numeComponenta(p));
      if (categorie === "skill") {
        const parti = p.split("/");
        if (parti[0] === "skills" && parti[1]) skilluriNoi.add(parti[1]);
        else skilluriNoi.add(numeComponenta(p));
      }
      if (categorie === "componenta_necunoscuta" || categorie === "fisier_radacina") {
        barzauniNoi.add(numeComponenta(p));
      }
    }

    if ([
      "config_hooks",
      "manifest_plugin",
      "agent",
      "command",
      "mcp",
      "lsp",
      "monitor",
      "output_style",
      "theme",
      "config_claude_aux",
    ].includes(categorie)) {
      motiveSesiuneNoua.add(`${categorie}: ${p}`);
    }

    if (categorie === "componenta_necunoscuta" || (categorie === "fisier_radacina" && !["README.md", "TASKS.md", "cloud-environment-setup.sh"].includes(p))) {
      motiveSesiuneNoua.add(`componenta necunoscuta/noua: ${p}`);
    }
  }

  if (!skillsDirExistaInainte && schimbari.some((x) => incepeCu(x.path, "skills"))) {
    motiveSesiuneNoua.add("directorul skills/ a aparut pentru prima data in plugin");
  }

  const categoriiObiect = {};
  for (const [categorie, valori] of categorii) categoriiObiect[categorie] = valori;

  return {
    categorii: categoriiObiect,
    componenteNoi: [...componenteNoi],
    hookuriNoi: [...hookuriNoi],
    skilluriNoi: [...skilluriNoi],
    barzauniNoi: [...barzauniNoi],
    sesiuneNouaNecesara: motiveSesiuneNoua.size > 0,
    motiveSesiuneNoua: [...motiveSesiuneNoua],
  };
}
