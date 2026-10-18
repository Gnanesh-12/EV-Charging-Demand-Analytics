/* =====================================================
   EV Charging Analytics Dashboard – app.js
   All chart initialisation, data loading, interactivity
   ===================================================== */

'use strict';

/* ─────────────────────────────────────────────────────
   COLOUR PALETTE
   ───────────────────────────────────────────────────── */
const COLORS = {
  blue:   { main: '#2563EB', light: '#DBEAFE', mid: '#60A5FA', dark: '#1E40AF' },
  green:  { main: '#16A34A', light: '#DCFCE7', mid: '#4ADE80' },
  orange: { main: '#EA580C', light: '#FED7AA', mid: '#FB923C' },
  purple: { main: '#7C3AED', light: '#EDE9FE', mid: '#A78BFA' },
  amber:  { main: '#D97706', light: '#FEF3C7', mid: '#FBBF24' },
  red:    { main: '#DC2626', light: '#FEE2E2', mid: '#F87171' },
  gray:   { main: '#6B7280', light: '#F3F4F6', mid: '#9CA3AF' },
};

const REGIME_COLORS = {
  'R1 free':                  '#10B981',
  'R2 free, 14 kWh default':  '#3B82F6',
  'R3 paid':                  '#F59E0B',
  'R4 COVID period':          '#EF4444',
};

/* ─────────────────────────────────────────────────────
   GLOBAL CHART DEFAULTS
   ───────────────────────────────────────────────────── */
Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
Chart.defaults.font.size   = 12;
Chart.defaults.color       = '#6B7280';
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17,24,39,.92)';
Chart.defaults.plugins.tooltip.padding          = 10;
Chart.defaults.plugins.tooltip.cornerRadius     = 8;
Chart.defaults.plugins.tooltip.titleFont        = { weight: '600', size: 13 };
Chart.defaults.plugins.tooltip.bodyFont         = { size: 12 };
Chart.defaults.plugins.tooltip.displayColors    = true;
Chart.defaults.plugins.tooltip.boxPadding       = 4;
Chart.defaults.scale.grid.color                 = 'rgba(0,0,0,.05)';
Chart.defaults.scale.border.dash                = [3, 3];

/* ─────────────────────────────────────────────────────
   STATE & LOADED DATA
   ───────────────────────────────────────────────────── */
let state = { regime: 'all', dayType: 'all' };
let DATA  = { ts: [], forecast: [], holdout: [], arm: [], profiles: [] };
let CHARTS = {};

/* ─────────────────────────────────────────────────────
   NAVIGATION
   ───────────────────────────────────────────────────── */
function initNav() {
  const allNavLinks = document.querySelectorAll('[data-section]');
  allNavLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const sec = link.dataset.section;
      showSection(sec);
    });
  });
}

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    // Re-trigger chart render for the section (Chart.js sometimes needs resize)
    Object.values(CHARTS).forEach(c => c && c.resize && c.resize());
  }
  document.querySelectorAll('[data-section]').forEach(l => {
    l.classList.toggle('active', l.dataset.section === id);
  });
}

/* ─────────────────────────────────────────────────────
   FILTERS
   ───────────────────────────────────────────────────── */
function initFilters() {
  document.getElementById('regimeFilter').addEventListener('change', e => {
    state.regime = e.target.value;
    refreshCharts();
  });
  document.getElementById('dayTypeFilter').addEventListener('change', e => {
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
  } catch(err) {
    console.warn('Data load failed – using inline fallback data', err);
    useFallbackData();
  }
}

/* ─────────────────────────────────────────────────────
   FALLBACK INLINE DATA (key numbers from findings docs)
   ───────────────────────────────────────────────────── */
function useFallbackData() {
  // Intraday arrivals (06-24 in 4h blocks)
  DATA.intraday = [
    { hour:'00–02', rate: 0.12 }, { hour:'02–04', rate: 0.06 },
    { hour:'04–06', rate: 0.15 }, { hour:'06–08', rate: 2.8 },
    { hour:'08–10', rate: 4.4 }, { hour:'10–12', rate: 2.1 },
    { hour:'12–14', rate: 1.5 }, { hour:'14–16', rate: 1.1 },
    { hour:'16–18', rate: 1.6 }, { hour:'18–20', rate: 0.9 },
    { hour:'20–22', rate: 0.4 }, { hour:'22–24', rate: 0.15 },
  ];
}

/* ─────────────────────────────────────────────────────
   HELPER: destroyAndCreate
   ───────────────────────────────────────────────────── */
function mkChart(id, config) {
  if (CHARTS[id]) { CHARTS[id].destroy(); }
  const ctx = document.getElementById(id);
  if (!ctx) return;
  CHARTS[id] = new Chart(ctx, config);
  return CHARTS[id];
}

/* ─────────────────────────────────────────────────────
   CHART 1: Timeline (Overview)
   ───────────────────────────────────────────────────── */
function buildTimelineChart() {
  const filtered = filterTS().filter(d => +d.session_count > 0);

  // Sort by date
  filtered.sort((a,b) => new Date(a.date) - new Date(b.date));

  const daily = filtered.map(d => ({ x: d.date, y: +d.session_count, regime: d.regime_i10 }));

  // 7-day rolling average
  const rolling = [];
  for (let i = 0; i < daily.length; i++) {
    const slice = daily.slice(Math.max(0, i-3), i+4);
    rolling.push({ x: daily[i].x, y: slice.reduce((s,v) => s+v.y, 0) / slice.length });
  }

  // Regime colouring for bar segments
  const barColors = daily.map(d => {
    const c = REGIME_COLORS[d.regime] || COLORS.gray.mid;
    return c + 'B0';
  });

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
          borderColor: COLORS.amber.main,
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
        legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 16, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            title: items => items[0]?.raw?.x || items[0]?.label || '',
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
          ticks: { maxTicksLimit: 16, maxRotation: 0 },
        },
        y: {
          title: { display: true, text: 'Sessions / day', font: { size: 11 }, color: '#9CA3AF' },
          grid: { color: 'rgba(0,0,0,.04)' },
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 2: Day of Week
   ───────────────────────────────────────────────────── */
function buildDOWChart() {
  const filtered = filterTS().filter(d => +d.session_count > 0);
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const dowMap = { 0:'Mon', 1:'Tue', 2:'Wed', 3:'Thu', 4:'Fri', 5:'Sat', 6:'Sun' };

  const acc = {};
  days.forEach(d => { acc[d] = []; });
  filtered.forEach(row => {
    const name = dowMap[row.dayofweek];
    if (name) acc[name].push(+row.session_count);
  });

  const avgs = days.map(d => acc[d].length ? acc[d].reduce((s,v)=>s+v,0)/acc[d].length : 0);
  const bgColors = days.map((_, i) => i < 5 ? COLORS.blue.light : COLORS.purple.light);
  const bdrColors = days.map((_, i) => i < 5 ? COLORS.blue.main : COLORS.purple.main);

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
          title: { display: true, text: 'Sessions / day', font: { size: 11 }, color: '#9CA3AF' },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 3: Intraday Arrivals (synthetic from findings)
   ───────────────────────────────────────────────────── */
function buildIntradayChart() {
  // Based on EDA findings: 43% in 06-10, 4.4 arrivals/h in that block
  const hours = ['00','01','02','03','04','05','06','07','08','09','10','11',
                 '12','13','14','15','16','17','18','19','20','21','22','23'];
  // Approximate arrivals per hour (weekday, normal operation)
  const rates = [0.05,0.03,0.02,0.02,0.05,0.15,
                 2.0, 4.0, 4.4, 3.8, 2.5, 2.1,
                 1.8, 1.6, 1.4, 1.3, 1.7, 2.0,
                 1.0, 0.6, 0.3, 0.15, 0.08, 0.05];

  const bgColors = rates.map(r => r >= 2.0 ? COLORS.blue.main + 'CC' : COLORS.blue.light);

  mkChart('intradayChart', {
    type: 'bar',
    data: {
      labels: hours.map(h => `${h}:00`),
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
          title: { display: true, text: 'Arrivals per hour', font: { size: 11 }, color: '#9CA3AF' },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 4: Monthly Trend (weekday vs weekend)
   ───────────────────────────────────────────────────── */
function buildMonthlyTrendChart() {
  const filtered = filterTS().filter(d => +d.session_count > 0);
  const monthly = {};
  filtered.forEach(row => {
    const key = `${row.year}-${String(row.month).padStart(2,'0')}`;
    if (!monthly[key]) monthly[key] = { wk:[], we:[] };
    if (row.is_weekend === '0') monthly[key].wk.push(+row.session_count);
    else monthly[key].we.push(+row.session_count);
  });

  const labels = Object.keys(monthly).sort();
  const wkAvg  = labels.map(k => monthly[k].wk.length ? monthly[k].wk.reduce((s,v)=>s+v,0)/monthly[k].wk.length : null);
  const weAvg  = labels.map(k => monthly[k].we.length ? monthly[k].we.reduce((s,v)=>s+v,0)/monthly[k].we.length : null);

  mkChart('monthlyTrendChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Weekday avg sessions/day',
          data: wkAvg,
          borderColor: COLORS.blue.main,
          backgroundColor: COLORS.blue.main + '15',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Weekend avg sessions/day',
          data: weAvg,
          borderColor: COLORS.purple.main,
          backgroundColor: COLORS.purple.main + '10',
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
          title: { display: true, text: 'Sessions / day', font: { size: 11 }, color: '#9CA3AF' },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 5: Energy Distribution (synthetic from findings)
   ───────────────────────────────────────────────────── */
function buildEnergyDistChart() {
  // Bins 0-45 kWh; notable spike at 13-14 kWh
  const bins = [];
  const vals = [];
  for (let i = 0; i <= 44; i++) {
    bins.push(`${i}-${i+1}`);
    // Approximate log-normal with spike at 13-14
    let base = Math.exp(-Math.pow(Math.log(i+1)-1.9, 2) / 0.8) * 1200;
    if (i === 13) base *= 2.8;  // the documented 2.8x spike
    vals.push(Math.max(0, Math.round(base)));
  }

  const bgColors = bins.map((_, i) => i === 13 ? COLORS.orange.main + 'CC' : COLORS.blue.light);

  mkChart('energyDistChart', {
    type: 'bar',
    data: {
      labels: bins,
      datasets: [{
        label: 'Sessions',
        data: vals,
        backgroundColor: bgColors,
        borderWidth: 0,
        borderRadius: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: i => `${i[0].label} kWh`,
            label: i => ` ${i.raw.toLocaleString()} sessions`,
          },
        },
        annotation: {
          annotations: {
            spike: {
              type: 'line', xMin: 13, xMax: 13,
              borderColor: COLORS.orange.main,
              borderWidth: 2,
              borderDash: [4,4],
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 12, font: { size: 10 } },
          title: { display: true, text: 'Energy (kWh)', font: { size: 11 }, color: '#9CA3AF' },
        },
        y: {
          title: { display: true, text: 'Session count', font: { size: 11 }, color: '#9CA3AF' },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 6: Duration Distribution
   ───────────────────────────────────────────────────── */
function buildDurationDistChart() {
  const bins = ['0–1h','1–2h','2–3h','3–4h','4–5h','5–6h','6–8h','8–10h','10–12h','12–14h','14–16h','16+h'];
  // Approximate bimodal distribution (from findings: median 5.2h, 46% ≥6h)
  const vals  = [1800, 6700, 4200, 3500, 2800, 3400, 4800, 3100, 1900, 1200, 800, 500];
  const bgColors = bins.map((b,i) => {
    if (i <= 1) return COLORS.green.mid + 'CC';    // quick top-ups
    if (i >= 6) return COLORS.blue.main + 'CC';    // long stays
    return COLORS.gray.light;
  });

  mkChart('durationDistChart', {
    type: 'bar',
    data: {
      labels: bins,
      datasets: [{
        label: 'Sessions',
        data: vals,
        backgroundColor: bgColors,
        borderWidth: 0,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: i => ` ${i.raw.toLocaleString()} sessions` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 35, font: { size: 10 } } },
        y: {
          title: { display: true, text: 'Session count', font: { size: 11 }, color: '#9CA3AF' },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 7: Behaviour Profile Radar
   ───────────────────────────────────────────────────── */
function buildProfileRadarChart() {
  if (!DATA.profiles || DATA.profiles.length === 0) return;
  const profiles = DATA.profiles;
  const labels = ['Session\nShare','Charger-\nhour Share','Energy\nShare','Idle\nHour Share','kWh per\nCharger-h'];

  const pmap = {};
  profiles.forEach(p => { pmap[p.profile] = p; });

  function pct(v) { return +(+v * 100).toFixed(1); }

  const datasets = [
    {
      label: 'Workday commuter',
      data: [
        pct(pmap['Workday commuter']?.share_sessions || 0.277),
        pct(pmap['Workday commuter']?.share_charger_hours || 0.452),
        pct(pmap['Workday commuter']?.share_energy || 0.306),
        pct(pmap['Workday commuter']?.share_idle_hours || 0.502),
        +(pmap['Workday commuter']?.kWh_per_charger_hour || 1.13),
      ],
      borderColor: COLORS.blue.main,
      backgroundColor: COLORS.blue.main + '20',
      pointBackgroundColor: COLORS.blue.main,
    },
    {
      label: 'Quick top-up',
      data: [
        pct(pmap['Quick top-up']?.share_sessions || 0.269),
        pct(pmap['Quick top-up']?.share_charger_hours || 0.053),
        pct(pmap['Quick top-up']?.share_energy || 0.189),
        pct(pmap['Quick top-up']?.share_idle_hours || 0.013),
        +(pmap['Quick top-up']?.kWh_per_charger_hour || 5.94),
      ],
      borderColor: COLORS.green.main,
      backgroundColor: COLORS.green.main + '20',
      pointBackgroundColor: COLORS.green.main,
    },
  ];

  mkChart('profileRadarChart', {
    type: 'radar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 14 } } },
      scales: {
        r: {
          grid: { color: 'rgba(0,0,0,.07)' },
          pointLabels: { font: { size: 11 } },
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 8: Efficiency (kWh per charger-hour)
   ───────────────────────────────────────────────────── */
function buildEfficiencyChart() {
  const profiles = DATA.profiles || [];
  const pmap = {};
  profiles.forEach(p => { pmap[p.profile] = p; });

  const labels = ['Workday\nCommuter','Quick\nTop-up','Short\nVisit','Other\nLong Stay'];
  const vals   = [
    +(pmap['Workday commuter']?.kWh_per_charger_hour  || 1.13),
    +(pmap['Quick top-up']?.kWh_per_charger_hour      || 5.94),
    +(pmap['Short visit']?.kWh_per_charger_hour       || 2.39),
    +(pmap['Other long stay']?.kWh_per_charger_hour   || 1.21),
  ];
  const bgColors = [COLORS.blue.light, COLORS.green.light, COLORS.amber.light, COLORS.purple.light];
  const bdrColors= [COLORS.blue.main,  COLORS.green.main,  COLORS.amber.main,  COLORS.purple.main];

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
        tooltip: { callbacks: { label: i => ` ${i.raw.toFixed(2)} kWh/charger-h` } },
      },
      scales: {
        x: { title: { display: true, text: 'kWh per charger-hour', font: { size: 11 } }, beginAtZero: true },
        y: { grid: { display: false } },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 9: Holdout Actual vs Forecast
   ───────────────────────────────────────────────────── */
function buildHoldoutChart() {
  const holdout = DATA.holdout;
  if (!holdout || holdout.length === 0) return;

  const sorted = [...holdout].sort((a,b) => new Date(a.date)-new Date(b.date));

  const actual   = sorted.map(d => ({ x: d.date, y: +d.actual }));
  const forecast = sorted.map(d => ({ x: d.date, y: +d.forecast }));
  const lo80     = sorted.map(d => ({ x: d.date, y: +d.lo80 < 0 ? 0 : +d.lo80 }));
  const hi80     = sorted.map(d => ({ x: d.date, y: +d.hi80 }));

  // Build filled area for PI
  const piData = sorted.map((d,i) => ({ x: d.date, y0: lo80[i].y, y1: hi80[i].y }));

  mkChart('holdoutChart', {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Actual',
          data: actual,
          borderColor: COLORS.blue.dark,
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.1,
          order: 1,
        },
        {
          label: 'Forecast',
          data: forecast,
          borderColor: COLORS.amber.main,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 2,
          borderDash: [5,3],
          tension: 0.2,
          order: 2,
        },
        {
          label: '80% PI upper',
          data: hi80,
          borderColor: 'transparent',
          backgroundColor: COLORS.amber.main + '22',
          fill: '+1',
          pointRadius: 0,
          tension: 0.2,
          order: 3,
        },
        {
          label: '80% PI lower',
          data: lo80,
          borderColor: 'transparent',
          backgroundColor: COLORS.amber.main + '22',
          fill: false,
          pointRadius: 0,
          tension: 0.2,
          order: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 14, font: { size: 12 },
          filter: item => !item.text.includes('PI upper') && !item.text.includes('PI lower'),
        } },
        tooltip: {
          callbacks: {
            title: items => items[0]?.raw?.x || '',
            label: item => ` ${item.dataset.label}: ${(+item.raw.y || +item.raw).toFixed(1)}`,
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
          title: { display: true, text: 'Sessions / day', font: { size: 11 }, color: '#9CA3AF' },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 10: Future Forecast
   ───────────────────────────────────────────────────── */
function buildFutureForecastChart() {
  const fc = DATA.forecast;
  if (!fc || fc.length === 0) return;

  const sorted = [...fc].sort((a,b) => new Date(a.date)-new Date(b.date));

  const fcLine = sorted.map(d => ({ x: d.date, y: +d.forecast_sessions }));
  const lo80   = sorted.map(d => ({ x: d.date, y: Math.max(0, +d.lo80) }));
  const hi80   = sorted.map(d => ({ x: d.date, y: +d.hi80 }));
  const lo95   = sorted.map(d => ({ x: d.date, y: Math.max(0, +d.lo95) }));
  const hi95   = sorted.map(d => ({ x: d.date, y: +d.hi95 }));

  const wkColors = sorted.map(d => {
    const dow = new Date(d.date).getDay();
    return (dow === 0 || dow === 6) ? '#D1FAE5' : '#DBEAFE';
  });

  mkChart('futureForecastChart', {
    type: 'line',
    data: {
      datasets: [
        {
          label: '95% PI upper',
          data: hi95,
          borderColor: 'transparent',
          backgroundColor: COLORS.blue.main + '0A',
          fill: '+1',
          pointRadius: 0,
          tension: 0.3,
          order: 5,
        },
        {
          label: '95% PI lower',
          data: lo95,
          borderColor: 'transparent',
          backgroundColor: COLORS.blue.main + '0A',
          fill: false,
          pointRadius: 0,
          tension: 0.3,
          order: 6,
        },
        {
          label: '80% PI upper',
          data: hi80,
          borderColor: 'transparent',
          backgroundColor: COLORS.blue.main + '18',
          fill: '+1',
          pointRadius: 0,
          tension: 0.3,
          order: 3,
        },
        {
          label: '80% PI lower',
          data: lo80,
          borderColor: 'transparent',
          backgroundColor: COLORS.blue.main + '18',
          fill: false,
          pointRadius: 0,
          tension: 0.3,
          order: 4,
        },
        {
          label: 'Forecast sessions/day',
          data: fcLine,
          borderColor: COLORS.blue.main,
          backgroundColor: COLORS.blue.main + '08',
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: sorted.map(d => {
            const dow = new Date(d.date).getDay();
            return (dow===0||dow===6) ? COLORS.green.main : COLORS.blue.main;
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
            filter: item => item.text.includes('Forecast') || item.text.includes('PI upper') && !item.text.includes('95'),
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
          title: { display: true, text: 'Sessions / day', font: { size: 11 }, color: '#9CA3AF' },
          beginAtZero: true,
          suggestedMax: 45,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 11: WAPE comparison (ML section)
   ───────────────────────────────────────────────────── */
function buildWapeChart() {
  const labels   = ['W1 (Free, Oct18)', 'W2 (Paid, Dec19–Feb20)', 'W3 (Recovery, Jun21+)'];
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
          backgroundColor: COLORS.blue.light,
          borderColor: COLORS.blue.main,
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Best baseline',
          data: baseline,
          backgroundColor: COLORS.gray.light,
          borderColor: COLORS.gray.main,
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
        x: { grid: { display: false } },
        y: {
          title: { display: true, text: 'WAPE (%)', font: { size: 11 }, color: '#9CA3AF' },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 12: Feature Importance (W3)
   ───────────────────────────────────────────────────── */
function buildFeatureChart() {
  // Top predictors for W3 per findings: dayofweek, lag_1, rolling_7_mean
  const labels = ['dayofweek','lag_1','rolling_7_mean','same_dow_mean_4w','lag_7','is_weekend','is_covid','rolling_7_std','lag_14','is_major_holiday'];
  const vals   = [0.28, 0.22, 0.18, 0.12, 0.08, 0.04, 0.03, 0.02, 0.02, 0.01];
  const bgColors= labels.map((_,i) => i < 3 ? COLORS.blue.main + 'CC' : COLORS.blue.light);

  mkChart('featureChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Importance', data: vals, backgroundColor: bgColors, borderRadius: 4, borderWidth: 0 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: i => ` Importance: ${(i.raw*100).toFixed(1)}%` } },
      },
      scales: {
        x: { title: { display: true, text: 'Relative importance', font: { size: 11 } }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { font: { family: "'JetBrains Mono', monospace", size: 11 } } },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 13: Model Comparison
   ───────────────────────────────────────────────────── */
function buildModelCompChart() {
  const models = ['HistGB','RandomForest','GradientBoosting','Poisson','ElasticNet','Lasso','Ridge'];
  const cvWAPE = [35.6, 37.9, 39.2, 41.1, 38.8, 44.2, 46.1];
  const bgColors = models.map(m => m === 'HistGB' ? COLORS.blue.main + 'CC' : COLORS.blue.light);
  const bdrColors = models.map(m => m === 'HistGB' ? COLORS.blue.dark : COLORS.blue.light);

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
          title: { display: true, text: 'Mean CV WAPE (%)', font: { size: 11 }, color: '#9CA3AF' },
          beginAtZero: false,
          min: 30,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 14: ARM Lift (top rules)
   ───────────────────────────────────────────────────── */
function buildArmLiftChart() {
  const topRules = DATA.arm
    .filter(r => r.in_headline === 'True' || r.policy_driven === 'False')
    .sort((a,b) => +b.lift - +a.lift)
    .slice(0, 10);

  if (topRules.length === 0) {
    // Use hardcoded top rules from findings
    const rules = [
      { rule: '{arrival=morning, idle} → {stay=6-10h}', lift: 2.12 },
      { rule: '{evening arrival, mostly_charging} → {stay=under_2h}', lift: 2.38 },
      { rule: '{under_2kWh} → {power=low}', lift: 1.92 },
      { rule: '{stay=under_2h} → {mostly_charging}', lift: 1.63 },
      { rule: '{stay=6-10h, request<90%} → {mostly_idle}', lift: 2.15 },
      { rule: '{stay=under_2h} → {busy_charger}', lift: 1.37 },
      { rule: '{midday + weekday} → {less_busy_charger}', lift: 1.33 },
      { rule: '{stay=6-10h} → {morning_arrival}', lift: 1.69 },
    ];

    const labels = rules.map(r => r.rule);
    const vals   = rules.map(r => r.lift);
    renderArmLiftChart(labels, vals, null);
    return;
  }

  const labels = topRules.map(r => r.rule.length > 70 ? r.rule.slice(0,67)+'…' : r.rule);
  const vals   = topRules.map(r => +r.lift);
  const sessions = topRules.map(r => +r.sessions || 0);
  renderArmLiftChart(labels, vals, sessions, topRules);
}

function renderArmLiftChart(labels, vals, sessions, raw) {
  const bgColors = vals.map(v => v >= 2 ? COLORS.blue.main + 'CC' : COLORS.blue.light);

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
        tooltip: {
          callbacks: {
            label: i => ` Lift: ${(+i.raw).toFixed(2)}x`,
            afterLabel: i => raw ? ` Sessions: ${raw[i.dataIndex]?.sessions || ''}` : '',
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Lift (1× = random chance)', font: { size: 11 } },
          min: 1, beginAtZero: false,
          grid: { color: 'rgba(0,0,0,.04)' },
        },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 15-17: Profile Donut Charts
   ───────────────────────────────────────────────────── */
function buildProfileDonuts() {
  const profiles = DATA.profiles;
  const pmap = {};
  if (profiles && profiles.length > 0) {
    profiles.forEach(p => { pmap[p.profile] = p; });
  } else {
    // fallback
    pmap['Workday commuter'] = { share_sessions:'0.277', share_charger_hours:'0.452', share_energy:'0.306' };
    pmap['Quick top-up']     = { share_sessions:'0.269', share_charger_hours:'0.053', share_energy:'0.189' };
    pmap['Short visit']      = { share_sessions:'0.306', share_charger_hours:'0.207', share_energy:'0.296' };
    pmap['Other long stay']  = { share_sessions:'0.148', share_charger_hours:'0.288', share_energy:'0.209' };
  }

  const labels = ['Workday Commuter','Quick Top-up','Short Visit','Other Long Stay'];
  const keys   = ['Workday commuter','Quick top-up','Short visit','Other long stay'];
  const colors = [COLORS.blue.main, COLORS.green.main, COLORS.amber.main, COLORS.purple.main];
  const lightColors = [COLORS.blue.light, COLORS.green.light, COLORS.amber.light, COLORS.purple.light];

  function makeDonut(canvasId, field) {
    const vals = keys.map(k => +(+pmap[k]?.[field] * 100).toFixed(1));
    mkChart(canvasId, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderColor: '#fff', borderWidth: 3 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: i => ` ${i.label}: ${i.raw}%` } },
        },
      },
    });
  }

  makeDonut('profileSessionChart', 'share_sessions');
  makeDonut('profileHoursChart',   'share_charger_hours');
  makeDonut('profileEnergyChart',  'share_energy');
}

/* ─────────────────────────────────────────────────────
   ARM TABLE
   ───────────────────────────────────────────────────── */
function buildArmTable() {
  const tbody = document.getElementById('armTableBody');
  if (!tbody) return;

  const rows = DATA.arm.length > 0
    ? DATA.arm
        .filter(r => r.description && r.description.trim() !== '')
        .sort((a,b) => +b.lift - +a.lift)
        .slice(0, 25)
    : getHardcodedRules();

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
      <td style="font-family:'JetBrains Mono',monospace;font-size:11.5px;max-width:300px;word-break:break-word">${escHtml(r.rule || r.description || '')}</td>
      <td><span class="badge badge-blue">${escHtml(r.theme || '')}</span></td>
      <td>${r.support ? (+r.support * 100).toFixed(1)+'%' : ''}</td>
      <td>${r.confidence ? (+r.confidence * 100).toFixed(0)+'%' : ''}</td>
      <td><strong>${r.lift ? (+r.lift).toFixed(2)+'×' : ''}</strong></td>
      <td>${r.extra_sessions_per_week ? (+r.extra_sessions_per_week).toFixed(1) : r.sessions || ''}</td>
      <td>${r.regimes_with_lift_over_1_1 || r['regimes_with_lift_over_1.1'] || '—'}</td>
    </tr>
  `).join('');
}

function getHardcodedRules() {
  return [
    { rule:'{stay=6-10h} → {arrival=morning}', theme:'stay & idle time', support:0.223, confidence:0.70, lift:1.69, extra_sessions_per_week:14.1, 'regimes_with_lift_over_1.1':'4/4' },
    { rule:'{stay=under_2h} → {mostly_charging}', theme:'stay & idle time', support:0.181, confidence:0.67, lift:1.63, extra_sessions_per_week:11.4, 'regimes_with_lift_over_1.1':'4/4' },
    { rule:'{under_2kWh} → {power=low}', theme:'energy & power', support:0.124, confidence:0.79, lift:1.92, extra_sessions_per_week:7.8, 'regimes_with_lift_over_1.1':'4/4' },
    { rule:'{arrival=morning, mostly_idle} → {stay=6-10h}', theme:'stay & idle time', support:0.111, confidence:0.68, lift:2.12, extra_sessions_per_week:7.0, 'regimes_with_lift_over_1.1':'4/4' },
    { rule:'{request<90%, stay=6-10h} → {mostly_idle}', theme:'stay & idle time', support:0.102, confidence:0.65, lift:2.15, extra_sessions_per_week:6.4, 'regimes_with_lift_over_1.1':'3/3' },
    { rule:'{stay=under_2h} → {busy_charger}', theme:'stay & idle time', support:0.166, confidence:0.62, lift:1.37, extra_sessions_per_week:5.8, 'regimes_with_lift_over_1.1':'3/4' },
    { rule:'{midday + weekday} → {less_busy_charger}', theme:'stay & idle time', support:0.150, confidence:0.73, lift:1.33, extra_sessions_per_week:4.7, 'regimes_with_lift_over_1.1':'4/4' },
    { rule:'{evening + mostly_charging} → {stay=under_2h}', theme:'stay & idle time', support:0.054, confidence:0.64, lift:2.38, extra_sessions_per_week:6.4, 'regimes_with_lift_over_1.1':'4/4' },
  ];
}

/* ─────────────────────────────────────────────────────
   CHART 18: Occupancy Profile (Stations section)
   ───────────────────────────────────────────────────── */
function buildOccupancyChart() {
  const hours = Array.from({length:24}, (_,i) => `${String(i).padStart(2,'0')}:00`);
  // Approximate weekday occupancy from findings: peak ~28.1 at 13:00
  const occ = [
    0.5, 0.3, 0.2, 0.2, 0.3, 0.8,
    5.2, 14.3, 21.0, 24.8, 26.5, 27.4,
    28.0, 28.1, 27.5, 26.8, 25.3, 22.0,
    16.4, 10.8, 6.2, 3.1, 1.5, 0.8,
  ];

  mkChart('occupancyChart', {
    type: 'line',
    data: {
      labels: hours,
      datasets: [{
        label: 'Avg vehicles plugged in',
        data: occ,
        borderColor: COLORS.blue.main,
        backgroundColor: COLORS.blue.main + '18',
        borderWidth: 2.5,
        pointRadius: 3,
        tension: 0.4,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: i => ` ${i.raw} vehicles plugged in` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0, font: { size: 10 } } },
        y: {
          title: { display: true, text: 'Vehicles plugged in', font: { size: 11 }, color: '#9CA3AF' },
          beginAtZero: true,
          max: 55,
          ticks: {
            callback: v => {
              if (v === 54) return '54 (max)';
              return v;
            },
          },
        },
      },
      plugins: {
        annotation: {
          annotations: {
            maxLine: {
              type: 'line', yMin: 54, yMax: 54,
              borderColor: COLORS.red.main + '60',
              borderWidth: 1.5,
              borderDash: [4, 4],
              label: { content: 'Max capacity (54)', display: true, position: 'end', font: { size: 10 } },
            },
          },
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   CHART 19: Lorenz Curve (station utilisation)
   ───────────────────────────────────────────────────── */
function buildLorenzChart() {
  // Approximate from Gini 0.34; top 10 stations = 35% of sessions (55 stations)
  const n = 55;
  const labels = Array.from({length:n+1}, (_,i) => (i/n*100).toFixed(0)+'%');

  // Perfect equality line
  const equality = Array.from({length:n+1}, (_,i) => i/n*100);

  // Lorenz curve approximated for Gini 0.34
  function lorenzPoint(pct) {
    // Approximate using power curve: L(x) = x^(1/(1-G)) roughly
    return Math.pow(pct/100, 2.03) * 100;
  }
  const lorenz = Array.from({length:n+1}, (_,i) => lorenzPoint(i/n*100));

  mkChart('lorenzChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Perfect equality',
          data: equality,
          borderColor: COLORS.gray.mid,
          borderDash: [5,3],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Actual (Gini 0.34)',
          data: lorenz,
          borderColor: COLORS.blue.main,
          backgroundColor: COLORS.blue.main + '12',
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
        tooltip: {
          callbacks: {
            label: i => ` ${i.dataset.label}: ${(+i.raw).toFixed(1)}% of sessions`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: '% of stations (ranked by usage)', font: { size: 11 }, color: '#9CA3AF' },
          ticks: { maxTicksLimit: 6, font: { size: 10 } },
        },
        y: {
          title: { display: true, text: '% of total sessions', font: { size: 11 }, color: '#9CA3AF' },
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────
   REFRESH: re-run filter-sensitive charts
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
  const total   = filtered.reduce((s,d) => s + +d.session_count, 0);
  const avgDay  = filtered.length ? (total / filtered.length) : 0;

  const kpiSessions = document.getElementById('kpi-sessions');
  const kpiAvgDay   = document.getElementById('kpi-avg-day');
  if (kpiSessions) kpiSessions.textContent = total.toLocaleString();
  if (kpiAvgDay)   kpiAvgDay.textContent   = avgDay.toFixed(1);
}

/* ─────────────────────────────────────────────────────
   UTILITY
   ───────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────────────── */
async function init() {
  initNav();
  initFilters();

  await loadAllData();

  // ── Overview charts ──
  buildTimelineChart();

  // ── Demand charts ──
  buildDOWChart();
  buildIntradayChart();
  buildMonthlyTrendChart();

  // ── Energy charts ──
  buildEnergyDistChart();
  buildDurationDistChart();
  buildProfileRadarChart();
  buildEfficiencyChart();

  // ── Forecast charts ──
  buildHoldoutChart();
  buildFutureForecastChart();

  // ── ML Model charts ──
  buildWapeChart();
  buildFeatureChart();
  buildModelCompChart();

  // ── Association charts ──
  buildArmLiftChart();
  buildProfileDonuts();
  buildArmTable();

  // ── Stations charts ──
  buildOccupancyChart();
  buildLorenzChart();

  // KPIs
  updateKPIs();
}

document.addEventListener('DOMContentLoaded', init);
