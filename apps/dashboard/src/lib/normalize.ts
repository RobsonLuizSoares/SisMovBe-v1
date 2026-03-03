/**
 * Normalizadores para importação CSV de bens.
 * Evita perda de zeros à esquerda (ex.: Excel converte "002927" → 2927).
 * Todos os inputs são tratados como string - NUNCA converter para number.
 */

/** Converte para string, trim, extrai dígitos, padStart 6. Retorna null se vazio. */
export function normalizeUlCode(input: unknown): string | null {
  const s = String(input ?? '')
    .trim()
    .replace(/\D/g, '');
  if (s.length === 0) return null;
  return s.padStart(6, '0').slice(0, 6);
}

/**
 * Tombamento: trim + preservar zeros à esquerda.
 * Se for só dígitos, padStart 6 (evita Excel converter "002927" → 2927).
 * Se alfanumérico, retorna trim (não extrair só dígitos para não corromper).
 */
export function normalizeTombamento(input: unknown): string | null {
  const s = String(input ?? '').trim();
  if (s.length === 0) return null;
  const digits = s.replace(/\D/g, '');
  if (digits.length === s.length) {
    return s.padStart(6, '0').slice(0, 6);
  }
  return s;
}

/** Descrição: trim, substituir CRLF/LF por espaço, colapsar múltiplos espaços. */
export function normalizeDescription(input: unknown): string | null {
  const s = String(input ?? '')
    .trim()
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\s+/g, ' ');
  return s.length === 0 ? null : s;
}

/** Barcode: trim, tratar "-" ou vazio como null. */
export function normalizeBarcode(input: unknown): string | null {
  const s = String(input ?? '').trim();
  if (s === '' || s === '-') return null;
  return s;
}
