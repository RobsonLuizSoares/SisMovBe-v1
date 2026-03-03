import { normalizeTombamento } from './movements';

const ITF14_PREFIX = '750';
const ITF14_PREFIX_LEN = 3;
const ITF14_TOMBAMENTO_LEN = 6;

export type BarcodeExtraction = {
  tombamentoDisplay: string;
  tombamentoDigits: string;
};

/**
 * Extrai tombamento de leitura de código de barras.
 * ITF-14 (TRE/SC): prefixo 750 + 6 dígitos tombamento + 1 check digit.
 * Ex: 7500582876 -> 058.287
 * Também suporta Code 128 (xxx.xxx ou xxxxxx) e digitado.
 */
export function extractTombamentoFromBarcode(
  type: string,
  data: string
): BarcodeExtraction | null {
  const trimmed = data.trim().replace(/\s+/g, '');
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, '');

  // ITF14: 10 dígitos, prefixo 750, check digit no final
  if (
    type === 'itf14' ||
    (digits.length >= 10 && digits.startsWith(ITF14_PREFIX))
  ) {
    if (digits.length < 10) return null;
    const tombamentoDigits = digits.slice(
      ITF14_PREFIX_LEN,
      ITF14_PREFIX_LEN + ITF14_TOMBAMENTO_LEN
    );
    const display = `${tombamentoDigits.slice(0, 3)}.${tombamentoDigits.slice(3, 6)}`;
    return { tombamentoDisplay: display, tombamentoDigits };
  }

  // Formato xxx.xxx ou xxxxxx (Code 128, digitado, etc.)
  const norm = normalizeTombamento(trimmed);
  if (norm.digitsOnly.length === 6 || /^\d{3}\.\d{3}$/.test(norm.rawTrim)) {
    return {
      tombamentoDisplay: norm.display,
      tombamentoDigits: norm.digitsOnly,
    };
  }

  return null;
}

/** Normaliza valor escaneado para tombamento no formato xxx.xxx.
 * Retorna tombamentoDisplay quando válido; senão string vazia.
 * @deprecated Preferir extractTombamentoFromBarcode quando tiver type.
 */
export function normalizeBarcodeScanned(value: string): string {
  const ext = extractTombamentoFromBarcode('', value);
  return ext?.tombamentoDisplay ?? '';
}
