/** Formato "ul_code - name" para exibição de unidades */
export function formatUnitDisplay(ul: string | null, name: string | null): string {
  if (ul && name) return `${ul} - ${name}`;
  if (ul) return ul;
  if (name) return name;
  return '-';
}

/** Identificador do movement: display_code ou 8 primeiros do UUID */
export function movementDisplayId(m: { display_code?: string | null; id: string }): string {
  return m.display_code ?? m.id.slice(0, 8);
}
