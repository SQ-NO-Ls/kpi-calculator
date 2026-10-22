// format.js — parsing user input and formatting values for display. No math beyond unit scaling.
//
// The ONLY percent conversions in the app live here:
//   toModel()      divides a percent input by 100 (2.5 → 0.025)
//   formatValue()  formats a percent with Intl's percent style, which multiplies by 100

const MINUS = '−';
const SCALE = { k: 3, m: 6, b: 9 };

// Optional sign, optional $, optional sign, number (with valid thousands commas), optional k/m/b OR %.
const NUMBER_RE = /^([+-])?\s*(\$)?\s*([+-])?\s*(\d{1,3}(?:,\d{3})+(?:\.\d*)?|\d+(?:\.\d*)?|\.\d+)\s*(?:([kmb])|(%))?$/i;
// What a field can look like halfway through typing a number: "-", "$", ".", "-$", "$.", …
const PARTIAL_RE = /^[+-]?\s*\$?\s*\.?$/;

/**
 * Parse a user-typed number.
 * Accepts "50,000", "$50,000", "50k", "1.2m", "2.5%", " 7 ", "-5", "−5", ".5".
 * @returns {{status:'empty'}|{status:'ok', value:number}|{status:'invalid'}}
 */
export function parseNumber(input) {
  if (input === undefined || input === null) return { status: 'empty' };
  const s = String(input).replace(/−/g, '-').trim();
  if (s === '' || PARTIAL_RE.test(s)) return { status: 'empty' };
  const m = NUMBER_RE.exec(s);
  if (!m) return { status: 'invalid' };
  const [, sign1, , sign2, body, suffix] = m;
  if (sign1 && sign2) return { status: 'invalid' };
  const digits = body.replace(/,/g, '').replace(/\.$/, '');
  const exp = suffix ? SCALE[suffix.toLowerCase()] : 0;
  // Shift the decimal exponent in the string so "1.2m" is exactly 1200000, not 1.2 × 1e6.
  let value = Number(`${digits}e${exp}`);
  if ((sign1 || sign2) === '-') value = -value;
  if (!Number.isFinite(value)) return { status: 'invalid' };
  if (Object.is(value, -0)) value = 0;
  return { status: 'ok', value };
}

/** Convert a parsed field value to model units (percent → decimal). The one ÷100 in the app. */
export function toModel(value, unit) {
  return unit === 'percent' ? value / 100 : value;
}

const formatters = new Map();
function nf(min, max, style) {
  const key = `${min}|${max}|${style}`;
  if (!formatters.has(key)) {
    const opts = { minimumFractionDigits: min, maximumFractionDigits: max };
    if (style === 'currency') Object.assign(opts, { style: 'currency', currency: 'USD' });
    if (style === 'percent') opts.style = 'percent';
    formatters.set(key, new Intl.NumberFormat('en-US', opts));
  }
  return formatters.get(key);
}

function cleanSign(s) {
  // Drop the minus from values that round to zero ("-0.00%"), use a true minus sign otherwise.
  if (!/[1-9]/.test(s)) return s.replace('-', '');
  return s.replace('-', MINUS);
}

/**
 * Format a model-unit value for display. Never returns NaN/Infinity/undefined text.
 * @param value number in model units
 * @param def   variable definition ({ unit, digits?, display? })
 */
export function formatValue(value, def) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const d = def.digits;
  const pick = (min, max) => [d?.min ?? min, d?.max ?? max];
  switch (def.unit) {
    case 'currency': {
      const small = value !== 0 && Math.abs(value) < 1;
      return cleanSign(nf(...pick(2, small ? 4 : 2), 'currency').format(value));
    }
    case 'percent':
      return cleanSign(nf(...pick(2, 2), 'percent').format(value));
    case 'ratio':
      if (def.display === 'colon') return `${cleanSign(nf(...pick(1, 1)).format(value))} : 1`;
      return `${cleanSign(nf(...pick(2, 2)).format(value))}x`;
    case 'count':
      return cleanSign(nf(...pick(0, 0)).format(value));
    case 'months': {
      const s = cleanSign(nf(...pick(0, 1)).format(value));
      return `${s} ${s === '1' ? 'month' : 'months'}`;
    }
    case 'years': {
      const s = cleanSign(nf(...pick(0, 2)).format(value));
      return `${s} ${s === '1' ? 'year' : 'years'}`;
    }
    default:
      return cleanSign(nf(...pick(0, 2)).format(value));
  }
}

/** Plain, re-parseable string for putting a model value back into an input field. */
export function toInputString(value, unit) {
  if (!Number.isFinite(value)) return '';
  const n = unit === 'percent' ? value * 100 : value;
  return new Intl.NumberFormat('en-US', { maximumSignificantDigits: 12 }).format(n).replace(MINUS, '-');
}

/** Prefix/suffix shown inside an input for a unit. */
export function inputAffix(unit) {
  switch (unit) {
    case 'currency': return { prefix: '$', suffix: '' };
    case 'percent': return { prefix: '', suffix: '%' };
    case 'ratio': return { prefix: '', suffix: 'x' };
    case 'months': return { prefix: '', suffix: 'mo' };
    case 'years': return { prefix: '', suffix: 'yrs' };
    default: return { prefix: '', suffix: '' };
  }
}

/**
 * Formula with numbers substituted, e.g. "CPP = $50,000.00 ÷ 200 = $250.00".
 * The solved variable keeps its symbol on the left; every other token becomes its value.
 */
export function formulaWithNumbers(template, vars, target, values, result) {
  const body = template.replace(/\{(\w+)\}/g, (_, id) => {
    if (id === target) return vars[id].sym;
    const s = formatValue(values[id], vars[id]);
    return values[id] < 0 ? `(${s})` : s;
  });
  return `${body} = ${formatValue(result, vars[target])}`;
}
