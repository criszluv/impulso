/** Utilidades para las listas del perfil y de postulaciones. */

/** Reemplaza el elemento con ese id, o lo agrega al final si no existe. */
export function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((i) => i.id === item.id);
  if (index === -1) return [...list, item];
  const copy = [...list];
  copy[index] = item;
  return copy;
}

export function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((i) => i.id !== id);
}

/** Mueve un elemento `delta` posiciones. Fuera de rango, devuelve la lista igual. */
export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  return copy;
}
