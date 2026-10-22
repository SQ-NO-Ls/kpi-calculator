import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KPIS, KPI_BY_ID, GROUPS, UNITS, getMode, calculate, defaultVariants } from '../formulas.js';
import { toModel, formatValue } from '../format.js';

// Inputs are written the way a user types them (percents as whole numbers).
const GOLDEN = [
  { name: 'CPM', kpi: 'cpm', in: { cost: 5000, impressions: 1000000 }, want: '$5.00' },
  { name: 'vCPM', kpi: 'vcpm', in: { cost: 3000, viewable: 400000 }, want: '$7.50' },
  { name: 'CPP', kpi: 'cpp', in: { cost: 50000, grps: 200 }, want: '$250.00' },
  { name: 'GRPs', kpi: 'grps', in: { reach: 60, freq: 3.5 }, want: '210' },
  { name: 'Impressions', kpi: 'impressions', in: { grps: 210, universe: 2000000 }, want: '4,200,000' },
  { name: 'Reach #', kpi: 'reach', in: { reach: 60, universe: 2000000 }, want: '1,200,000' },
  { name: 'Avg frequency', kpi: 'frequency', in: { impressions: 4200000, reachNum: 1200000 }, want: '3.50' },
  { name: 'CPP from CPM', kpi: 'cppcpm', in: { cpm: 10, universe: 1000000 }, want: '$100.00' },
  { name: 'CPM from CPP', kpi: 'cppcpm', solve: 'cpm', in: { cpp: 250, universe: 2000000 }, want: '$12.50' },
  { name: 'CPC', kpi: 'cpc', in: { cost: 2000, clicks: 800 }, want: '$2.50' },
  { name: 'CTR', kpi: 'ctr', in: { clicks: 800, impressions: 100000 }, want: '0.80%' },
  { name: 'Conversion rate', kpi: 'cvr', in: { conversions: 40, clicks: 800 }, want: '5.00%' },
  { name: 'CPA', kpi: 'cpa', in: { cost: 2000, conversions: 40 }, want: '$50.00' },
  { name: 'CPL', kpi: 'cpl', in: { cost: 3000, leads: 120 }, want: '$25.00' },
  { name: 'CPV', kpi: 'cpv', in: { cost: 1500, views: 30000 }, want: '$0.05' },
  { name: 'Engagement rate', kpi: 'er', in: { engagements: 2500, impressions: 100000 }, want: '2.50%' },
  { name: 'ROAS', kpi: 'roas', in: { revenue: 20000, spend: 5000 }, want: '4.00x' },
  { name: 'ROI (revenue)', kpi: 'roi', v: { basis: 'revenue' }, in: { revenue: 20000, cost: 5000 }, want: '300.00%' },
  { name: 'ROI (gross profit)', kpi: 'roi', in: { revenue: 20000, margin: 40, cost: 5000 }, want: '60.00%' },
  { name: 'ROI (gross profit, loss)', kpi: 'roi', in: { revenue: 10000, margin: 40, cost: 5000 }, want: '−20.00%' },
  { name: 'Break-even ROAS', kpi: 'beroas', in: { margin: 40 }, want: '2.50x' },
  { name: 'MER', kpi: 'mer', in: { revenue: 500000, spend: 100000 }, want: '5.00x' },
  { name: 'AOV', kpi: 'aov', in: { revenue: 50000, orders: 625 }, want: '$80.00' },
  { name: 'CAC', kpi: 'cac', in: { spend: 60000, newCustomers: 400 }, want: '$150.00' },
  { name: 'CLTV purchase, revenue', kpi: 'cltv', v: { model: 'purchase', basis: 'revenue' }, in: { aov: 80, ppy: 3, lifespan: 2 }, want: '$480.00' },
  { name: 'CLTV purchase, margin', kpi: 'cltv', v: { model: 'purchase', basis: 'margin' }, in: { aov: 80, ppy: 3, lifespan: 2, margin: 50 }, want: '$240.00' },
  { name: 'CLTV subscription, margin', kpi: 'cltv', v: { model: 'subscription', basis: 'margin' }, in: { arpa: 100, margin: 80, churn: 4 }, want: '$2,000.00' },
  { name: 'CLTV subscription, revenue', kpi: 'cltv', v: { model: 'subscription', basis: 'revenue' }, in: { arpa: 100, churn: 4 }, want: '$2,500.00' },
  { name: 'LTV:CAC', kpi: 'ltvcac', in: { cltv: 2000, cac: 500 }, want: '4.0 : 1' },
  { name: 'CAC payback', kpi: 'payback', in: { cac: 500, arpa: 100, margin: 80 }, want: '6.3 months', raw: 6.25 },
  { name: 'Churn', kpi: 'churn', in: { lost: 30, start: 1000 }, want: '3.00%' },
  { name: 'Retention', kpi: 'retention', in: { start: 1000, end: 1050, newCust: 100 }, want: '95.00%' },
  { name: 'Purchase frequency', kpi: 'pf', in: { orders: 1200, customers: 400 }, want: '3.00' },
  { name: 'Share of voice', kpi: 'sov', in: { brand: 2000000, category: 10000000 }, want: '20.00%' },
];

// Extra fixtures so every KPI × variant has a round-trip case.
const EXTRA = [
  { name: 'Engagement rate (reach)', kpi: 'er', v: { per: 'reach' }, in: { engagements: 2500, reachNum: 50000 }, want: '5.00%' },
];

function modelInputs(kpi, v, inputs) {
  const { vars } = getMode(kpi, v);
  return Object.fromEntries(Object.entries(inputs).map(([k, n]) => [k, toModel(n, vars[k].unit)]));
}

function run(c) {
  const kpi = KPI_BY_ID[c.kpi];
  const v = c.v ?? {};
  const target = c.solve ?? kpi.output;
  const res = calculate(kpi, v, target, modelInputs(kpi, v, c.in));
  return { kpi, v, target, res, def: getMode(kpi, v).vars[target] };
}

const relErr = (a, b) => (b === 0 ? Math.abs(a) : Math.abs(a - b) / Math.abs(b));

// ─── Structure ───────────────────────────────────────────────

test('exactly 28 KPIs with unique ids and valid groups/units', () => {
  assert.equal(KPIS.length, 28);
  assert.equal(new Set(KPIS.map((k) => k.id)).size, 28);
  const groups = new Set(GROUPS.map((g) => g.id));
  for (const kpi of KPIS) {
    assert.ok(groups.has(kpi.group), `${kpi.id} group`);
    for (const mode of allModes(kpi)) {
      for (const [id, def] of Object.entries(mode.vars)) assert.ok(UNITS.includes(def.unit), `${kpi.id}.${id} unit`);
    }
  }
});

function allModes(kpi) {
  if (!kpi.variants) return [getMode(kpi)];
  const combos = kpi.variants.reduce((acc, v) => acc.flatMap((a) => v.options.map((o) => ({ ...a, [v.id]: o.id }))), [{}]);
  return combos.map((c) => ({ ...getMode(kpi, c), state: c }));
}

test('every variable in every mode has a hand-written solve function and formula template', () => {
  for (const kpi of KPIS) {
    for (const mode of allModes(kpi)) {
      const vars = Object.keys(mode.vars).sort();
      assert.deepEqual(Object.keys(mode.solve).sort(), vars, `${kpi.id} solve keys`);
      assert.deepEqual(Object.keys(mode.formulas).sort(), vars, `${kpi.id} formula keys`);
      assert.ok(mode.vars[mode.output], `${kpi.id} default output exists in every mode`);
      for (const [target, tpl] of Object.entries(mode.formulas)) {
        assert.ok(tpl.startsWith(`{${target}} = `), `${kpi.id}.${target} template LHS`);
        for (const [, id] of tpl.matchAll(/\{(\w+)\}/g)) assert.ok(mode.vars[id], `${kpi.id} template token ${id}`);
      }
    }
  }
});

// ─── Golden cases ────────────────────────────────────────────

for (const c of GOLDEN) {
  test(`golden: ${c.name} = ${c.want}`, () => {
    const { res, def } = run(c);
    assert.equal(res.status, 'ok', res.message);
    assert.equal(formatValue(res.value, def), c.want);
    if (c.raw !== undefined) assert.ok(relErr(res.value, c.raw) < 1e-12, `raw ${res.value}`);
  });
}

// ─── Round trips ─────────────────────────────────────────────

function roundTrip(kpi, v, inputs, label) {
  const mode = getMode(kpi, v);
  const forward = calculate(kpi, v, mode.output, inputs);
  assert.equal(forward.status, 'ok', `${label}: forward ${forward.message}`);
  const all = { ...inputs, [mode.output]: forward.value };
  for (const k of Object.keys(inputs)) {
    const back = calculate(kpi, v, k, { ...all, [k]: undefined });
    assert.equal(back.status, 'ok', `${label}: solve ${k}: ${back.message}`);
    assert.ok(relErr(back.value, inputs[k]) <= 1e-9, `${label}: ${k} recovered ${back.value}, expected ${inputs[k]}`);
  }
}

test('round trip: every KPI and every variant recovers each input from the output', () => {
  const covered = new Set();
  for (const c of [...GOLDEN, ...EXTRA]) {
    if (c.solve) continue; // reverse-direction golden; forward case covers this KPI
    const kpi = KPI_BY_ID[c.kpi];
    const v = { ...defaultVariants(kpi), ...(c.v ?? {}) };
    roundTrip(kpi, v, modelInputs(kpi, v, c.in), c.name);
    covered.add(`${kpi.id}|${JSON.stringify(Object.values(v))}`);
  }
  for (const kpi of KPIS) {
    for (const mode of allModes(kpi)) {
      const v = mode.state ?? {};
      assert.ok(covered.has(`${kpi.id}|${JSON.stringify(Object.values({ ...defaultVariants(kpi), ...v }))}`), `no round-trip fixture for ${kpi.id} ${JSON.stringify(v)}`);
    }
  }
});

// Deterministic PRNG so failures are reproducible.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomValue(def, rnd) {
  const logU = (lo, hi) => Math.exp(Math.log(lo) + rnd() * (Math.log(hi) - Math.log(lo)));
  switch (def.unit) {
    case 'percent': return def.max !== undefined ? 0.001 + rnd() * 0.998 : logU(0.001, 5);
    case 'currency': return logU(0.01, 5e6);
    case 'count': return logU(1, 1e9);
    case 'ratio': return logU(0.05, 50);
    case 'months': return logU(0.5, 120);
    case 'years': return logU(0.25, 30);
    default: return logU(0.01, 5e4);
  }
}

test('round trip: 300 random input sets per KPI/variant recover within 1e-9', () => {
  const rnd = mulberry32(20261019);
  for (const kpi of KPIS) {
    for (const mode of allModes(kpi)) {
      const v = mode.state ?? {};
      let ok = 0;
      for (let i = 0; i < 300; i++) {
        const inputs = {};
        for (const [id, def] of Object.entries(mode.vars)) if (id !== mode.output) inputs[id] = randomValue(def, rnd);
        const fwd = calculate(kpi, v, mode.output, inputs);
        if (fwd.status !== 'ok') continue; // e.g. retention with new > end
        // ROI within 0.01% of −100% (e.g. $0.03 revenue on $5M cost): 1 + ROI cancels catastrophically
        // in any floating-point system, so inverting it cannot be exact. Not a realistic input.
        if (kpi.id === 'roi' && fwd.value + 1 < 1e-4) continue;
        roundTrip(kpi, v, inputs, `${kpi.id} ${JSON.stringify(v)} #${i}`);
        ok++;
      }
      assert.ok(ok >= 30, `${kpi.id} ${JSON.stringify(v)}: only ${ok} valid random cases`);
    }
  }
});

// ─── Displayed formula text must agree with the math ─────────

function evalTemplate(tpl, mode, target, values) {
  const rhs = tpl.slice(tpl.indexOf(' = ') + 3);
  const expr = rhs
    .replace(/\{(\w+)\}/g, (_, id) => `(${values[id]})`)
    .replace(/(\d),(\d{3})/g, '$1$2')
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  assert.match(expr, /^[\d\s().*/+\-e]+$/, `unexpected text in formula: ${rhs}`);
  return Function(`"use strict"; return (${expr});`)();
}

test('every formula template evaluates to the same number as its solve function', () => {
  const rnd = mulberry32(42);
  for (const kpi of KPIS) {
    for (const mode of allModes(kpi)) {
      for (const target of Object.keys(mode.vars)) {
        for (let i = 0; i < 20; i++) {
          const values = {};
          for (const [id, def] of Object.entries(mode.vars)) values[id] = randomValue(def, rnd);
          const args = { ...values };
          delete args[target];
          const fromSolve = mode.solve[target](args);
          // Percent inputs appear as true values; a percent output's template yields the whole-number percent.
          const fromText = evalTemplate(mode.formulas[target], mode, target, values);
          const expected = mode.vars[target].unit === 'percent' ? fromSolve * 100 : fromSolve;
          assert.ok(relErr(fromText, expected) < 1e-12, `${kpi.id}.${target}: text ${fromText} vs solve ${expected}`);
        }
      }
    }
  }
});

// ─── Edge cases ──────────────────────────────────────────────

const calc = (id, target, inputs, v = {}) => calculate(KPI_BY_ID[id], v, target, modelInputs(KPI_BY_ID[id], v, inputs));

test('zero denominators return an error, never Infinity or NaN', () => {
  let r = calc('cpc', 'cpc', { cost: 2000, clicks: 0 });
  assert.equal(r.status, 'error');
  assert.match(r.message, /Can't divide by zero: enter Clicks above 0\./);
  r = calc('cpc', 'clicks', { cost: 2000, cpc: 0 });
  assert.equal(r.status, 'error');
  assert.match(r.message, /enter CPC above 0/);
  r = calc('cpc', 'clicks', { cost: 0, cpc: 0 }); // 0/0
  assert.equal(r.status, 'error');
  assert.match(r.message, /enter CPC above 0/);
  r = calc('roi', 'cost', { revenue: 10000, margin: 40, roi: -100 }); // ÷ (1 + ROI) = ÷ 0
  assert.equal(r.status, 'error');
  r = calc('beroas', 'beroas', { margin: 0 });
  assert.equal(r.status, 'error');
  r = calc('cltv', 'aov', { cltv: 240, ppy: 0, lifespan: 2, margin: 50 }, { model: 'purchase', basis: 'margin' });
  assert.equal(r.status, 'error');
  assert.match(r.message, /Purchases per year/);
});

test('no mode/target ever returns a non-finite ok value, even with zeros and extremes', () => {
  const picks = [0, 1e-12, 0.5, 1, 3, 1e12];
  for (const kpi of KPIS) {
    for (const mode of allModes(kpi)) {
      const v = mode.state ?? {};
      for (const target of Object.keys(mode.vars)) {
        const ids = Object.keys(mode.vars).filter((k) => k !== target);
        const total = picks.length ** ids.length;
        for (let n = 0; n < total; n++) {
          const values = {};
          let x = n;
          for (const id of ids) { values[id] = picks[x % picks.length]; x = Math.floor(x / picks.length); }
          const r = calculate(kpi, v, target, values);
          if (r.status === 'ok') assert.ok(Number.isFinite(r.value), `${kpi.id}.${target} ${JSON.stringify(values)}`);
          else assert.ok(['error', 'empty'].includes(r.status));
        }
      }
    }
  }
});

test('blank input means no result', () => {
  assert.equal(calc('cpc', 'cpc', { cost: 2000 }).status, 'empty');
  assert.equal(calculate(KPI_BY_ID.cpc, {}, 'cpc', { cost: 2000, clicks: undefined }).status, 'empty');
  assert.equal(calculate(KPI_BY_ID.cpc, {}, 'cpc', {}).status, 'empty');
});

test('negative values are rejected for costs, counts and impressions', () => {
  for (const [id, target, inputs] of [
    ['cpc', 'cpc', { cost: -1, clicks: 10 }],
    ['cpc', 'cpc', { cost: 10, clicks: -5 }],
    ['cpm', 'cpm', { cost: 100, impressions: -1000 }],
    ['cac', 'cac', { spend: 1000, newCustomers: -3 }],
    ['grps', 'grps', { reach: 50, freq: -2 }],
  ]) {
    const r = calc(id, target, inputs);
    assert.equal(r.status, 'error', `${id} ${JSON.stringify(inputs)}`);
    assert.match(r.message, /can't be negative/);
  }
});

test('a solved value that would be negative is an error', () => {
  const r = calc('retention', 'newCust', { start: 1000, end: 500, retention: 95 });
  assert.equal(r.status, 'error');
  assert.match(r.message, /would be negative/);
});

test('percent ranges are enforced (0–100)', () => {
  const cases = [
    ['grps', 'grps', { reach: 120, freq: 3 }],
    ['reach', 'reachNum', { reach: -1, universe: 1000 }],
    ['roi', 'roi', { revenue: 1000, margin: 101, cost: 100 }],
    ['ctr', 'clicks', { ctr: 150, impressions: 1000 }],
    ['cltv', 'cltv', { arpa: 100, margin: 80, churn: 120 }, { model: 'subscription', basis: 'margin' }],
    ['churn', 'lost', { churn: 101, start: 1000 }],
    ['sov', 'brand', { sov: 200, category: 1000 }],
  ];
  for (const [id, target, inputs, v] of cases) {
    const r = calc(id, target, inputs, v);
    assert.equal(r.status, 'error', `${id} ${JSON.stringify(inputs)}`);
    assert.match(r.message, /between 0 and 100%/);
  }
  // Outputs too: more clicks than impressions is a CTR above 100%.
  const r = calc('ctr', 'ctr', { clicks: 2000, impressions: 1000 });
  assert.equal(r.status, 'error');
  assert.match(r.message, /above 100%/);
  // Exactly 100% is allowed.
  assert.equal(calc('ctr', 'ctr', { clicks: 1000, impressions: 1000 }).status, 'ok');
});

test('churn must be > 0 for subscription CLTV, in every solve direction', () => {
  const v = { model: 'subscription', basis: 'margin' };
  assert.equal(calc('cltv', 'cltv', { arpa: 100, margin: 80, churn: 0 }, v).status, 'error');
  assert.equal(calc('cltv', 'arpa', { cltv: 2000, margin: 80, churn: 0 }, v).status, 'error');
  const rv = { model: 'subscription', basis: 'revenue' };
  assert.equal(calc('cltv', 'arpa', { cltv: 2500, churn: 0 }, rv).status, 'error');
});

test('retention cannot use a start count of 0, in every solve direction', () => {
  for (const [target, inputs] of [
    ['retention', { start: 0, end: 100, newCust: 100 }],
    ['end', { start: 0, retention: 95, newCust: 100 }],
    ['newCust', { start: 0, retention: 95, end: 100 }],
  ]) {
    const r = calc('retention', target, inputs);
    assert.equal(r.status, 'error', target);
    assert.match(r.message, /Customers at start above 0/);
  }
});

test('ROI may be negative but not below −100%', () => {
  assert.equal(calc('roi', 'roi', { revenue: 0, margin: 40, cost: 5000 }).value, -1);
  const r = calc('roi', 'revenue', { roi: -150, margin: 40, cost: 5000 });
  assert.equal(r.status, 'error');
  assert.match(r.message, /-100%|−100%/);
});

test('float noise at a boundary snaps instead of erroring', () => {
  // 950 − 0.95 × 1000 = −1.1e-13 in floating point; the true answer is 0 new customers.
  const r = calc('retention', 'newCust', { start: 1000, end: 950, retention: 95 });
  assert.equal(r.status, 'ok');
  assert.equal(r.value, 0);
});

test('variables shared between toggle modes use the same id', () => {
  const cltv = KPI_BY_ID.cltv;
  const ids = (v) => Object.keys(getMode(cltv, v).vars);
  assert.ok(ids({ model: 'purchase', basis: 'margin' }).includes('margin'));
  assert.ok(ids({ model: 'subscription', basis: 'margin' }).includes('margin'));
  assert.ok(!ids({ model: 'subscription', basis: 'revenue' }).includes('margin'));
  assert.deepEqual(getMode(KPI_BY_ID.roi, { basis: 'nonsense' }).vars, getMode(KPI_BY_ID.roi, {}).vars);
});
