// app.js — UI only. All math comes from formulas.js; all parsing/formatting from format.js.
import { KPIS, KPI_BY_ID, GROUPS, getMode, calculate, defaultVariants, symbolicFormula } from './formulas.js';
import { parseField, toModel, formatValue, toInputString, inputAffix, formulaWithNumbers } from './format.js';

const STORE_KEY = 'kpi-calc-v1';
const app = document.getElementById('app');

// ─── Storage (every access guarded so the app still works if storage is blocked) ───
function loadStore() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    return { favorites: Array.isArray(s.favorites) ? s.favorites : [], kpis: s.kpis && typeof s.kpis === 'object' ? s.kpis : {}, last: typeof s.last === 'string' ? s.last : '' };
  } catch {
    return { favorites: [], kpis: {}, last: '' };
  }
}
const store = loadStore();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* storage unavailable: keep working in memory */ }
}

function kpiState(kpi) {
  const s = store.kpis[kpi.id] || (store.kpis[kpi.id] = {});
  if (!s.inputs || typeof s.inputs !== 'object') s.inputs = {};
  s.variants = { ...defaultVariants(kpi), ...(s.variants || {}) };
  const mode = getMode(kpi, s.variants);
  if (!mode.vars[s.solveFor]) s.solveFor = mode.output;
  return s;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ─── Routing ───
let searchText = '';
let cameFromHome = false;

function route() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (id && KPI_BY_ID[id]) {
    store.last = id;
    save();
    renderCalc(KPI_BY_ID[id]);
  } else {
    store.last = '';
    save();
    renderHome();
  }
}

window.addEventListener('hashchange', route);

// ─── Home ───
function matches(kpi, q) {
  if (!q) return true;
  const hay = `${kpi.name} ${kpi.fullName} ${kpi.keywords || ''} ${kpi.description}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}

function tile(kpi) {
  return `<a class="tile" href="#/${kpi.id}"><span class="tile-name">${esc(kpi.name)}</span><span class="tile-full">${esc(kpi.fullName)}</span></a>`;
}

function listHTML() {
  const sections = [];
  const favs = store.favorites.map((id) => KPI_BY_ID[id]).filter((k) => k && matches(k, searchText));
  if (favs.length) sections.push(section('Favorites', favs, 'fav'));
  for (const g of GROUPS) {
    const items = KPIS.filter((k) => k.group === g.id && matches(k, searchText));
    if (items.length) sections.push(section(g.label, items, g.id));
  }
  if (!sections.length) return `<p class="empty">No KPI matches “${esc(searchText)}”.</p>`;
  return sections.join('');
}

function section(title, items, key) {
  return `<section class="group" aria-labelledby="g-${key}"><h2 id="g-${key}">${esc(title)}</h2><div class="grid">${items.map(tile).join('')}</div></section>`;
}

function renderHome() {
  document.title = 'KPI Calculator';
  app.innerHTML = `
    <header class="home-head">
      <h1>KPI Calculator</h1>
      <div class="search">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="search" type="search" placeholder="Search KPIs (e.g. point, churn)" aria-label="Search KPIs" autocomplete="off" autocorrect="off" spellcheck="false" value="${esc(searchText)}">
      </div>
    </header>
    <main id="list" class="home">${listHTML()}</main>`;
  const input = document.getElementById('search');
  input.addEventListener('input', () => {
    searchText = input.value.trim();
    document.getElementById('list').innerHTML = listHTML();
  });
  app.querySelector('#list').addEventListener('click', (e) => {
    if (e.target.closest('a.tile')) cameFromHome = true;
  });
  window.scrollTo(0, 0);
}

// ─── Calculator ───
function renderCalc(kpi) {
  const st = kpiState(kpi);
  const mode = getMode(kpi, st.variants);
  const fav = store.favorites.includes(kpi.id);
  document.title = `${kpi.name} · KPI Calculator`;

  const variantsHTML = (kpi.variants || []).map((v) => `
    <div class="seg-wrap">
      <span class="seg-label" id="v-${v.id}">${esc(v.label)}</span>
      <div class="seg" role="radiogroup" aria-labelledby="v-${v.id}">
        ${v.options.map((o) => `<button type="button" role="radio" aria-checked="${st.variants[v.id] === o.id}" data-variant="${v.id}" data-option="${o.id}">${esc(o.label)}</button>`).join('')}
      </div>
    </div>`).join('');

  const chipsHTML = Object.entries(mode.vars).map(([id, def]) =>
    `<button type="button" class="chip" role="radio" aria-checked="${id === st.solveFor}" data-solve="${id}">${esc(def.sym)}</button>`).join('');

  const fieldsHTML = Object.entries(mode.vars).filter(([id]) => id !== st.solveFor).map(([id, def]) => {
    const { prefix, suffix } = inputAffix(def.unit);
    return `
      <div class="field">
        <label for="f-${id}">${esc(def.label)}</label>
        <div class="control${prefix ? ' has-prefix' : ''}${suffix ? ' has-suffix' : ''}">
          ${prefix ? `<span class="affix prefix" aria-hidden="true">${prefix}</span>` : ''}
          <input id="f-${id}" data-var="${id}" type="text" inputmode="decimal" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done"
            placeholder="${esc(def.example || '')}" value="${esc(st.inputs[id] ?? '')}">
          ${suffix ? `<span class="affix suffix" aria-hidden="true">${suffix}</span>` : ''}
        </div>
      </div>`;
  }).join('');

  const target = mode.vars[st.solveFor];
  app.innerHTML = `
    <header class="bar">
      <button type="button" class="icon-btn back" aria-label="Back to all KPIs">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <h1>${esc(kpi.name)}</h1>
      <button type="button" class="icon-btn star" aria-pressed="${fav}" aria-label="${fav ? 'Remove from favorites' : 'Add to favorites'}">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
      </button>
    </header>
    <main class="calc">
      <p class="full-name">${esc(kpi.fullName)}</p>
      <p class="desc">${esc(kpi.description)}</p>
      ${kpi.note ? `<p class="note">${esc(kpi.note)}</p>` : ''}
      ${variantsHTML ? `<div class="variants">${variantsHTML}</div>` : ''}
      <div class="solve-for">
        <span class="seg-label" id="solve-label">Solve for</span>
        <div class="chips" role="radiogroup" aria-labelledby="solve-label">${chipsHTML}</div>
      </div>
      <form class="inputs" autocomplete="off" novalidate>${fieldsHTML}</form>
      <section class="result" aria-labelledby="result-label">
        <div class="result-top">
          <span class="result-label" id="result-label">${esc(target.label)}</span>
          <button type="button" class="copy" disabled aria-label="Copy result">Copy</button>
        </div>
        <output class="result-value" id="result" aria-live="polite" aria-atomic="true">—</output>
        <p class="result-msg" id="result-msg"></p>
      </section>
      <section class="formula" aria-label="Formula">
        <p class="formula-text" id="formula-text">${esc(symbolicFormula(mode.formulas[st.solveFor], mode.vars))}</p>
        <p class="formula-nums" id="formula-nums"></p>
      </section>
      <button type="button" class="reset">Reset</button>
    </main>`;

  bindCalc(kpi);
  update(kpi);
  window.scrollTo(0, 0);
}

function readValues(kpi, st, mode) {
  const values = {};
  let invalid = null;
  for (const [id, def] of Object.entries(mode.vars)) {
    if (id === st.solveFor) continue;
    const p = parseField(st.inputs[id], def.unit);
    const el = document.getElementById(`f-${id}`);
    if (el) el.setAttribute('aria-invalid', p.status === 'invalid' ? 'true' : 'false');
    if (p.status === 'ok') values[id] = toModel(p.value, def.unit);
    else if (p.status === 'invalid' && !invalid) invalid = id;
  }
  return { values, invalid };
}

let lastResult = null;

function update(kpi) {
  const st = kpiState(kpi);
  const mode = getMode(kpi, st.variants);
  const out = document.getElementById('result');
  const msg = document.getElementById('result-msg');
  const nums = document.getElementById('formula-nums');
  const copy = app.querySelector('.copy');
  const card = app.querySelector('.result');
  const { values, invalid } = readValues(kpi, st, mode);

  let res;
  if (invalid) res = { status: 'error', message: `Enter a valid number for ${mode.vars[invalid].label}.`, field: invalid };
  else res = calculate(kpi, st.variants, st.solveFor, values);
  lastResult = res;

  app.querySelectorAll('.field input').forEach((el) => {
    if (res.status === 'error' && res.field === el.dataset.var) el.setAttribute('aria-invalid', 'true');
  });

  card.dataset.state = res.status;
  if (res.status === 'ok') {
    const shown = formatValue(res.value, mode.vars[res.target]);
    out.textContent = shown;
    msg.textContent = '';
    nums.textContent = formulaWithNumbers(mode.formulas[res.target], mode.vars, res.target, values, res.value);
    copy.disabled = false;
    copy.dataset.value = shown;
  } else {
    out.textContent = '—';
    msg.textContent = res.status === 'error' ? res.message : `Enter ${mode.vars[res.missing].label.replace(/^[A-Z](?![A-Z])/, (c) => c.toLowerCase())} to see the result.`;
    nums.textContent = '';
    copy.disabled = true;
    delete copy.dataset.value;
  }
}

function bindCalc(kpi) {
  const st = kpiState(kpi);

  app.querySelector('.back').addEventListener('click', () => {
    if (cameFromHome && history.length > 1) history.back();
    else location.hash = '#/';
    cameFromHome = false;
  });

  app.querySelector('.star').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const i = store.favorites.indexOf(kpi.id);
    if (i >= 0) store.favorites.splice(i, 1);
    else store.favorites.push(kpi.id);
    save();
    const on = i < 0;
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Remove from favorites' : 'Add to favorites');
  });

  app.querySelectorAll('[data-variant]').forEach((btn) => btn.addEventListener('click', () => {
    st.variants[btn.dataset.variant] = btn.dataset.option;
    const mode = getMode(kpi, st.variants);
    if (!mode.vars[st.solveFor]) st.solveFor = mode.output;
    save();
    renderCalcKeepScroll(kpi);
  }));

  app.querySelectorAll('[data-solve]').forEach((btn) => btn.addEventListener('click', () => {
    const next = btn.dataset.solve;
    if (next === st.solveFor) return;
    const mode = getMode(kpi, st.variants);
    // Carry the current answer into the field it came from, so switching never loses work.
    if (lastResult && lastResult.status === 'ok') st.inputs[st.solveFor] = toInputString(lastResult.value, mode.vars[st.solveFor].unit);
    st.solveFor = next;
    save();
    renderCalcKeepScroll(kpi);
  }));

  app.querySelectorAll('.field input').forEach((el) => el.addEventListener('input', () => {
    st.inputs[el.dataset.var] = el.value;
    save();
    update(kpi);
  }));

  app.querySelector('.inputs').addEventListener('submit', (e) => {
    e.preventDefault();
    document.activeElement?.blur();
  });

  app.querySelector('.copy').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const text = btn.dataset.value;
    if (!text) return;
    let done = false;
    try { await navigator.clipboard.writeText(text); done = true; } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { done = document.execCommand('copy'); } catch { done = false; }
      ta.remove();
    }
    btn.textContent = done ? 'Copied' : 'Copy failed';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
  });

  app.querySelector('.reset').addEventListener('click', () => {
    st.inputs = {};
    st.solveFor = getMode(kpi, st.variants).output;
    save();
    renderCalcKeepScroll(kpi);
  });
}

function renderCalcKeepScroll(kpi) {
  const y = window.scrollY;
  renderCalc(kpi);
  window.scrollTo(0, y);
}

// ─── Boot ───
if (!location.hash || location.hash === '#') {
  if (store.last && KPI_BY_ID[store.last]) history.replaceState(null, '', `#/${store.last}`);
}
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support unavailable */ });
  });
}
