/**
 * Converte qualquer valor para string segura (evita [object Object] e trim crash).
 * Usado para tombamento e outros campos que devem ser exibidos como texto.
 */
export function toSafeString(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v == null) return '';
  if (typeof v === 'number') return String(v).trim();
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const candidates = ['tombamento', 'display', 'value', 'raw', 'rawTrim', 'digitsOnly'];
    for (const key of candidates) {
      const val = o[key];
      if (typeof val === 'string' && val.trim().length > 0) return val.trim();
      if (typeof val === 'number') return String(val).trim();
    }
    return JSON.stringify(v).trim();
  }
  return String(v).trim();
}
