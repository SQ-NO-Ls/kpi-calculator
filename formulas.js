// formulas.js — ALL math and KPI definitions. Pure functions, no DOM.
//
// Conventions
// - Every value is a plain JS number (IEEE-754 double). No rounding happens here.
// - Percent-unit variables are DECIMALS in this file (2.5% === 0.025). The input
//   layer (format.js toModel) divides by 100 once; the display layer formats with
//   Intl's percent style, which multiplies by 100 once.
// - GRPs are rating points: 1 GRP = 1% of the universe, so GRPs = reach × frequency × 100.
// - Every variable has an explicit, hand-derived inverse in `solve`. No iteration.
//
// Formula templates (`formulas`) use {varId} tokens, one template per solve target.
// Percent INPUTS appear as their true value (shown as "40.00%"), and a percent
// OUTPUT's template ends in the expression that gives the whole-number percent
// ("… × 100" when the raw expression is a decimal).

export const GROUPS = [
  { id: 'Media', label: 'Media' },
  { id: 'Digital', label: 'Digital performance' },
  { id: 'Revenue', label: 'Revenue & efficiency' },
  { id: 'Customer', label: 'Customer' },
  { id: 'Brand', label: 'Brand' },
];

export const UNITS = ['currency', 'percent', 'number', 'count', 'ratio', 'months', 'years'];

// Variable options (all optional):
//   min       lowest allowed value in model units (default 0)
//   max       highest allowed value in model units (percent caps use 1 = 100%)
//   positive  must be strictly > 0 (a denominator in the KPI's defining formula)
//   digits    { min, max } display decimals override
//   display   'colon' renders a ratio as "4.0 : 1"

export const KPIS = [
  // ───────────────────────────── Media ─────────────────────────────
  {
    id: 'cpm',
    name: 'CPM',
    fullName: 'Cost Per Mille',
    group: 'Media',
    description: 'Cost to buy 1,000 impressions.',
    keywords: 'thousand impressions cost per thousand mille',
    output: 'cpm',
    variants: null,
    vars: {
      cost: { label: 'Media cost', sym: 'Cost', unit: 'currency', example: '5,000' },
      impressions: { label: 'Impressions', sym: 'Impressions', unit: 'count', example: '1,000,000', positive: true },
      cpm: { label: 'CPM', sym: 'CPM', unit: 'currency', example: '5.00' },
    },
    solve: {
      cpm: ({ cost, impressions }) => (cost / impressions) * 1000,
      cost: ({ cpm, impressions }) => (cpm * impressions) / 1000,
      impressions: ({ cost, cpm }) => (cost / cpm) * 1000,
    },
    formulas: {
      cpm: '{cpm} = {cost} ÷ {impressions} × 1,000',
      cost: '{cost} = {cpm} × {impressions} ÷ 1,000',
      impressions: '{impressions} = {cost} ÷ {cpm} × 1,000',
    },
  },
  {
    id: 'vcpm',
    name: 'vCPM',
    fullName: 'Viewable CPM',
    group: 'Media',
    description: 'Cost per 1,000 impressions that were actually viewable.',
    keywords: 'viewability viewable thousand impressions',
    output: 'vcpm',
    variants: null,
    vars: {
      cost: { label: 'Media cost', sym: 'Cost', unit: 'currency', example: '3,000' },
      viewable: { label: 'Viewable impressions', sym: 'Viewable impressions', unit: 'count', example: '400,000', positive: true },
      vcpm: { label: 'vCPM', sym: 'vCPM', unit: 'currency', example: '7.50' },
    },
    solve: {
      vcpm: ({ cost, viewable }) => (cost / viewable) * 1000,
      cost: ({ vcpm, viewable }) => (vcpm * viewable) / 1000,
      viewable: ({ cost, vcpm }) => (cost / vcpm) * 1000,
    },
    formulas: {
      vcpm: '{vcpm} = {cost} ÷ {viewable} × 1,000',
      cost: '{cost} = {vcpm} × {viewable} ÷ 1,000',
      viewable: '{viewable} = {cost} ÷ {vcpm} × 1,000',
    },
  },
  {
    id: 'cpp',
    name: 'CPP',
    fullName: 'Cost Per Point',
    group: 'Media',
    description: 'Cost to buy one rating point (1% of the audience universe).',
    keywords: 'rating point grp trp tv broadcast',
    output: 'cpp',
    variants: null,
    vars: {
      cost: { label: 'Media cost', sym: 'Cost', unit: 'currency', example: '50,000' },
      grps: { label: 'GRPs / TRPs', sym: 'GRPs', unit: 'number', example: '200', positive: true },
      cpp: { label: 'CPP', sym: 'CPP', unit: 'currency', example: '250' },
    },
    solve: {
      cpp: ({ cost, grps }) => cost / grps,
      cost: ({ cpp, grps }) => cpp * grps,
      grps: ({ cost, cpp }) => cost / cpp,
    },
    formulas: {
      cpp: '{cpp} = {cost} ÷ {grps}',
      cost: '{cost} = {cpp} × {grps}',
      grps: '{grps} = {cost} ÷ {cpp}',
    },
  },
  {
    id: 'grps',
    name: 'GRPs / TRPs',
    fullName: 'Gross Rating Points',
    group: 'Media',
    description: 'Total rating points delivered: reach % times average frequency.',
    note: 'Use your target-audience reach for TRPs.',
    keywords: 'gross rating points target rating points trp weight',
    output: 'grps',
    variants: null,
    vars: {
      reach: { label: 'Reach %', sym: 'Reach %', unit: 'percent', example: '60', max: 1 },
      freq: { label: 'Average frequency', sym: 'Frequency', unit: 'number', example: '3.5', digits: { min: 2, max: 2 } },
      grps: { label: 'GRPs / TRPs', sym: 'GRPs', unit: 'number', example: '210' },
    },
    solve: {
      grps: ({ reach, freq }) => reach * freq * 100,
      reach: ({ grps, freq }) => grps / freq / 100,
      freq: ({ grps, reach }) => grps / reach / 100,
    },
    formulas: {
      grps: '{grps} = {reach} × {freq} × 100',
      reach: '{reach} = {grps} ÷ {freq}',
      freq: '{freq} = {grps} ÷ ({reach} × 100)',
    },
  },
  {
    id: 'impressions',
    name: 'Impressions',
    fullName: 'Gross Impressions',
    group: 'Media',
    description: 'Total impressions delivered by a GRP level in a given universe.',
    keywords: 'gross impressions grps universe audience size',
    output: 'impressions',
    variants: null,
    vars: {
      grps: { label: 'GRPs / TRPs', sym: 'GRPs', unit: 'number', example: '210' },
      universe: { label: 'Universe (people)', sym: 'Universe', unit: 'count', example: '2,000,000' },
      impressions: { label: 'Gross impressions', sym: 'Impressions', unit: 'count', example: '4,200,000' },
    },
    solve: {
      impressions: ({ grps, universe }) => (grps * universe) / 100,
      grps: ({ impressions, universe }) => (impressions * 100) / universe,
      universe: ({ impressions, grps }) => (impressions * 100) / grps,
    },
    formulas: {
      impressions: '{impressions} = {grps} × {universe} ÷ 100',
      grps: '{grps} = {impressions} × 100 ÷ {universe}',
      universe: '{universe} = {impressions} × 100 ÷ {grps}',
    },
  },
  {
    id: 'reach',
    name: 'Reach #',
    fullName: 'Reach (people)',
    group: 'Media',
    description: 'Number of unique people reached, from reach % and universe.',
    keywords: 'reach people unique audience universe',
    output: 'reachNum',
    variants: null,
    vars: {
      reach: { label: 'Reach %', sym: 'Reach %', unit: 'percent', example: '60', max: 1 },
      universe: { label: 'Universe (people)', sym: 'Universe', unit: 'count', example: '2,000,000' },
      reachNum: { label: 'Reach (people)', sym: 'Reach #', unit: 'count', example: '1,200,000' },
    },
    solve: {
      reachNum: ({ reach, universe }) => reach * universe,
      reach: ({ reachNum, universe }) => reachNum / universe,
      universe: ({ reachNum, reach }) => reachNum / reach,
    },
    formulas: {
      reachNum: '{reachNum} = {reach} × {universe}',
      reach: '{reach} = {reachNum} ÷ {universe} × 100',
      universe: '{universe} = {reachNum} ÷ {reach}',
    },
  },
  {
    id: 'frequency',
    name: 'Frequency',
    fullName: 'Average Frequency',
    group: 'Media',
    description: 'Average number of times each reached person saw the ad.',
    keywords: 'average frequency impressions reach exposures',
    output: 'freq',
    variants: null,
    vars: {
      impressions: { label: 'Impressions', sym: 'Impressions', unit: 'count', example: '4,200,000' },
      reachNum: { label: 'Reach (people)', sym: 'Reach #', unit: 'count', example: '1,200,000', positive: true },
      freq: { label: 'Average frequency', sym: 'Frequency', unit: 'number', example: '3.5', digits: { min: 2, max: 2 } },
    },
    solve: {
      freq: ({ impressions, reachNum }) => impressions / reachNum,
      impressions: ({ freq, reachNum }) => freq * reachNum,
      reachNum: ({ impressions, freq }) => impressions / freq,
    },
    formulas: {
      freq: '{freq} = {impressions} ÷ {reachNum}',
      impressions: '{impressions} = {freq} × {reachNum}',
      reachNum: '{reachNum} = {impressions} ÷ {freq}',
    },
  },
  {
    id: 'cppcpm',
    name: 'CPP ↔ CPM',
    fullName: 'CPP / CPM Converter',
    group: 'Media',
    description: 'Convert between cost per point and CPM for an audience universe.',
    note: 'Universe = number of people in the audience.',
    keywords: 'convert converter cost per point cpm universe',
    output: 'cpp',
    variants: null,
    vars: {
      cpm: { label: 'CPM', sym: 'CPM', unit: 'currency', example: '10' },
      universe: { label: 'Universe (people)', sym: 'Universe', unit: 'count', example: '1,000,000' },
      cpp: { label: 'CPP', sym: 'CPP', unit: 'currency', example: '100' },
    },
    solve: {
      cpp: ({ cpm, universe }) => (cpm * universe) / 100000,
      cpm: ({ cpp, universe }) => (cpp * 100000) / universe,
      universe: ({ cpp, cpm }) => (cpp * 100000) / cpm,
    },
    formulas: {
      cpp: '{cpp} = {cpm} × {universe} ÷ 100,000',
      cpm: '{cpm} = {cpp} × 100,000 ÷ {universe}',
      universe: '{universe} = {cpp} × 100,000 ÷ {cpm}',
    },
  },

  // ─────────────────────────── Digital ───────────────────────────
  {
    id: 'cpc',
    name: 'CPC',
    fullName: 'Cost Per Click',
    group: 'Digital',
    description: 'Average cost of each click.',
    keywords: 'click paid search ppc',
    output: 'cpc',
    variants: null,
    vars: {
      cost: { label: 'Cost', sym: 'Cost', unit: 'currency', example: '2,000' },
      clicks: { label: 'Clicks', sym: 'Clicks', unit: 'count', example: '800', positive: true },
      cpc: { label: 'CPC', sym: 'CPC', unit: 'currency', example: '2.50' },
    },
    solve: {
      cpc: ({ cost, clicks }) => cost / clicks,
      cost: ({ cpc, clicks }) => cpc * clicks,
      clicks: ({ cost, cpc }) => cost / cpc,
    },
    formulas: {
      cpc: '{cpc} = {cost} ÷ {clicks}',
      cost: '{cost} = {cpc} × {clicks}',
      clicks: '{clicks} = {cost} ÷ {cpc}',
    },
  },
  {
    id: 'ctr',
    name: 'CTR',
    fullName: 'Click-Through Rate',
    group: 'Digital',
    description: 'Share of impressions that turned into clicks.',
    keywords: 'click through rate clicks impressions',
    output: 'ctr',
    variants: null,
    vars: {
      clicks: { label: 'Clicks', sym: 'Clicks', unit: 'count', example: '800' },
      impressions: { label: 'Impressions', sym: 'Impressions', unit: 'count', example: '100,000', positive: true },
      ctr: { label: 'CTR', sym: 'CTR', unit: 'percent', example: '0.8', max: 1 },
    },
    solve: {
      ctr: ({ clicks, impressions }) => clicks / impressions,
      clicks: ({ ctr, impressions }) => ctr * impressions,
      impressions: ({ clicks, ctr }) => clicks / ctr,
    },
    formulas: {
      ctr: '{ctr} = {clicks} ÷ {impressions} × 100',
      clicks: '{clicks} = {ctr} × {impressions}',
      impressions: '{impressions} = {clicks} ÷ {ctr}',
    },
  },
  {
    id: 'cvr',
    name: 'Conv. rate',
    fullName: 'Conversion Rate',
    group: 'Digital',
    description: 'Share of clicks that converted.',
    keywords: 'conversion rate cvr conversions clicks',
    output: 'cvr',
    variants: null,
    vars: {
      conversions: { label: 'Conversions', sym: 'Conversions', unit: 'count', example: '40' },
      clicks: { label: 'Clicks', sym: 'Clicks', unit: 'count', example: '800', positive: true },
      cvr: { label: 'Conversion rate', sym: 'Conv. rate', unit: 'percent', example: '5', max: 1 },
    },
    solve: {
      cvr: ({ conversions, clicks }) => conversions / clicks,
      conversions: ({ cvr, clicks }) => cvr * clicks,
      clicks: ({ conversions, cvr }) => conversions / cvr,
    },
    formulas: {
      cvr: '{cvr} = {conversions} ÷ {clicks} × 100',
      conversions: '{conversions} = {cvr} × {clicks}',
      clicks: '{clicks} = {conversions} ÷ {cvr}',
    },
  },
  {
    id: 'cpa',
    name: 'CPA',
    fullName: 'Cost Per Acquisition',
    group: 'Digital',
    description: 'Average cost of each conversion.',
    keywords: 'cost per action acquisition conversion',
    output: 'cpa',
    variants: null,
    vars: {
      cost: { label: 'Cost', sym: 'Cost', unit: 'currency', example: '2,000' },
      conversions: { label: 'Conversions', sym: 'Conversions', unit: 'count', example: '40', positive: true },
      cpa: { label: 'CPA', sym: 'CPA', unit: 'currency', example: '50' },
    },
    solve: {
      cpa: ({ cost, conversions }) => cost / conversions,
      cost: ({ cpa, conversions }) => cpa * conversions,
      conversions: ({ cost, cpa }) => cost / cpa,
    },
    formulas: {
      cpa: '{cpa} = {cost} ÷ {conversions}',
      cost: '{cost} = {cpa} × {conversions}',
      conversions: '{conversions} = {cost} ÷ {cpa}',
    },
  },
  {
    id: 'cpl',
    name: 'CPL',
    fullName: 'Cost Per Lead',
    group: 'Digital',
    description: 'Average cost of each lead.',
    keywords: 'lead gen leads',
    output: 'cpl',
    variants: null,
    vars: {
      cost: { label: 'Cost', sym: 'Cost', unit: 'currency', example: '3,000' },
      leads: { label: 'Leads', sym: 'Leads', unit: 'count', example: '120', positive: true },
      cpl: { label: 'CPL', sym: 'CPL', unit: 'currency', example: '25' },
    },
    solve: {
      cpl: ({ cost, leads }) => cost / leads,
      cost: ({ cpl, leads }) => cpl * leads,
      leads: ({ cost, cpl }) => cost / cpl,
    },
    formulas: {
      cpl: '{cpl} = {cost} ÷ {leads}',
      cost: '{cost} = {cpl} × {leads}',
      leads: '{leads} = {cost} ÷ {cpl}',
    },
  },
  {
    id: 'cpv',
    name: 'CPV',
    fullName: 'Cost Per View',
    group: 'Digital',
    description: 'Average cost of each video view.',
    keywords: 'video view youtube',
    output: 'cpv',
    variants: null,
    vars: {
      cost: { label: 'Cost', sym: 'Cost', unit: 'currency', example: '1,500' },
      views: { label: 'Views', sym: 'Views', unit: 'count', example: '30,000', positive: true },
      cpv: { label: 'CPV', sym: 'CPV', unit: 'currency', example: '0.05' },
    },
    solve: {
      cpv: ({ cost, views }) => cost / views,
      cost: ({ cpv, views }) => cpv * views,
      views: ({ cost, cpv }) => cost / cpv,
    },
    formulas: {
      cpv: '{cpv} = {cost} ÷ {views}',
      cost: '{cost} = {cpv} × {views}',
      views: '{views} = {cost} ÷ {cpv}',
    },
  },
  {
    id: 'er',
    name: 'Engagement',
    fullName: 'Engagement Rate',
    group: 'Digital',
    description: 'Engagements as a share of impressions or of people reached.',
    keywords: 'engagement rate social likes comments shares',
    output: 'er',
    variants: [
      { id: 'per', label: 'Per', options: [{ id: 'impressions', label: 'Impressions' }, { id: 'reach', label: 'Reach' }] },
    ],
    modes: {
      impressions: {
        vars: {
          engagements: { label: 'Engagements', sym: 'Engagements', unit: 'count', example: '2,500' },
          impressions: { label: 'Impressions', sym: 'Impressions', unit: 'count', example: '100,000', positive: true },
          er: { label: 'Engagement rate', sym: 'Engagement rate', unit: 'percent', example: '2.5' },
        },
        solve: {
          er: ({ engagements, impressions }) => engagements / impressions,
          engagements: ({ er, impressions }) => er * impressions,
          impressions: ({ engagements, er }) => engagements / er,
        },
        formulas: {
          er: '{er} = {engagements} ÷ {impressions} × 100',
          engagements: '{engagements} = {er} × {impressions}',
          impressions: '{impressions} = {engagements} ÷ {er}',
        },
      },
      reach: {
        vars: {
          engagements: { label: 'Engagements', sym: 'Engagements', unit: 'count', example: '2,500' },
          reachNum: { label: 'Reach (people)', sym: 'Reach', unit: 'count', example: '50,000', positive: true },
          er: { label: 'Engagement rate', sym: 'Engagement rate', unit: 'percent', example: '5' },
        },
        solve: {
          er: ({ engagements, reachNum }) => engagements / reachNum,
          engagements: ({ er, reachNum }) => er * reachNum,
          reachNum: ({ engagements, er }) => engagements / er,
        },
        formulas: {
          er: '{er} = {engagements} ÷ {reachNum} × 100',
          engagements: '{engagements} = {er} × {reachNum}',
          reachNum: '{reachNum} = {engagements} ÷ {er}',
        },
      },
    },
  },

  // ─────────────────────────── Revenue ───────────────────────────
  {
    id: 'roas',
    name: 'ROAS',
    fullName: 'Return On Ad Spend',
    group: 'Revenue',
    description: 'Revenue generated for every dollar of ad spend.',
    keywords: 'return on ad spend revenue',
    output: 'roas',
    variants: null,
    vars: {
      revenue: { label: 'Revenue', sym: 'Revenue', unit: 'currency', example: '20,000' },
      spend: { label: 'Ad spend', sym: 'Ad spend', unit: 'currency', example: '5,000', positive: true },
      roas: { label: 'ROAS', sym: 'ROAS', unit: 'ratio', example: '4' },
    },
    solve: {
      roas: ({ revenue, spend }) => revenue / spend,
      revenue: ({ roas, spend }) => roas * spend,
      spend: ({ revenue, roas }) => revenue / roas,
    },
    formulas: {
      roas: '{roas} = {revenue} ÷ {spend}',
      revenue: '{revenue} = {roas} × {spend}',
      spend: '{spend} = {revenue} ÷ {roas}',
    },
  },
  {
    id: 'roi',
    name: 'ROI',
    fullName: 'Return On Investment',
    group: 'Revenue',
    description: 'Profit (or revenue) gained per dollar spent, net of the spend. Can be negative.',
    keywords: 'return on investment profit gross margin',
    output: 'roi',
    variants: [
      { id: 'basis', label: 'Basis', options: [{ id: 'gross', label: 'Gross profit' }, { id: 'revenue', label: 'Revenue' }] },
    ],
    modes: {
      gross: {
        vars: {
          revenue: { label: 'Revenue', sym: 'Revenue', unit: 'currency', example: '20,000' },
          margin: { label: 'Gross margin', sym: 'Gross margin %', unit: 'percent', example: '40', max: 1 },
          cost: { label: 'Cost', sym: 'Cost', unit: 'currency', example: '5,000', positive: true },
          roi: { label: 'ROI', sym: 'ROI', unit: 'percent', example: '60', min: -1 },
        },
        solve: {
          roi: ({ revenue, margin, cost }) => (revenue * margin - cost) / cost,
          revenue: ({ roi, margin, cost }) => (cost * (1 + roi)) / margin,
          margin: ({ roi, revenue, cost }) => (cost * (1 + roi)) / revenue,
          cost: ({ roi, revenue, margin }) => (revenue * margin) / (1 + roi),
        },
        formulas: {
          roi: '{roi} = ({revenue} × {margin} − {cost}) ÷ {cost} × 100',
          revenue: '{revenue} = {cost} × (1 + {roi}) ÷ {margin}',
          margin: '{margin} = {cost} × (1 + {roi}) ÷ {revenue} × 100',
          cost: '{cost} = {revenue} × {margin} ÷ (1 + {roi})',
        },
      },
      revenue: {
        vars: {
          revenue: { label: 'Revenue', sym: 'Revenue', unit: 'currency', example: '20,000' },
          cost: { label: 'Cost', sym: 'Cost', unit: 'currency', example: '5,000', positive: true },
          roi: { label: 'ROI', sym: 'ROI', unit: 'percent', example: '300', min: -1 },
        },
        solve: {
          roi: ({ revenue, cost }) => (revenue - cost) / cost,
          revenue: ({ roi, cost }) => cost * (1 + roi),
          cost: ({ roi, revenue }) => revenue / (1 + roi),
        },
        formulas: {
          roi: '{roi} = ({revenue} − {cost}) ÷ {cost} × 100',
          revenue: '{revenue} = {cost} × (1 + {roi})',
          cost: '{cost} = {revenue} ÷ (1 + {roi})',
        },
      },
    },
  },
  {
    id: 'beroas',
    name: 'Break-even ROAS',
    fullName: 'Break-even ROAS',
    group: 'Revenue',
    description: 'The ROAS at which gross profit exactly covers ad spend.',
    keywords: 'break even breakeven roas gross margin minimum',
    output: 'beroas',
    variants: null,
    vars: {
      margin: { label: 'Gross margin', sym: 'Gross margin %', unit: 'percent', example: '40', max: 1, positive: true },
      beroas: { label: 'Break-even ROAS', sym: 'Break-even ROAS', unit: 'ratio', example: '2.5' },
    },
    solve: {
      beroas: ({ margin }) => 1 / margin,
      margin: ({ beroas }) => 1 / beroas,
    },
    formulas: {
      beroas: '{beroas} = 1 ÷ {margin}',
      margin: '{margin} = 1 ÷ {beroas} × 100',
    },
  },
  {
    id: 'mer',
    name: 'MER',
    fullName: 'Marketing Efficiency Ratio',
    group: 'Revenue',
    description: 'Blended ROAS: total revenue per dollar of total marketing spend.',
    keywords: 'marketing efficiency ratio blended roas total',
    output: 'mer',
    variants: null,
    vars: {
      revenue: { label: 'Total revenue', sym: 'Total revenue', unit: 'currency', example: '500,000' },
      spend: { label: 'Total marketing spend', sym: 'Total spend', unit: 'currency', example: '100,000', positive: true },
      mer: { label: 'MER', sym: 'MER', unit: 'ratio', example: '5' },
    },
    solve: {
      mer: ({ revenue, spend }) => revenue / spend,
      revenue: ({ mer, spend }) => mer * spend,
      spend: ({ revenue, mer }) => revenue / mer,
    },
    formulas: {
      mer: '{mer} = {revenue} ÷ {spend}',
      revenue: '{revenue} = {mer} × {spend}',
      spend: '{spend} = {revenue} ÷ {mer}',
    },
  },
  {
    id: 'aov',
    name: 'AOV',
    fullName: 'Average Order Value',
    group: 'Revenue',
    description: 'Average revenue per order.',
    keywords: 'average order value basket cart',
    output: 'aov',
    variants: null,
    vars: {
      revenue: { label: 'Revenue', sym: 'Revenue', unit: 'currency', example: '50,000' },
      orders: { label: 'Orders', sym: 'Orders', unit: 'count', example: '625', positive: true },
      aov: { label: 'AOV', sym: 'AOV', unit: 'currency', example: '80' },
    },
    solve: {
      aov: ({ revenue, orders }) => revenue / orders,
      revenue: ({ aov, orders }) => aov * orders,
      orders: ({ revenue, aov }) => revenue / aov,
    },
    formulas: {
      aov: '{aov} = {revenue} ÷ {orders}',
      revenue: '{revenue} = {aov} × {orders}',
      orders: '{orders} = {revenue} ÷ {aov}',
    },
  },

  // ─────────────────────────── Customer ───────────────────────────
  {
    id: 'cac',
    name: 'CAC',
    fullName: 'Customer Acquisition Cost',
    group: 'Customer',
    description: 'Total sales and marketing spend per new customer.',
    keywords: 'customer acquisition cost new customers',
    output: 'cac',
    variants: null,
    vars: {
      spend: { label: 'Total sales & marketing spend', sym: 'S&M spend', unit: 'currency', example: '60,000' },
      newCustomers: { label: 'New customers acquired', sym: 'New customers', unit: 'count', example: '400', positive: true },
      cac: { label: 'CAC', sym: 'CAC', unit: 'currency', example: '150' },
    },
    solve: {
      cac: ({ spend, newCustomers }) => spend / newCustomers,
      spend: ({ cac, newCustomers }) => cac * newCustomers,
      newCustomers: ({ spend, cac }) => spend / cac,
    },
    formulas: {
      cac: '{cac} = {spend} ÷ {newCustomers}',
      spend: '{spend} = {cac} × {newCustomers}',
      newCustomers: '{newCustomers} = {spend} ÷ {cac}',
    },
  },
  {
    id: 'cltv',
    name: 'CLTV',
    fullName: 'Customer Lifetime Value',
    group: 'Customer',
    description: 'Total value a customer brings over their whole relationship with you.',
    keywords: 'lifetime value ltv clv subscription churn',
    output: 'cltv',
    variants: [
      { id: 'model', label: 'Model', options: [{ id: 'purchase', label: 'Purchase-based' }, { id: 'subscription', label: 'Subscription' }] },
      { id: 'basis', label: 'Basis', options: [{ id: 'margin', label: 'Gross margin' }, { id: 'revenue', label: 'Revenue' }] },
    ],
    modes: {
      'purchase|margin': {
        vars: {
          aov: { label: 'Average order value', sym: 'AOV', unit: 'currency', example: '80' },
          ppy: { label: 'Purchases per year', sym: 'Purchases/yr', unit: 'number', example: '3' },
          lifespan: { label: 'Customer lifespan', sym: 'Lifespan', unit: 'years', example: '2' },
          margin: { label: 'Gross margin', sym: 'Gross margin %', unit: 'percent', example: '50', max: 1 },
          cltv: { label: 'CLTV', sym: 'CLTV', unit: 'currency', example: '240' },
        },
        solve: {
          cltv: ({ aov, ppy, lifespan, margin }) => aov * ppy * lifespan * margin,
          aov: ({ cltv, ppy, lifespan, margin }) => cltv / (ppy * lifespan * margin),
          ppy: ({ cltv, aov, lifespan, margin }) => cltv / (aov * lifespan * margin),
          lifespan: ({ cltv, aov, ppy, margin }) => cltv / (aov * ppy * margin),
          margin: ({ cltv, aov, ppy, lifespan }) => cltv / (aov * ppy * lifespan),
        },
        formulas: {
          cltv: '{cltv} = {aov} × {ppy} × {lifespan} × {margin}',
          aov: '{aov} = {cltv} ÷ ({ppy} × {lifespan} × {margin})',
          ppy: '{ppy} = {cltv} ÷ ({aov} × {lifespan} × {margin})',
          lifespan: '{lifespan} = {cltv} ÷ ({aov} × {ppy} × {margin})',
          margin: '{margin} = {cltv} ÷ ({aov} × {ppy} × {lifespan}) × 100',
        },
      },
      'purchase|revenue': {
        vars: {
          aov: { label: 'Average order value', sym: 'AOV', unit: 'currency', example: '80' },
          ppy: { label: 'Purchases per year', sym: 'Purchases/yr', unit: 'number', example: '3' },
          lifespan: { label: 'Customer lifespan', sym: 'Lifespan', unit: 'years', example: '2' },
          cltv: { label: 'CLTV', sym: 'CLTV', unit: 'currency', example: '480' },
        },
        solve: {
          cltv: ({ aov, ppy, lifespan }) => aov * ppy * lifespan,
          aov: ({ cltv, ppy, lifespan }) => cltv / (ppy * lifespan),
          ppy: ({ cltv, aov, lifespan }) => cltv / (aov * lifespan),
          lifespan: ({ cltv, aov, ppy }) => cltv / (aov * ppy),
        },
        formulas: {
          cltv: '{cltv} = {aov} × {ppy} × {lifespan}',
          aov: '{aov} = {cltv} ÷ ({ppy} × {lifespan})',
          ppy: '{ppy} = {cltv} ÷ ({aov} × {lifespan})',
          lifespan: '{lifespan} = {cltv} ÷ ({aov} × {ppy})',
        },
      },
      'subscription|margin': {
        vars: {
          arpa: { label: 'Monthly revenue per account (ARPA)', sym: 'ARPA', unit: 'currency', example: '100' },
          margin: { label: 'Gross margin', sym: 'Gross margin %', unit: 'percent', example: '80', max: 1 },
          churn: { label: 'Monthly churn', sym: 'Churn %', unit: 'percent', example: '4', max: 1, positive: true },
          cltv: { label: 'CLTV', sym: 'CLTV', unit: 'currency', example: '2,000' },
        },
        solve: {
          cltv: ({ arpa, margin, churn }) => (arpa * margin) / churn,
          arpa: ({ cltv, margin, churn }) => (cltv * churn) / margin,
          margin: ({ cltv, arpa, churn }) => (cltv * churn) / arpa,
          churn: ({ cltv, arpa, margin }) => (arpa * margin) / cltv,
        },
        formulas: {
          cltv: '{cltv} = {arpa} × {margin} ÷ {churn}',
          arpa: '{arpa} = {cltv} × {churn} ÷ {margin}',
          margin: '{margin} = {cltv} × {churn} ÷ {arpa} × 100',
          churn: '{churn} = {arpa} × {margin} ÷ {cltv} × 100',
        },
      },
      'subscription|revenue': {
        vars: {
          arpa: { label: 'Monthly revenue per account (ARPA)', sym: 'ARPA', unit: 'currency', example: '100' },
          churn: { label: 'Monthly churn', sym: 'Churn %', unit: 'percent', example: '4', max: 1, positive: true },
          cltv: { label: 'CLTV', sym: 'CLTV', unit: 'currency', example: '2,500' },
        },
        solve: {
          cltv: ({ arpa, churn }) => arpa / churn,
          arpa: ({ cltv, churn }) => cltv * churn,
          churn: ({ cltv, arpa }) => arpa / cltv,
        },
        formulas: {
          cltv: '{cltv} = {arpa} ÷ {churn}',
          arpa: '{arpa} = {cltv} × {churn}',
          churn: '{churn} = {arpa} ÷ {cltv} × 100',
        },
      },
    },
  },
  {
    id: 'ltvcac',
    name: 'LTV:CAC',
    fullName: 'LTV to CAC Ratio',
    group: 'Customer',
    description: 'How many dollars of lifetime value each acquisition dollar buys.',
    note: '3:1 or higher is the common benchmark.',
    keywords: 'ltv cac ratio lifetime value acquisition unit economics',
    output: 'ltvcac',
    variants: null,
    vars: {
      cltv: { label: 'CLTV', sym: 'CLTV', unit: 'currency', example: '2,000' },
      cac: { label: 'CAC', sym: 'CAC', unit: 'currency', example: '500', positive: true },
      ltvcac: { label: 'LTV:CAC', sym: 'LTV:CAC', unit: 'ratio', display: 'colon', example: '4' },
    },
    solve: {
      ltvcac: ({ cltv, cac }) => cltv / cac,
      cltv: ({ ltvcac, cac }) => ltvcac * cac,
      cac: ({ cltv, ltvcac }) => cltv / ltvcac,
    },
    formulas: {
      ltvcac: '{ltvcac} = {cltv} ÷ {cac}',
      cltv: '{cltv} = {ltvcac} × {cac}',
      cac: '{cac} = {cltv} ÷ {ltvcac}',
    },
  },
  {
    id: 'payback',
    name: 'CAC payback',
    fullName: 'CAC Payback Period',
    group: 'Customer',
    description: 'Months of gross profit needed to earn back the cost of acquiring a customer.',
    keywords: 'cac payback period months recover subscription saas',
    output: 'payback',
    variants: null,
    vars: {
      cac: { label: 'CAC', sym: 'CAC', unit: 'currency', example: '500' },
      arpa: { label: 'Monthly revenue per account (ARPA)', sym: 'ARPA', unit: 'currency', example: '100', positive: true },
      margin: { label: 'Gross margin', sym: 'Gross margin %', unit: 'percent', example: '80', max: 1, positive: true },
      payback: { label: 'CAC payback', sym: 'Payback', unit: 'months', example: '6.25' },
    },
    solve: {
      payback: ({ cac, arpa, margin }) => cac / (arpa * margin),
      cac: ({ payback, arpa, margin }) => payback * arpa * margin,
      arpa: ({ cac, payback, margin }) => cac / (payback * margin),
      margin: ({ cac, payback, arpa }) => cac / (payback * arpa),
    },
    formulas: {
      payback: '{payback} = {cac} ÷ ({arpa} × {margin})',
      cac: '{cac} = {payback} × {arpa} × {margin}',
      arpa: '{arpa} = {cac} ÷ ({payback} × {margin})',
      margin: '{margin} = {cac} ÷ ({payback} × {arpa}) × 100',
    },
  },
  {
    id: 'churn',
    name: 'Churn',
    fullName: 'Churn Rate',
    group: 'Customer',
    description: 'Share of starting customers lost during the period.',
    keywords: 'churn rate attrition lost customers cancel',
    output: 'churn',
    variants: null,
    vars: {
      lost: { label: 'Customers lost in period', sym: 'Lost', unit: 'count', example: '30' },
      start: { label: 'Customers at start', sym: 'Start', unit: 'count', example: '1,000', positive: true },
      churn: { label: 'Churn rate', sym: 'Churn', unit: 'percent', example: '3', max: 1 },
    },
    solve: {
      churn: ({ lost, start }) => lost / start,
      lost: ({ churn, start }) => churn * start,
      start: ({ lost, churn }) => lost / churn,
    },
    formulas: {
      churn: '{churn} = {lost} ÷ {start} × 100',
      lost: '{lost} = {churn} × {start}',
      start: '{start} = {lost} ÷ {churn}',
    },
  },
  {
    id: 'retention',
    name: 'Retention',
    fullName: 'Customer Retention Rate',
    group: 'Customer',
    description: 'Share of starting customers still with you at the end of the period.',
    keywords: 'retention rate crr retained customers',
    output: 'retention',
    variants: null,
    vars: {
      start: { label: 'Customers at start', sym: 'Start', unit: 'count', example: '1,000', positive: true },
      end: { label: 'Customers at end', sym: 'End', unit: 'count', example: '1,050' },
      newCust: { label: 'New customers acquired', sym: 'New', unit: 'count', example: '100' },
      retention: { label: 'Retention rate', sym: 'Retention', unit: 'percent', example: '95', max: 1 },
    },
    solve: {
      retention: ({ start, end, newCust }) => (end - newCust) / start,
      end: ({ retention, start, newCust }) => retention * start + newCust,
      newCust: ({ retention, start, end }) => end - retention * start,
      start: ({ retention, end, newCust }) => (end - newCust) / retention,
    },
    formulas: {
      retention: '{retention} = ({end} − {newCust}) ÷ {start} × 100',
      end: '{end} = {retention} × {start} + {newCust}',
      newCust: '{newCust} = {end} − {retention} × {start}',
      start: '{start} = ({end} − {newCust}) ÷ {retention}',
    },
  },
  {
    id: 'pf',
    name: 'Purchase freq.',
    fullName: 'Purchase Frequency',
    group: 'Customer',
    description: 'Average number of orders per unique customer.',
    keywords: 'purchase frequency orders per customer repeat',
    output: 'pf',
    variants: null,
    vars: {
      orders: { label: 'Orders', sym: 'Orders', unit: 'count', example: '1,200' },
      customers: { label: 'Unique customers', sym: 'Customers', unit: 'count', example: '400', positive: true },
      pf: { label: 'Purchase frequency', sym: 'Purchase freq.', unit: 'number', example: '3', digits: { min: 2, max: 2 } },
    },
    solve: {
      pf: ({ orders, customers }) => orders / customers,
      orders: ({ pf, customers }) => pf * customers,
      customers: ({ orders, pf }) => orders / pf,
    },
    formulas: {
      pf: '{pf} = {orders} ÷ {customers}',
      orders: '{orders} = {pf} × {customers}',
      customers: '{customers} = {orders} ÷ {pf}',
    },
  },

  // ──────────────────────────── Brand ────────────────────────────
  {
    id: 'sov',
    name: 'SOV',
    fullName: 'Share of Voice',
    group: 'Brand',
    description: "Your brand's share of total category spend (or impressions).",
    keywords: 'share of voice sov category competitive spend impressions',
    output: 'sov',
    variants: null,
    vars: {
      brand: { label: 'Brand spend (or impressions)', sym: 'Brand', unit: 'number', example: '2,000,000' },
      category: { label: 'Total category spend (or impressions)', sym: 'Category', unit: 'number', example: '10,000,000', positive: true },
      sov: { label: 'Share of voice', sym: 'SOV', unit: 'percent', example: '20', max: 1 },
    },
    solve: {
      sov: ({ brand, category }) => brand / category,
      brand: ({ sov, category }) => sov * category,
      category: ({ brand, sov }) => brand / sov,
    },
    formulas: {
      sov: '{sov} = {brand} ÷ {category} × 100',
      brand: '{brand} = {sov} × {category}',
      category: '{category} = {brand} ÷ {sov}',
    },
  },
];

export const KPI_BY_ID = Object.fromEntries(KPIS.map((k) => [k.id, k]));

/** Default state for a KPI's toggles: the first option of each. */
export function defaultVariants(kpi) {
  if (!kpi.variants) return {};
  return Object.fromEntries(kpi.variants.map((v) => [v.id, v.options[0].id]));
}

/** Resolve the active { vars, solve, formulas, output, formulaText } for a KPI + toggle state. */
export function getMode(kpi, variantState = {}) {
  if (!kpi.variants) {
    return { vars: kpi.vars, solve: kpi.solve, formulas: kpi.formulas, output: kpi.output, formulaText: kpi.formulaText };
  }
  const key = kpi.variants
    .map((v) => (v.options.some((o) => o.id === variantState[v.id]) ? variantState[v.id] : v.options[0].id))
    .join('|');
  const mode = kpi.modes[key];
  return { vars: mode.vars, solve: mode.solve, formulas: mode.formulas, output: kpi.output, formulaText: mode.formulaText };
}

/** Render a formula template with each variable's symbol, e.g. "CPP = Cost ÷ GRPs". */
export function symbolicFormula(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, id) => (vars[id] ? vars[id].sym : id));
}

// Precompute formulaText for the default output of every KPI / mode.
for (const kpi of KPIS) {
  if (kpi.variants) {
    for (const mode of Object.values(kpi.modes)) mode.formulaText = symbolicFormula(mode.formulas[kpi.output], mode.vars);
  } else {
    kpi.formulaText = symbolicFormula(kpi.formulas[kpi.output], kpi.vars);
  }
}

const isBlank = (v) => v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v));

/** Range check for one input value (model units). Returns an error message or null. */
export function checkValue(def, value) {
  const min = def.min ?? 0;
  if (def.positive && value === 0) return `Can't divide by zero: enter ${def.label} above 0.`;
  if (def.unit === 'percent') {
    if (def.max !== undefined && (value < min || value > def.max)) {
      return min < 0
        ? `${def.label} must be between ${min * 100}% and ${def.max * 100}%.`
        : `${def.label} must be between 0 and 100%.`;
    }
    if (value < min) return min < 0 ? `${def.label} can't be below ${min * 100}%.` : `${def.label} can't be negative.`;
    return null;
  }
  if (value < min) return `${def.label} can't be negative.`;
  if (def.max !== undefined && value > def.max) return `${def.label} is too large.`;
  return null;
}

/**
 * Solve one KPI.
 * @param kpi           KPI config from KPIS
 * @param variantState  toggle state, e.g. { model: 'subscription', basis: 'margin' }
 * @param solveFor      variable id to solve for (falls back to the KPI's default output)
 * @param values        { varId: number } in MODEL units (percents as decimals). Blank = undefined.
 * @returns {status:'empty', missing} | {status:'error', message, field?} | {status:'ok', value, target}
 */
export function calculate(kpi, variantState, solveFor, values) {
  const mode = getMode(kpi, variantState);
  const target = mode.vars[solveFor] ? solveFor : mode.output;
  const inputs = Object.keys(mode.vars).filter((k) => k !== target);

  for (const k of inputs) if (isBlank(values[k])) return { status: 'empty', missing: k, target };

  for (const k of inputs) {
    const v = values[k];
    if (!Number.isFinite(v)) return { status: 'error', message: `Enter a valid number for ${mode.vars[k].label}.`, field: k, target };
    const err = checkValue(mode.vars[k], v);
    if (err) return { status: 'error', message: err, field: k, target };
  }

  const args = Object.fromEntries(inputs.map((k) => [k, values[k]]));
  let value = mode.solve[target](args);

  if (!Number.isFinite(value)) {
    // Find the zero input that causes the division: swap each zero for 1 and retry.
    for (const k of inputs) {
      if (args[k] !== 0) continue;
      const retry = mode.solve[target]({ ...args, [k]: 1 });
      if (Number.isFinite(retry)) return { status: 'error', message: `Can't divide by zero: enter ${mode.vars[k].label} above 0.`, field: k, target };
    }
    return { status: 'error', message: "Can't divide by zero with these values. Adjust the inputs.", target };
  }

  // Snap float noise at a boundary (e.g. 950 − 0.95 × 1000 = −1.1e-13) to the boundary.
  // Percents are dimensionless (0–1), so their tolerance is absolute; other units carry
  // cancellation noise proportional to the largest input (a few ulps of it).
  const def = mode.vars[target];
  const scale = Math.max(1, ...inputs.map((k) => Math.abs(args[k])));
  const tol = def.unit === 'percent' ? 1e-12 : 1e-14 * scale;
  const min = def.min ?? 0;
  if (value < min && min - value <= tol) value = min;
  if (def.max !== undefined && value > def.max && value - def.max <= tol) value = def.max;
  if (Object.is(value, -0)) value = 0;

  if (value < min) {
    return {
      status: 'error',
      message: min < 0
        ? `${def.label} would be below ${min * 100}%. Check your inputs.`
        : `${def.label} would be negative. Check your inputs.`,
      target,
    };
  }
  if (def.max !== undefined && value > def.max) {
    return {
      status: 'error',
      message: def.unit === 'percent' ? `${def.label} would be above 100%. Check your inputs.` : `${def.label} would be too large. Check your inputs.`,
      target,
    };
  }
  if (def.positive && value === 0) {
    return { status: 'error', message: `${def.label} would be 0, but it must be above 0. Check your inputs.`, target };
  }
  return { status: 'ok', value, target };
}
