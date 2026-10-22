# KPI Calculator

A mobile-first, installable, offline marketing KPI calculator for strategic marketing and media planning. It has 28 KPIs, and each one can **solve for any variable**. Plain HTML, CSS and JavaScript: no framework, no build step, no runtime dependencies, no backend.

## Install on iPhone

Open the live URL in Safari → Share → Add to Home Screen.

## Formulas

Percents are typed as whole numbers (type `2.5` for 2.5%). Every formula below has a hand-derived inverse for each variable. The app never iterates or root-finds.

| Group | KPI | Formula |
|---|---|---|
| Media | CPM | Cost ÷ Impressions × 1,000 |
| Media | vCPM | Cost ÷ Viewable impressions × 1,000 |
| Media | CPP | Cost ÷ GRPs |
| Media | GRPs / TRPs | Reach % × Average frequency (use target-audience reach for TRPs) |
| Media | Gross impressions | GRPs × Universe ÷ 100 |
| Media | Reach (people) | Reach % × Universe |
| Media | Average frequency | Impressions ÷ Reach (people) |
| Media | CPP ↔ CPM | CPP = CPM × Universe ÷ 100,000 |
| Digital | CPC | Cost ÷ Clicks |
| Digital | CTR | Clicks ÷ Impressions × 100 |
| Digital | Conversion rate | Conversions ÷ Clicks × 100 |
| Digital | CPA | Cost ÷ Conversions |
| Digital | CPL | Cost ÷ Leads |
| Digital | CPV | Cost ÷ Views |
| Digital | Engagement rate | Engagements ÷ Impressions (or Reach) × 100 |
| Revenue | ROAS | Revenue ÷ Ad spend |
| Revenue | ROI (gross profit) | (Revenue × Gross margin % − Cost) ÷ Cost × 100 |
| Revenue | ROI (revenue) | (Revenue − Cost) ÷ Cost × 100 |
| Revenue | Break-even ROAS | 1 ÷ Gross margin % |
| Revenue | MER | Total revenue ÷ Total marketing spend |
| Revenue | AOV | Revenue ÷ Orders |
| Customer | CAC | Total sales & marketing spend ÷ New customers |
| Customer | CLTV (purchase-based) | AOV × Purchases per year × Lifespan (years) [× Gross margin %] |
| Customer | CLTV (subscription) | Monthly ARPA [× Gross margin %] ÷ Monthly churn % |
| Customer | LTV:CAC | CLTV ÷ CAC |
| Customer | CAC payback | CAC ÷ (Monthly ARPA × Gross margin %), in months |
| Customer | Churn rate | Customers lost ÷ Customers at start × 100 |
| Customer | Retention rate | (Customers at end − New customers) ÷ Customers at start × 100 |
| Customer | Purchase frequency | Orders ÷ Unique customers |
| Brand | Share of voice | Brand spend (or impressions) ÷ Category total × 100 |

CLTV's bracketed margin term is used with the **Gross margin** basis and left out with **Revenue**.

## How accuracy is enforced

- All math is in [`formulas.js`](formulas.js) as pure functions over plain doubles. Rounding happens only at display time.
- Percent conversion happens in exactly one place on the way in (`toModel` in [`format.js`](format.js)) and one place on the way out (Intl percent formatting).
- Every division is guarded. A zero divisor shows a message such as "Can't divide by zero: enter Clicks above 0." and never `NaN` or `Infinity`.

## Tests

```bash
node --test
```

No dependencies. The suite covers:

- all 34 golden cases from the spec;
- a round-trip test on every KPI and variant (each input is re-solved from the output to within 1e-9);
- 300 random round trips per KPI/variant;
- a check that every displayed formula evaluates to the same number as its solve function;
- edge cases (zero divisors, blanks, negatives, percent ranges, churn > 0, retention start > 0);
- input parsing.

## Run locally

```bash
python3 -m http.server 8931
```

Then open http://localhost:8931.

## Deploy (GitHub Pages)

Pages serves the `main` branch root. All paths are relative, so the app works from `/<repo-name>/`.

**When you change any app file, bump `CACHE` in [`sw.js`](sw.js)** (e.g. `kpi-v1` → `kpi-v2`). Otherwise installed copies keep serving the old version from cache.

## Icons

`node tools/make-icons.mjs` regenerates `icons/icon.svg` and the 180/192/512 PNGs. It has no dependencies.
