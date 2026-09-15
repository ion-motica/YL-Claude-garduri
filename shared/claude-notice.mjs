export function formatComponentPresence(componentName, installRoot) {
  return [
    `Componenta tehnica: ${componentName}`,
    `instalata in ${installRoot}`,
    "functioneaza aici.",
  ].join("\n");
}
