export function formatComponentPresence(componentName, installRoot) {
  return [
    `Componenta tehnica: ${componentName}`,
    `instalata in ${installRoot}`,
    "functioneaza aici.",
  ].join("\n");
}

export function formatAvertizareSesiuneNoua(statusActualizare) {
  if (!statusActualizare?.sesiuneNouaNecesara) return "";
  return [
    "ANUNTA UTILIZATORUL CA:",
    "Actualizarea YL-Claude-garduri a detectat componente structurale noi/modificate.",
    "In Claude Code Web este necesara o SESIUNE/CHAT NOU pentru activarea sigura a acelor componente.",
    "Nu pretinde ca noile hookuri/skills/componente sunt active in sesiunea curenta.",
    statusActualizare.motiveSesiuneNoua?.length
      ? `Motive: ${statusActualizare.motiveSesiuneNoua.join(" ; ")}`
      : "",
  ].filter(Boolean).join("\n");
}
