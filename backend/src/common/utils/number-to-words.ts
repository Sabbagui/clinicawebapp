/**
 * Converte números inteiros (1–9999) para extenso em pt-BR.
 * Usado para quantidade de medicamentos em receitas C1 (ANVISA).
 * Exemplo: 30 → "trinta", 150 → "cento e cinquenta"
 */

const UNIDADES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco',
  'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'quatorze', 'quinze',
  'dezesseis', 'dezessete', 'dezoito', 'dezenove',
];

const DEZENAS = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta',
  'sessenta', 'setenta', 'oitenta', 'noventa',
];

const CENTENAS = [
  '', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
];

function belowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return UNIDADES[n];

  const c = Math.floor(n / 100);
  const rest = n % 100;

  if (c > 0) {
    const centena = c === 1 && rest > 0 ? 'cento' : CENTENAS[c];
    return rest > 0 ? `${centena} e ${belowThousand(rest)}` : centena;
  }

  const d = Math.floor(n / 10);
  const u = n % 10;
  return u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d];
}

export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) return String(n);
  if (n === 0) return 'zero';

  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const prefix = thousands === 1 ? 'mil' : `${belowThousand(thousands)} mil`;
    return rest > 0 ? `${prefix} e ${belowThousand(rest)}` : prefix;
  }

  return belowThousand(n);
}
