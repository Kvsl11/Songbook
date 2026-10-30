// Operações puras da fila: os índices originais são preservados para manter partes e faixas repetidas.
export function embaralharIndices(indices, atual, random = Math.random) {
  const restantes = indices.filter((i) => i !== atual);
  for (let i = restantes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [restantes[i], restantes[j]] = [restantes[j], restantes[i]];
  }
  return atual === undefined || atual === null ? restantes : [atual, ...restantes];
}

export function moverIndice(indices, origem, destino) {
  if (!Array.isArray(indices) || origem < 0 || destino < 0 || origem >= indices.length || destino >= indices.length || origem === destino) return [...indices];
  const copia = [...indices];
  const [item] = copia.splice(origem, 1);
  copia.splice(destino, 0, item);
  return copia;
}
