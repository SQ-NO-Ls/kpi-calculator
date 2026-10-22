import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumber, parseField, toModel, formatValue, toInputString, formulaWithNumbers, inputAffix } from '../format.js';
import { KPI_BY_ID } from '../formulas.js';

const ok = (s) => {
  const r = parseNumber(s);
  assert.equal(r.status, 'ok', `"${s}" should parse`);
  return r.value;
};

test('parses the spec examples', () => {
  assert.equal(ok('50,000'), 50000);
  assert.equal(ok('$50,000'), 50000);
  assert.equal(ok('50k'), 50000);
  assert.equal(ok('1.2m'), 1200000);
  assert.equal(ok('2.5%'), 2.5);
  assert.equal(ok(' 7 '), 7);
});

test('parses other reasonable input', () => {
  assert.equal(ok('1.2M'), 1200000);
  assert.equal(ok('3b'), 3e9);
  assert.equal(ok('0.0125'), 0.0125);
  assert.equal(ok('.5'), 0.5);
  assert.equal(ok('5.'), 5); // mid-typing "5.5"
  assert.equal(ok('-20'), -20);
  assert.equal(ok('−20'), -20);
  assert.equal(ok('-$5'), -5);
  assert.equal(ok('$-5'), -5);
  assert.equal(ok('1,234,567.89'), 1234567.89);
  assert.equal(ok('2.75k'), 2750);
  assert.equal(ok('0.1m'), 100000);
  assert.equal(ok('-0'), 0);
  assert.ok(!Object.is(ok('-0'), -0));
});

test('rejects malformed input', () => {
  for (const s of ['abc', '1..2', '--5', '5-', '1,00', '12,34,567', '$$5', '5kk', '5%%', '1e5', '-$-5', '5 5', 'k']) {
    assert.equal(parseNumber(s).status, 'invalid', `"${s}" should be rejected`);
  }
});

test('blank and half-typed input is empty, not an error', () => {
  for (const s of ['', '   ', undefined, null, '-', '$', '.', '-$', '$.']) {
    assert.equal(parseNumber(s).status, 'empty', `"${s}"`);
  }
});

test('percent conversion happens in toModel only', () => {
  assert.equal(toModel(2.5, 'percent'), 0.025);
  assert.equal(toModel(60, 'percent'), 0.6);
  assert.equal(toModel(2.5, 'currency'), 2.5);
  assert.equal(toModel(2.5, 'count'), 2.5);
});

test('formats each unit per the display rules', () => {
  assert.equal(formatValue(250, { unit: 'currency' }), '$250.00');
  assert.equal(formatValue(2000, { unit: 'currency' }), '$2,000.00');
  assert.equal(formatValue(0.0125, { unit: 'currency' }), '$0.0125');
  assert.equal(formatValue(0.05, { unit: 'currency' }), '$0.05');
  assert.equal(formatValue(0.99999, { unit: 'currency' }), '$1.00');
  assert.equal(formatValue(0, { unit: 'currency' }), '$0.00');
  assert.equal(formatValue(0.008, { unit: 'percent' }), '0.80%');
  assert.equal(formatValue(-0.2, { unit: 'percent' }), '−20.00%');
  assert.equal(formatValue(-0.00001, { unit: 'percent' }), '0.00%');
  assert.equal(formatValue(4, { unit: 'ratio' }), '4.00x');
  assert.equal(formatValue(4, { unit: 'ratio', display: 'colon' }), '4.0 : 1');
  assert.equal(formatValue(4200000, { unit: 'count' }), '4,200,000');
  assert.equal(formatValue(1199999.6, { unit: 'count' }), '1,200,000');
  assert.equal(formatValue(210, { unit: 'number' }), '210');
  assert.equal(formatValue(3.14159, { unit: 'number' }), '3.14');
  assert.equal(formatValue(3.5, { unit: 'number', digits: { min: 2, max: 2 } }), '3.50');
  assert.equal(formatValue(6.25, { unit: 'months' }), '6.3 months');
  assert.equal(formatValue(1, { unit: 'months' }), '1 month');
  assert.equal(formatValue(2, { unit: 'years' }), '2 years');
  assert.equal(formatValue(1, { unit: 'years' }), '1 year');
  assert.equal(formatValue(2.125, { unit: 'years' }), '2.13 years');
});

test('never formats NaN, Infinity or undefined', () => {
  for (const v of [NaN, Infinity, -Infinity, undefined, null, '5']) {
    const s = formatValue(v, { unit: 'currency' });
    assert.equal(s, '—');
  }
});

test('toInputString round-trips through parseNumber + toModel', () => {
  for (const [v, unit] of [[0.025, 'percent'], [1 / 3, 'number'], [1234567.891, 'currency'], [0.07, 'percent'], [-0.2, 'percent'], [6.25, 'months']]) {
    const s = toInputString(v, unit);
    const back = toModel(parseNumber(s).value, unit);
    assert.ok(Math.abs(back - v) <= 1e-11 * Math.max(1, Math.abs(v)), `${v} ${unit} → "${s}" → ${back}`);
  }
  assert.equal(toInputString(0.07, 'percent'), '7');
});

test('formula with numbers substituted', () => {
  const kpi = KPI_BY_ID.cpp;
  assert.equal(
    formulaWithNumbers(kpi.formulas.cpp, kpi.vars, 'cpp', { cost: 50000, grps: 200 }, 250),
    'CPP = $50,000.00 ÷ 200 = $250.00',
  );
  const roi = KPI_BY_ID.roi.modes.gross;
  assert.equal(
    formulaWithNumbers(roi.formulas.revenue, roi.vars, 'revenue', { roi: -0.2, margin: 0.4, cost: 5000 }, 10000),
    'Revenue = $5,000.00 × (1 + (−20.00%)) ÷ 40.00% = $10,000.00',
  );
});

test('input affixes follow the unit', () => {
  assert.deepEqual(inputAffix('currency'), { prefix: '$', suffix: '' });
  assert.deepEqual(inputAffix('percent'), { prefix: '', suffix: '%' });
  assert.deepEqual(inputAffix('count'), { prefix: '', suffix: '' });
});

test('field parsing rejects suffixes that would mis-scale the unit', () => {
  assert.equal(parseField('2.5%', 'percent').value, 2.5);
  assert.equal(parseField('50k', 'currency').value, 50000);
  assert.equal(parseField('1.2m', 'count').value, 1200000);
  assert.equal(parseField('2m', 'number').value, 2000000);
  assert.equal(parseField('6', 'months').value, 6);
  for (const [s, unit] of [['5%', 'currency'], ['5%', 'count'], ['6m', 'months'], ['2k', 'years'], ['1k', 'percent'], ['3m', 'ratio']]) {
    assert.equal(parseField(s, unit).status, 'invalid', `"${s}" as ${unit}`);
  }
  assert.equal(parseField('', 'currency').status, 'empty');
  assert.equal(parseField('abc', 'currency').status, 'invalid');
});
