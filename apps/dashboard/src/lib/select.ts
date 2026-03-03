/**
 * Helper para Selects Radix.
 * Radix Select.Item não aceita value="" - usar constantes e validação.
 */

/** Valor sentinela para opção "Todos/Todas" - nunca usar string vazia em SelectItem. */
export const SELECT_ALL_VALUE = '__all__';

/**
 * Garante que value seja string não vazia para SelectItem.
 * Retorna null se inválido (não renderizar o item).
 */
export function safeSelectValue(value: unknown): string | null {
  const s = value == null ? '' : String(value).trim();
  return s.length > 0 ? s : null;
}

/**
 * Filtra itens para evitar SelectItem com value vazio.
 * Use em listas dinâmicas (units, users).
 */
export function filterValidSelectItems<T>(items: T[], getId: (x: T) => unknown): T[] {
  return (items ?? []).filter((x) => {
    const id = getId(x);
    return id != null && String(id).trim() !== '';
  });
}
