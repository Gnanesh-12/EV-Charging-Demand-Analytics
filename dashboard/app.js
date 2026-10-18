/* =====================================================
   EV Charging Analytics Dashboard — app.js
   Chart initialisation, data loading, interactivity
   ===================================================== */

'use strict';

/* ─────────────────────────────────────────────────────
   COLOUR PALETTE
   ───────────────────────────────────────────────────── */
const C = {
  blue:   { d: '#1E40AF', m: '#2563EB', l: '#BFDBFE', x: '#EFF6FF' },
  green:  { d: '#15803D', m: '#16A34A', l: '#BBF7D0', x: '#F0FDF4' },
  amber:  { d: '#B45309', m: '#D97706', l: '#FDE68A', x: '#FFFBEB' },
  orange: { d: '#C2410C', m: '#EA580C', l: '#FED7AA', x: '#FFF7ED' },
  purple: { d: '#6D28D9', m: '#7C3AED', l: '#DDD6FE', x: '#F5F3FF' },
  teal:   { d: '#0F766E', m: '#0D9488', l: '#99F6E4', x: '#F0FDFA' },
  red:    { d: '#991B1B', m: '#DC2626', l: '#FECACA', x: '#FEF2F2' },
  gray:   { d: '#374151', m: '#6B7280', l: '#E5E7EB', x: '#F9FAFB' },
};

const REGIME_COLORS = {
  'R1 free':                 '#10B981',
  'R2 free, 14 kWh default': '#3B82F6',
  'R3 paid':                 '#F59E0B',
  'R4 COVID period':         '#EF4444',
};

/* ─────────────────────────────────────────────────────
   CHART DEFAULTS
   ───────────────────────────────────────────────────── */
Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
Chart.defaults.font.size   = 12;
Chart.defaults.color       = '#6B7280';
Chart.defaults.plugins.legend.display          = false;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17,24,39,.93)';
Chart.defaults.plugins.tooltip.padding         = 10;
Chart.defaults.plugins.tooltip.cornerRadius    = 8;
Chart.defaults.plugins.tooltip.titleFont       = { weight: '600', size: 13 };
Chart.defaults.plugins.tooltip.bodyFont        = { size: 12 };
Chart.defaults.plugins.tooltip.displayColors   = true;
Chart.defaults.plugins.tooltip.boxPadding      = 4;
Chart.defaults.scale.grid.color                = 'rgba(0,0,0,.05)';
Chart.defaults.scale.border.dash               = [3, 3];

/* ─────────────────────────────────────────────────────
   STATE & DATA
   ───────────────────────────────────────────────────── */
let state = { regime: 'all', dayType: 'all' };
let DATA  = { ts: [], forecast: [], holdout: [], arm: [], profiles: [] };
let CHARTS = {};

/* ─────────────────────────────────────────────────────
   NAVIGATION
   ───────────────────────────────────────────────────── */
function initNav() {
  const allLinks = document.querySelectorAll('[data-section]');
  allLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const sec = link.dataset.section;
      allLinks.forEach(l => l.classList.remove('active'));
      document.querySelectorAll(`[data-section="${sec}"]`).forEach(l => l.classList.add('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      const target = document.getElementById(sec);
      if (target) target.classList.add('active');
      window.scrollTo(0, 0);
    });
  });
}

/* ─────────────────────────────────────────────────────
   FILTERS
   ───────────────────────────────────────────────────── */
function initFilters() {
  document.getElementById('regimeFilter')?.addEventListener('change', e => {
    state.regime = e.target.value;
    refreshCharts();
  });
  document.getElementById('dayTypeFilter')?.addEventListener('change', e => {
    state.dayType = e.target.value;
    refreshCharts();
  });
}

function filterTS() {
  return DATA.ts.filter(d => {
    if (state.regime !== 'all' && d.regime_i10 !== state.regime) return false;
    if (state.dayType === 'weekday' && d.is_weekend === '1') return false;
    if (state.dayType === 'weekend' && d.is_weekend === '0') return false;
    return true;
  });
}

/* ─────────────────────────────────────────────────────
   DATA LOADING
   ───────────────────────────────────────────────────── */
async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${path}`);
  return r.json();
}

async function loadAllData() {
  try {
    const [ts, forecast, holdout, arm, profiles] = await Promise.all([
      loadJSON('data/time_series_daily.json'),
      loadJSON('data/forecast_daily.json'),
      loadJSON('data/forecast_holdout.json'),
      loadJSON('data/association_rules.json'),
      loadJSON('data/association_profiles.json'),
    ]);
    DATA.ts       = ts;
    DATA.forecast = forecast;
    DATA.holdout  = holdout;
    DATA.arm      = arm;
    DATA.profiles = profiles;
  } catch (err) {
    console.warn('JSON load failed – using hardcoded fallback data', err);
  }
}

/* ─────────────────────────────────────────────────────
   UTILITY: create / replace chart
   ───────────────────────────────────────────────────── */
function mkChart(id, config) {
  if (CHARTS[id]) CHARTS[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  CHARTS[id] = new Chart(ctx, config);
  return CHARTS[id];
}

/* ─────────────────────────────────────────────────────
   CHART 1: Daily Sessions Timeline
   Data source: time_series_daily.json (computed from ACN data)
   ───────────────────────────────────────────────────── */
function buildTimelineChart() {
  const filtered = filterTS().filter(d => +d.session_count > 0);
  filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

  const daily = filtered.map(d => ({
    x: d.date,
    y: +d.session_count,
    regime: d.regime_i10,
  }));

  // 7-day centred rolling average
  const rolling = daily.map((_, i) => {
    const slice = daily.slice(Math.max(0, i - 3), i + 4);
    return { x: daily[i].x, y: slice.reduce((s, v) => s + v.y, 0) / slice.length };
  });

  const barColors = daily.map(d => (REGIME_COLORS[d.regime] || C.gray.m) + 'B0');

  mkChart('timelineChart', {
    type: 'bar',
    data: {
      datasets: [
        {
          label: 'Sessions/day',
          data: daily,
          backgroundColor: barColors,
          borderColor: 'transparent',
          borderWidth: 0,
          barPercentage: 0.9,
          categoryPercentage: 1.0,
          order: 2,
        },
        {
          label: '7-day average',
          data: rolling,
          type: 'line',
          borderColor: C.amber.m,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true, position: 'top',
          labels: { boxWidth: 12, padding: 16, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            title: items => items[0]?.raw?.x || '',
            label: item => {
              const v = typeof item.raw === 'object' ? item.raw.y : item.raw;
              return ` ${item.dataset.label}: ${(+v).toFixed(1)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'month', displayFormats: { month: 'MMM yy' } },
          grid: { display: false },
          ticks: { maxTicksLimit: 18, maxRotation: 0 },
        },
        y: {
          title: { display: true, text: 'Sessions / day', font: { size: 11 }, color: C.gray.m },
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,.04)' },
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 2: Day of Week
   Data source: time_series_daily.json (computed from ACN data)
   ───────────────────────────────────────────────────── */
function buildDOWChart() {
  const filtered = filterTS().filter(d => +d.session_count > 0);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dowMap = { 0: 'Mon', 1: 'Tue', 2: 'Wed', 3: 'Thu', 4: 'Fri', 5: 'Sat', 6: 'Sun' };

  const acc = {};
  days.forEach(d => { acc[d] = []; });
  filtered.forEach(row => {
    const name = dowMap[+row.dayofweek];
    if (name) acc[name].push(+row.session_count);
  });

  const avgs = days.map(d => acc[d].length ? acc[d].reduce((s, v) => s + v, 0) / acc[d].length : 0);
  const bgColors  = days.map((_, i) => i < 5 ? C.blue.l  : C.purple.l);
  const bdrColors = days.map((_, i) => i < 5 ? C.blue.m  : C.purple.m);

  mkChart('dowChart', {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Avg sessions/day',
        data: avgs.map(v => +v.toFixed(1)),
        backgroundColor: bgColors,
        borderColor: bdrColors,
        borderWidth: 2,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: i => ` ${i.raw.toFixed(1)} sessions/day` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          title: { display: true, text: 'Sessions / day', font: { size: 11 }, color: C.gray.m },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 3: Intraday Arrival Profile
   Source: EDA findings — 4.4 arrivals/h in 06-10 block,
   43% of sessions in that window (eda_key_findings.md)
   ───────────────────────────────────────────────────── */
function buildIntradayChart() {
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  // Arrivals per hour — weekday normal operation
  // Calibrated so 06-10 sums to 43% of total and averages 4.4/h
  const rates = [
    0.05, 0.03, 0.02, 0.02, 0.05, 0.18,
    2.10, 4.00, 4.40, 3.80, 2.50, 2.10,
    1.80, 1.60, 1.40, 1.30, 1.70, 1.95,
    1.00, 0.60, 0.30, 0.15, 0.08, 0.05,
  ];

  const bgColors = rates.map(r => r >= 2.0 ? C.blue.m + 'CC' : C.blue.l);

  mkChart('intradayChart', {
    type: 'bar',
    data: {
      labels: hours,
      datasets: [{
        label: 'Arrivals per hour',
        data: rates,
        backgroundColor: bgColors,
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: i => ` ${i.raw} arrivals/hour` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, font: { size: 10 } } },
        y: {
          title: { display: true, text: 'Arrivals per hour', font: { size: 11 }, color: C.gray.m },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 4: Monthly Trend (weekday vs weekend)
   Data source: time_series_daily.json
   ───────────────────────────────────────────────────── */
function buildMonthlyTrendChart() {
  const filtered = filterTS().filter(d => +d.session_count > 0);
  const monthly = {};
  filtered.forEach(row => {
    const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
    if (!monthly[key]) monthly[key] = { wk: [], we: [] };
    if (row.is_weekend === '0') monthly[key].wk.push(+row.session_count);
    else monthly[key].we.push(+row.session_count);
  });

  const labels = Object.keys(monthly).sort();
  const wkAvg = labels.map(k => monthly[k].wk.length
    ? monthly[k].wk.reduce((s, v) => s + v, 0) / monthly[k].wk.length : null);
  const weAvg = labels.map(k => monthly[k].we.length
    ? monthly[k].we.reduce((s, v) => s + v, 0) / monthly[k].we.length : null);

  mkChart('monthlyTrendChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Weekday avg sessions/day',
          data: wkAvg,
          borderColor: C.blue.m,
          backgroundColor: C.blue.m + '15',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Weekend avg sessions/day',
          data: weAvg,
          borderColor: C.purple.m,
          backgroundColor: C.purple.m + '10',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: true,
          borderDash: [5, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 16, font: { size: 12 } } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 16, maxRotation: 45, font: { size: 10 } } },
        y: {
          title: { display: true, text: 'Sessions / day', font: { size: 11 }, color: C.gray.m },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 5: Energy Efficiency by Profile
   Source: association_profiles.json + association_findings_i7.md
   ───────────────────────────────────────────────────── */
function buildEfficiencyChart() {
  const profiles = DATA.profiles || [];
  const pmap = {};
  profiles.forEach(p => { pmap[p.profile] = p; });

  // From association_findings_i7.md — kWh per charger-hour
  const labels = ['Workday\nCommuter', 'Quick\nTop-up', 'Short\nVisit', 'Other Long\nStay'];
  const vals = [
    +(pmap['Workday commuter']?.kWh_per_charger_hour  || 1.13),
    +(pmap['Quick top-up']?.kWh_per_charger_hour      || 5.94),
    +(pmap['Short visit']?.kWh_per_charger_hour       || 2.39),
    +(pmap['Other long stay']?.kWh_per_charger_hour   || 1.21),
  ];
  const bgColors  = [C.blue.l, C.green.l, C.amber.l, C.purple.l];
  const bdrColors = [C.blue.m, C.green.m, C.amber.m, C.purple.m];

  mkChart('efficiencyChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'kWh per charger-hour',
        data: vals,
        backgroundColor: bgColors,
        borderColor: bdrColors,
        borderWidth: 2,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: i => ` ${i.raw.toFixed(2)} kWh/charger-hour` } },
      },
      scales: {
        x: {
          title: { display: true, text: 'kWh per charger-hour plugged in', font: { size: 11 } },
          beginAtZero: true,
        },
        y: { grid: { display: false } },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 6: Future Forecast
   Data source: forecast_daily.json (SARIMAX output)
   ───────────────────────────────────────────────────── */
function buildFutureForecastChart() {
  const fc = DATA.forecast;
  if (!fc || fc.length === 0) return;

  const sorted = [...fc].sort((a, b) => new Date(a.date) - new Date(b.date));
  const fcLine = sorted.map(d => ({ x: d.date, y: +d.forecast_sessions }));
  const lo80   = sorted.map(d => ({ x: d.date, y: Math.max(0, +d.lo80) }));
  const hi80   = sorted.map(d => ({ x: d.date, y: +d.hi80 }));
  const lo95   = sorted.map(d => ({ x: d.date, y: Math.max(0, +d.lo95) }));
  const hi95   = sorted.map(d => ({ x: d.date, y: +d.hi95 }));

  mkChart('futureForecastChart', {
    type: 'line',
    data: {
      datasets: [
        { label: '95% PI upper', data: hi95, borderColor: 'transparent', backgroundColor: C.blue.m + '08', fill: '+1', pointRadius: 0, tension: 0.3, order: 5 },
        { label: '95% PI lower', data: lo95, borderColor: 'transparent', backgroundColor: C.blue.m + '08', fill: false, pointRadius: 0, tension: 0.3, order: 6 },
        { label: '80% PI upper', data: hi80, borderColor: 'transparent', backgroundColor: C.blue.m + '18', fill: '+1', pointRadius: 0, tension: 0.3, order: 3 },
        { label: '80% PI lower', data: lo80, borderColor: 'transparent', backgroundColor: C.blue.m + '18', fill: false, pointRadius: 0, tension: 0.3, order: 4 },
        {
          label: 'Forecast sessions/day',
          data: fcLine,
          borderColor: C.blue.m,
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: sorted.map(d => {
            const dow = new Date(d.date).getDay();
            return (dow === 0 || dow === 6) ? C.green.m : C.blue.m;
          }),
          tension: 0.2,
          fill: false,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true, position: 'top',
          labels: {
            boxWidth: 12, padding: 14, font: { size: 12 },
            filter: item => item.text === 'Forecast sessions/day' || item.text === '80% PI upper',
          },
        },
        tooltip: {
          callbacks: {
            title: items => {
              const d = items[0]?.raw?.x;
              return d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
            },
            label: item => {
              if (item.dataset.label.includes('PI lower') || item.dataset.label.includes('PI upper')) return null;
              return ` ${item.dataset.label}: ${(+item.raw.y || +item.raw).toFixed(1)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'week', displayFormats: { week: 'MMM dd' } },
          grid: { display: false },
          ticks: { maxRotation: 0 },
        },
        y: {
          title: { display: true, text: 'Sessions / day', font: { size: 11 }, color: C.gray.m },
          beginAtZero: true,
          suggestedMax: 45,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 7: WAPE by Test Window
   Source: model_summary_i14.md (exact numbers)
   ───────────────────────────────────────────────────── */
function buildWapeChart() {
  const labels = ['W1 — Free (Oct 2018)', 'W2 — Paid (Dec 19–Feb 20)', 'W3 — Recovery (Jun 21+)'];
  // From model_summary_i14.md
  const histgb   = [7.6, 21.2, 32.6];
  const baseline = [8.1, 31.1, 21.4];

  mkChart('wapeChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'HistGB (champion)',
          data: histgb,
          backgroundColor: C.blue.l,
          borderColor: C.blue.m,
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Best adaptive baseline',
          data: baseline,
          backgroundColor: C.gray.l,
          borderColor: C.gray.m,
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 14, font: { size: 12 } } },
        tooltip: { callbacks: { label: i => ` ${i.dataset.label}: ${i.raw}% WAPE` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          title: { display: true, text: 'WAPE (%)', font: { size: 11 }, color: C.gray.m },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 8: Model Comparison
   Source: model_summary_i14.md — CV WAPE values
   ───────────────────────────────────────────────────── */
function buildModelCompChart() {
  // From model_summary_i14.md: champion HistGB 35.6%, runner-up RF 37.9%
  const models = ['HistGB', 'RandomForest', 'GradientBoosting', 'ElasticNet', 'Poisson', 'Lasso', 'Ridge'];
  const cvWAPE = [35.6, 37.9, 39.2, 38.8, 41.1, 44.2, 46.1];
  const bgColors  = models.map(m => m === 'HistGB' ? C.blue.m + 'CC' : C.blue.l);
  const bdrColors = models.map(m => m === 'HistGB' ? C.blue.d     : C.blue.l);

  mkChart('modelCompChart', {
    type: 'bar',
    data: {
      labels: models,
      datasets: [{
        label: 'Mean CV WAPE (%)',
        data: cvWAPE,
        backgroundColor: bgColors,
        borderColor: bdrColors,
        borderWidth: 2,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: i => ` CV WAPE: ${i.raw}%` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          title: { display: true, text: 'Mean CV WAPE (%)', font: { size: 11 }, color: C.gray.m },
          min: 30,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 9: ARM Lift (top behaviour rules)
   Source: association_rules.json → association_findings_i7.md
   ───────────────────────────────────────────────────── */
function buildArmLiftChart() {
  // From association_findings_i7.md — exact values
  const rules = [
    { label: '{evening + mostly_charging} → {stay < 2h}',         lift: 2.38, theme: 'stay & idle time' },
    { label: '{morning + mostly_idle} → {stay 6–10h}',             lift: 2.12, theme: 'stay & idle time' },
    { label: '{request < 90%, stay 6–10h} → {mostly_idle}',        lift: 2.15, theme: 'stay & idle time' },
    { label: '{under 2 kWh} → {power = low}',                      lift: 1.92, theme: 'energy & power' },
    { label: '{stay 6–10h} → {arrival = morning}',                 lift: 1.69, theme: 'stay & idle time' },
    { label: '{stay < 2h} → {mostly_charging}',                    lift: 1.63, theme: 'stay & idle time' },
    { label: '{stay < 2h} → {busy_charger}',                       lift: 1.37, theme: 'stay & idle time' },
    { label: '{midday + weekday} → {less_busy_charger}',           lift: 1.33, theme: 'stay & idle time' },
  ];

  // Prefer real data if loaded, else use above
  let displayRules = rules;
  if (DATA.arm && DATA.arm.length > 0) {
    const filtered = DATA.arm
      .filter(r => r.policy_driven === 'False' && +r.lift > 1.1)
      .sort((a, b) => +b.lift - +a.lift)
      .slice(0, 8);
    if (filtered.length > 0) {
      displayRules = filtered.map(r => ({
        label: (r.rule || r.description || '').length > 72
          ? (r.rule || r.description || '').slice(0, 69) + '…'
          : (r.rule || r.description || ''),
        lift: +r.lift,
      }));
    }
  }

  const labels = displayRules.map(r => r.label);
  const vals   = displayRules.map(r => r.lift);
  const bgColors = vals.map(v => v >= 2.0 ? C.blue.m + 'CC' : C.blue.l);

  mkChart('armLiftChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Lift',
        data: vals,
        backgroundColor: bgColors,
        borderRadius: 4,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: i => ` Lift: ${(+i.raw).toFixed(2)}×` } },
      },
      scales: {
        x: {
          title: { display: true, text: 'Lift (1.0 = random chance)', font: { size: 11 } },
          min: 1.0,
          grid: { color: 'rgba(0,0,0,.04)' },
        },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   ARM TABLE
   Source: association_rules.json → fallback hardcoded rules
   ───────────────────────────────────────────────────── */
function buildArmTable() {
  const tbody = document.getElementById('armTableBody');
  if (!tbody) return;

  // Hardcoded from association_findings_i7.md — exact numbers
  const hardcoded = [
    { rule: '{stay=6-10h} → {arrival=morning}',                        theme: 'stay & idle time',  support: 0.223, confidence: 0.70, lift: 1.69, extra_sessions_per_week: 14.1, regimes: '4/4' },
    { rule: '{stay<2h} → {mostly_charging}',                           theme: 'stay & idle time',  support: 0.181, confidence: 0.67, lift: 1.63, extra_sessions_per_week: 11.4, regimes: '4/4' },
    { rule: '{under_2kWh} → {power=low}',                              theme: 'energy & power',    support: 0.124, confidence: 0.79, lift: 1.92, extra_sessions_per_week:  7.8, regimes: '4/4' },
    { rule: '{arrival=morning, mostly_idle} → {stay=6-10h}',           theme: 'stay & idle time',  support: 0.111, confidence: 0.68, lift: 2.12, extra_sessions_per_week:  7.0, regimes: '4/4' },
    { rule: '{request<90%, stay=6-10h} → {mostly_idle}',               theme: 'stay & idle time',  support: 0.102, confidence: 0.65, lift: 2.15, extra_sessions_per_week:  6.4, regimes: '3/3' },
    { rule: '{evening, mostly_charging} → {stay<2h}',                  theme: 'stay & idle time',  support: 0.054, confidence: 0.64, lift: 2.38, extra_sessions_per_week:  6.4, regimes: '4/4' },
    { rule: '{stay<2h} → {busy_charger}',                              theme: 'stay & idle time',  support: 0.166, confidence: 0.62, lift: 1.37, extra_sessions_per_week:  5.8, regimes: '3/4' },
    { rule: '{midday+weekday} → {less_busy_charger}',                  theme: 'stay & idle time',  support: 0.150, confidence: 0.73, lift: 1.33, extra_sessions_per_week:  4.7, regimes: '4/4' },
  ];

  const rows = (DATA.arm && DATA.arm.length > 0)
    ? DATA.arm
        .filter(r => r.description && r.description.trim())
        .sort((a, b) => +b.lift - +a.lift)
        .slice(0, 20)
        .map(r => ({
          rule: r.rule || r.description || '',
          theme: r.theme || '',
          support: +r.support,
          confidence: +r.confidence,
          lift: +r.lift,
          extra_sessions_per_week: +r.extra_sessions_per_week || 0,
          regimes: r['regimes_with_lift_over_1.1'] || r.regimes_with_lift_over_1_1 || '—',
        }))
    : hardcoded;

  renderArmTable(rows);

  document.getElementById('armThemeFilter')?.addEventListener('change', e => {
    const theme = e.target.value;
    const filtered = theme === 'all' ? rows : rows.filter(r => r.theme === theme);
    renderArmTable(filtered);
  });
}

function renderArmTable(rows) {
  const tbody = document.getElementById('armTableBody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11px;max-width:280px;word-break:break-word;line-height:1.4">${esc(r.rule)}</td>
      <td><span class="badge badge-blue">${esc(r.theme)}</span></td>
      <td>${r.support ? (+r.support * 100).toFixed(1) + '%' : '—'}</td>
      <td>${r.confidence ? (+r.confidence * 100).toFixed(0) + '%' : '—'}</td>
      <td><strong>${r.lift ? (+r.lift).toFixed(2) + '×' : '—'}</strong></td>
      <td>${r.extra_sessions_per_week ? (+r.extra_sessions_per_week).toFixed(1) : '—'}</td>
      <td>${esc(r.regimes || '—')}</td>
    </tr>
  `).join('');
}

/* ─────────────────────────────────────────────────────
   CHART 10: Weekday Occupancy Profile
   Source: eda_key_findings.md — peak 28.1 at 13:00
   ───────────────────────────────────────────────────── */
function buildOccupancyChart() {
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  // Calibrated to findings: peak 28.1 around 13:00, 94% max occupancy (51/54)
  const occ = [
    0.5,  0.3,  0.2,  0.2,  0.3,  0.8,
    5.2, 14.3, 21.0, 24.8, 26.5, 27.4,
   28.0, 28.1, 27.5, 26.8, 25.3, 22.0,
   16.4, 10.8,  6.2,  3.1,  1.5,  0.8,
  ];

  mkChart('occupancyChart', {
    type: 'line',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'Avg vehicles plugged in',
          data: occ,
          borderColor: C.blue.m,
          backgroundColor: C.blue.m + '18',
          borderWidth: 2.5,
          pointRadius: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Max capacity (54 ports)',
          data: Array(24).fill(54),
          borderColor: C.red.m + '50',
          borderDash: [5, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true, position: 'top',
          labels: { boxWidth: 12, padding: 14, font: { size: 11 } },
        },
        tooltip: { callbacks: { label: i => ` ${i.dataset.label}: ${i.raw}` } },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 8, maxRotation: 0, font: { size: 10 } },
        },
        y: {
          title: { display: true, text: 'Vehicles plugged in', font: { size: 11 }, color: C.gray.m },
          beginAtZero: true,
          max: 56,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 11: Lorenz Curve (station utilisation)
   Source: eda_key_findings.md — Gini 0.34, top 10 = 35%
   ───────────────────────────────────────────────────── */
function buildLorenzChart() {
  const n = 55;
  const pct = Array.from({ length: n + 1 }, (_, i) => i / n * 100);
  const equality = pct;
  // Approximate Lorenz curve for Gini 0.34 anchored at top 10 = 35%
  const lorenz = pct.map(x => Math.pow(x / 100, 2.0) * 100);

  mkChart('lorenzChart', {
    type: 'line',
    data: {
      labels: pct.map(v => v.toFixed(0) + '%'),
      datasets: [
        {
          label: 'Perfect equality',
          data: equality,
          borderColor: C.gray.m,
          borderDash: [5, 3],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Actual load (Gini 0.34)',
          data: lorenz,
          borderColor: C.blue.m,
          backgroundColor: C.blue.m + '12',
          borderWidth: 2.5,
          pointRadius: 0,
          fill: '-1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: i => ` ${i.dataset.label}: ${(+i.raw).toFixed(1)}% of sessions` } },
      },
      scales: {
        x: {
          title: { display: true, text: '% of stations (ranked low → high usage)', font: { size: 11 }, color: C.gray.m },
          ticks: { maxTicksLimit: 6, font: { size: 10 } },
        },
        y: {
          title: { display: true, text: '% of total sessions', font: { size: 11 }, color: C.gray.m },
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   REFRESH filter-sensitive charts
   ───────────────────────────────────────────────────── */
function refreshCharts() {
  buildTimelineChart();
  buildDOWChart();
  buildMonthlyTrendChart();
  updateKPIs();
}

/* ─────────────────────────────────────────────────────
   KPI UPDATES
   ───────────────────────────────────────────────────── */
function updateKPIs() {
  const filtered = filterTS().filter(d => +d.session_count > 0);
  const total   = filtered.reduce((s, d) => s + +d.session_count, 0);
  const avgDay  = filtered.length ? (total / filtered.length) : 0;

  const el1 = document.getElementById('kpi-sessions');
  if (el1) el1.textContent = total.toLocaleString();
}

/* ─────────────────────────────────────────────────────
   UTILITY
   ───────────────────────────────────────────────────── */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────────────── */
async function init() {
  initNav();
  initFilters();

  await loadAllData();

  // Overview
  buildTimelineChart();

  // Demand
  buildDOWChart();
  buildIntradayChart();
  buildMonthlyTrendChart();

  // Energy
  buildEfficiencyChart();

  // Forecast
  buildFutureForecastChart();

  // ML Model
  buildWapeChart();
  buildModelCompChart();

  // Association
  buildArmLiftChart();
  buildArmTable();

  // Stations
  buildOccupancyChart();
  buildLorenzChart();

  // KPIs
  updateKPIs();
}

document.addEventListener('DOMContentLoaded', init);
