// dashboard.js — V1RA Dashboard v3 (Redesigned)

let view = 'global';
let afIgState = { p:1, q:'' }, afTkState = { p:1, q:'' }, sjState = { p:1, q:'' };
let ashTkState = { p:1, q:'' };
let creatorState = { p:1 }, brandState = { p:1 };
let afnanChart = null, localChart = null, nicheChart = null, countryChart = null;
let ashTkChart = null;

let currentRange = { start: null, end: null, type: 'all', label: 'All Time' };

window.addEventListener('DOMContentLoaded', () => {
  currentRange.start = null;
  currentRange.end = null;
  
  updateDateField(); // sync initial active states (desktop + mobile)
  switchView('global');
  setInterval(poll, 60000);
  setInterval(pollLiveLogs, 3000);

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('date-filter-dropdown');
    const menu = document.getElementById('date-menu');
    if (dropdown && !dropdown.contains(e.target)) {
        menu.classList.add('hidden');
        document.getElementById('date-arrow').style.transform = 'rotate(0deg)';
    }
  });
});

function toggleMobileMenu() {
  const sb = document.getElementById('sidebar');
  if(sb) sb.classList.toggle('mobile-open');
}

function switchView(v) {
  view = v;
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));

  const vEl = document.getElementById('view-'+v);
  if(vEl) vEl.classList.add('active');

  const scrollContainer = document.getElementById('main-scroll-container');
  if(scrollContainer) scrollContainer.scrollTop = 0;

  // Highlight active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
  });
  const navEl = document.getElementById('nav-'+v);
  if(navEl) navEl.classList.add('active');

  // Auto-close sidebar on mobile
  const sb = document.getElementById('sidebar');
  if(sb) sb.classList.remove('mobile-open');

  // Small delay to let the view section become visible and the browser
  // lay out the canvas dimensions before Chart.js tries to render.
  // The elegantFadeIn animation starts at opacity:0 so we need the element
  // to be in the DOM and sized before Chart.js measures it.
  setTimeout(() => poll(), 50);
}

// ─── DATE FILTER LOGIC ───
window.toggleDateMenu = function() {
  const m = document.getElementById('date-menu');
  const a = document.getElementById('date-arrow');
  const isHidden = m.classList.toggle('hidden');
  a.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
};

window.setDateFilter = function(type) {
  const now = new Date();
  let start = null, end = null, label = '';

  if (type === 'today') {
    start = now.toISOString().split('T')[0];
    end = start;
    label = 'Today';
  } else if (type === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    start = yest.toISOString().split('T')[0];
    end = start;
    label = 'Yesterday';
  } else if (type === 'all') {
    start = null; end = null; label = 'All Time';
  }

  currentRange = { start, end, type, label };
  updateDateField();
  document.getElementById('date-menu').classList.add('hidden');
  document.getElementById('date-arrow').style.transform = 'rotate(0deg)';
  // Close mobile custom range if open
  const mobBox = document.getElementById('mob-custom-range');
  if (mobBox) mobBox.style.display = 'none';
  poll();
};

window.showCustomRange = function() {
  // Use style.display to avoid Tailwind hidden/flex conflict
  const box = document.getElementById('custom-range-box');
  if (box) { box.style.display = 'flex'; box.style.flexDirection = 'column'; }
};

window.applyCustomRange = function() {
  const s = document.getElementById('start-date-input').value;
  const e = document.getElementById('end-date-input').value;
  if (!s || !e) { alert('Please select both start and end dates'); return; }
  
  currentRange = { start: s, end: e, type: 'custom', label: 'Custom Range' };
  updateDateField();
  document.getElementById('date-menu').classList.add('hidden');
  document.getElementById('date-arrow').style.transform = 'rotate(0deg)';
  // Reset custom-range-box for next open
  const box = document.getElementById('custom-range-box');
  if (box) box.style.display = 'none';
  poll();
};

// ─── MOBILE DATE RANGE ───
window.toggleMobileDateRange = function() {
  const box = document.getElementById('mob-custom-range');
  if (!box) return;
  const isOpen = box.style.display === 'flex';
  box.style.display = isOpen ? 'none' : 'flex';
  box.style.flexDirection = 'column';
};

window.applyMobileCustomRange = function() {
  const s = document.getElementById('mob-start-date').value;
  const e = document.getElementById('mob-end-date').value;
  if (!s || !e) { alert('Please select both start and end dates'); return; }
  currentRange = { start: s, end: e, type: 'custom', label: 'Custom Range' };
  const box = document.getElementById('mob-custom-range');
  if (box) box.style.display = 'none';
  updateDateField();
  poll();
};

function updateDateField() {
  document.getElementById('current-date-label').innerText = currentRange.label;

  // Desktop dropdown: highlight matching item
  document.querySelectorAll('.date-menu-item').forEach(el => {
    el.classList.remove('active');
    const txt = el.innerText.trim();
    if (
      txt === currentRange.label ||
      (currentRange.type === 'custom' && txt === 'Custom Range')
    ) el.classList.add('active');
  });

  // Mobile pills: highlight matching type
  document.querySelectorAll('.mob-date-btn').forEach(el => {
    const btnType = el.dataset.filter;
    const isActive = btnType === currentRange.type;
    el.classList.toggle('bg-indigo-500/20', isActive);
    el.classList.toggle('text-indigo-400', isActive);
    el.classList.toggle('border-indigo-500/30', isActive);
    el.classList.toggle('bg-white/[0.03]', !isActive);
    el.classList.toggle('text-zinc-400', !isActive);
    el.classList.toggle('border-white/10', !isActive);
  });
  // Mobile custom btn gets highlighted for custom type
  const mobCustomBtn = document.getElementById('mob-custom-btn');
  if (mobCustomBtn) {
    const isActive = currentRange.type === 'custom';
    mobCustomBtn.classList.toggle('bg-indigo-500/20', isActive);
    mobCustomBtn.classList.toggle('text-indigo-400', isActive);
    mobCustomBtn.classList.toggle('border-indigo-500/30', isActive);
    mobCustomBtn.classList.toggle('bg-white/[0.03]', !isActive);
    mobCustomBtn.classList.toggle('text-zinc-400', !isActive);
    mobCustomBtn.classList.toggle('border-white/10', !isActive);
  }
}

function getDateParams() {
  if (!currentRange.start && !currentRange.end) return '';
  return `&startDate=${currentRange.start}&endDate=${currentRange.end}`;
}

// Silently refresh creator outreach data (for views that need totals but don't show the chart)
async function pollCreatorOutreach() {
  try {
    const dp = getDateParams();
    const url = `/api/creator-outreach${dp ? '?' + dp.slice(1) : ''}`;
    const data = await fetch(url).then(r => r.json());
    creatorOutreachData = Array.isArray(data) ? data : [];
  } catch(e) {
    console.error('pollCreatorOutreach error:', e);
    creatorOutreachData = [];
  }
}

function poll() {
  if(view === 'creator') {
    // For creator view: load chart data first (it updates creatorOutreachData), then stats
    loadCreatorOutreachChart().then(() => { loadGlobal(); });
    cLoad();
  } else {
    // For all other views: silently load outreach totals so global KPIs stay accurate
    pollCreatorOutreach().then(() => {
      loadGlobal();
      if(view === 'brand')  { loadBrandOutreachChart(); bLoad(); }
      if(view === 'afnan')  { loadAfnanChart(); loadAfnanTags(); afLoad('ig'); afLoad('tk'); }
      if(view === 'local')  { loadLocalChart(); loadNicheChart(); loadCountryChart(); sjLoad(); }
      if(view === 'ash-tk') { loadAshTkChart(); loadAshTkData(ashTkState.p); }
    });
  }
}

// ═══════════════════════════════════════════
// GLOBAL OVERVIEW
// ═══════════════════════════════════════════
async function loadGlobal() {
  try {
    const r = await fetch(`/api/overview?_=${Date.now()}${getDateParams()}`);
    if(r.status===401) { window.location.href='/'; return; }
    const d = await r.json();

    // Server may return { error: 'warming up' } before GLOBAL_STATE is populated
    if (!d || !d.cloud || !d.local) {
      console.warn('Overview not ready yet, will retry on next poll.');
      return;
    }

    const hist = typeof getFilteredCreatorOutreach === 'function' ? getFilteredCreatorOutreach() : { sent: 0, replies: 0, signups: 0, social: 0, email: 0 };
    const histBrands = typeof getFilteredBrandOutreach === 'function' ? getFilteredBrandOutreach() : { sent: 0, replies: 0 };

    animateVal('g-cloud-em', d.cloud.emails);
    animateVal('g-cloud-sent', d.cloud.sent + hist.sent + histBrands.sent);
    animateVal('g-local-em', d.local.emails);
    animateVal('g-local-sent', d.local.sent);
    if(d.ashTk && d.ashTk.emails !== undefined) {
      animateVal('g-ash-em', d.ashTk.emails);
    }

    if(view === 'afnan') {
      animateVal('af-ig-acc', d.afnanIg.accounts);
      animateVal('af-tk-acc', d.afnanTk.accounts);
      animateVal('af-ig-em', d.afnanIg.emails);
      animateVal('af-tk-em', d.afnanTk.emails);
      animateVal('af-total-em', d.cloud.emails);
      
      const totalAcc = d.afnanIg.accounts + d.afnanTk.accounts;
      const hitRate = totalAcc > 0 ? (d.cloud.emails / totalAcc) * 100 : 0;
      const igRate = d.afnanIg.accounts > 0 ? (d.afnanIg.emails / d.afnanIg.accounts) * 100 : 0;
      const tkRate = d.afnanTk.accounts > 0 ? (d.afnanTk.emails / d.afnanTk.accounts) * 100 : 0;
      
      document.getElementById('af-hit-rate').innerText = hitRate.toFixed(1) + '%';
    }

    if(view === 'ash-tk' && d.ashTk) {
      animateVal('ash-tk-acc', d.ashTk.accounts);
      animateVal('ash-tk-em', d.ashTk.emails);
      const hitRate = d.ashTk.accounts > 0 ? ((d.ashTk.emails / d.ashTk.accounts) * 100).toFixed(1) : '0.0';
      const hrEl = document.getElementById('ash-tk-hitrate');
      if (hrEl) hrEl.innerText = hitRate + '%';
    }

    if(view === 'local') {
      animateVal('sj-vis', d.local.accounts);
      animateVal('sj-em', d.local.emails);
      
      const extRate = d.local.accounts > 0 ? (d.local.emails / d.local.accounts) * 100 : 0;
      const discRate = d.local.accounts > 0 ? Math.min(100, (d.local.accounts / 2000) * 100) : 0; // Simulated
      const eff = d.local.emails > 0 ? 94.2 : 0; // Simulated efficiency when active
      

    }

    // Creator / Brand Updates
    if (view === 'creator' || view === 'brand') {
       const s = d.stats;
       const vHist = view === 'creator' ? hist : { sent: 0, replies: 0, signups: 0, social: 0, email: 0 };

       // ── Top KPI cards come 100% from Google Sheet tracking data ──
       // (The scraper email counts appear in the Afnan/Sanjeev breakdown below)
       const totalSent    = vHist.sent    || 0;
       const totalReplies = vHist.replies || 0;
       const replyRateStr = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) + '%' : '0%';

       animateVal('c-users',        (s.creatorCloudUsers || 0) + (s.creatorSanjUsers || 0));
       animateVal('c-total',        totalSent);
       animateVal('c-replied',      totalReplies);
       // Note: c-signup-total / c-signup-social / c-signup-email are set by fetchSignups() from live API — do not overwrite here

       const rateEl = document.getElementById('c-reply-rate');
       if (rateEl) { rateEl.innerText = replyRateStr; rateEl.dataset.val = replyRateStr; }

       // ── Scraper breakdown cards (emails collected by each scraper) ──
       const cCloudSentWithHist = s.creatorCloudSent + vHist.sent;
       const cCloudRepWithHist  = s.creatorCloudRep  + vHist.replies;
       const cSanjSent = s.creatorSanjSent;
       const cSanjRep  = s.creatorSanjRep;

       animateVal('c-cloud-em',   s.creatorCloud);
       animateVal('c-local-em',   s.creatorSanj);
       animateVal('c-cloud-sent', cCloudSentWithHist);
       animateVal('c-local-sent', cSanjSent);
       animateVal('c-cloud-rep',  cCloudRepWithHist);
       animateVal('c-local-rep',  cSanjRep);

       const bUsers = s.brandCloud + s.brandSanj;
       const bTotal = s.brandCloud + s.brandSanj;
       
       const vHistBrand = view === 'brand' ? (typeof getFilteredBrandOutreach === 'function' ? getFilteredBrandOutreach() : { sent: 0, replies: 0 }) : { sent: 0, replies: 0 };
       const bCloudSentWithHist = s.brandCloudSent + vHistBrand.sent;
       const bCloudRepWithHist = s.brandCloudRep + vHistBrand.replies;
       
       const bSent = bCloudSentWithHist + s.brandSanjSent;
       const bRep = bCloudRepWithHist + s.brandSanjRep;
       
       animateVal('b-users', bUsers);
       animateVal('b-total', bTotal);
       animateVal('b-sent', bSent);
       animateVal('b-replied', bRep);
       document.getElementById('b-reply-rate').innerText = bSent > 0 ? ((bRep / bSent) * 100).toFixed(1) + '%' : '0%';
       document.getElementById('b-rate').innerText = bTotal > 0 ? ((bSent / bTotal) * 100).toFixed(1) + '%' : '0%';
       
       animateVal('b-cloud-em', s.brandCloud);
       animateVal('b-local-em', s.brandSanj);
       animateVal('b-cloud-sent', bCloudSentWithHist);
       animateVal('b-local-sent', s.brandSanjSent);
       animateVal('b-cloud-rep', bCloudRepWithHist);
       animateVal('b-local-rep', s.brandSanjRep);
    }
  } catch (e) {
    console.error('loadGlobal error:', e);
  }
}

// ═══════════════════════════════════════════
// ANIMATED VALUE
// ═══════════════════════════════════════════
function animateVal(id, end) {
  const obj = document.getElementById(id);
  if(!obj) return;
  const target = parseFloat(end);
  if(isNaN(target)) { obj.innerText = end; return; }
  if (obj.dataset.val == target) return;
  obj.dataset.val = target;
  const duration = 1500;
  let startTimestamp = null;
  const startVal = parseFloat(obj.innerText.replace(/,/g,'')) || 0;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    const curr = Math.floor(startVal + (target - startVal) * ease);
    obj.innerText = curr.toLocaleString();
    if (progress < 1) { window.requestAnimationFrame(step); }
    else { obj.innerText = target.toLocaleString(); }
  };
  window.requestAnimationFrame(step);
}

// ═══════════════════════════════════════════
// RADIAL GAUGE ANIMATOR
// ═══════════════════════════════════════════
function updateGauge(id, percent) {
  const circle = document.getElementById(id);
  const valEl = document.getElementById(id + '-val');
  if(!circle || !valEl) return;
  const target = Math.min(Math.max(percent, 0), 100);
  
  if (circle.dataset.val == target) return;
  circle.dataset.val = target;
  
  const circumference = 2 * Math.PI * 58; // r=58
  const offset = circumference - (target / 100) * circumference;
  
  circle.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)';
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = offset;
  
  // Animate text
  const duration = 1500;
  let startTimestamp = null;
  const startVal = parseFloat(valEl.innerText) || 0;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    const curr = startVal + (target - startVal) * ease;
    valEl.innerText = curr.toFixed(1) + '%';
    if (progress < 1) { window.requestAnimationFrame(step); }
    else { valEl.innerText = target.toFixed(1) + '%'; }
  };
  window.requestAnimationFrame(step);
}

// ═══════════════════════════════════════════
// CREATORS & BRANDS (no search/filter)
// ═══════════════════════════════════════════
window.cLoad = async function() { await loadGlobalView('creator', creatorState); }
window.bLoad = async function() { await loadGlobalView('brand', brandState); }

async function loadGlobalView(type, state) {
  try {
    const r = await fetch(`/api/global/emails?type=${type}&platform=all&status=all&page=${state.p}&q=${getDateParams()}`);
    const d = await r.json();
    const statEl = document.getElementById(`${type.charAt(0)}-stats`);
    if(statEl) statEl.innerText = `${d.total} records`;
    const tbEl = document.getElementById(`${type.charAt(0)}-tbody`);
    if(tbEl) {
      tbEl.innerHTML = d.rows.map(r => `<tr>
        <td>${platformBadge(r.platform)}</td>
        <td>${usernameLink(r.username, r.platform)}</td>
        <td class="font-mono text-xs text-zinc-400">${esc(r.email)}</td>
        <td class="font-mono text-xs">${fmtNum(r.followers)}</td>
        <td class="text-zinc-500 text-xs">${r.scrapedAt?new Date(r.scrapedAt).toLocaleDateString():'-'}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="text-center text-zinc-500 py-8">No records</td></tr>`;
    }
    renderPag(d.total, d.limit, state.p, `${type.charAt(0)}-pag`, p => { state.p=p; if(type==='creator') cLoad(); else bLoad(); });
  } catch(e) { console.error(`loadGlobalView ${type} error:`, e); }
}

// ═══════════════════════════════════════════
// AFNAN MERGED (IG + TK)
// ═══════════════════════════════════════════
window.afLoad = async function(plat) {
  try {
    const state = plat === 'ig' ? afIgState : afTkState;
    const dp = getDateParams();
    const r = await fetch(`/api/cloud/emails?platform=${plat}&page=${state.p}&status=all&q=&${dp ? dp.slice(1) : ''}`);

    const d = await r.json();
    const statEl = document.getElementById(`af-${plat}-stats`);
    if(statEl) statEl.innerText = `${d.total} records`;
    const tbEl = document.getElementById(`af-${plat}-tbody`);
    if(tbEl) {
      const platName = plat === 'ig' ? 'Instagram' : 'TikTok';
      tbEl.innerHTML = d.rows.map(r => `<tr>
        <td>${usernameLink(r.username, platName)}</td>
        <td class="font-mono text-xs text-zinc-400">${esc(r.email)}</td>
        <td class="font-mono text-xs">${fmtNum(r.followers)}</td>
        <td class="text-zinc-500 text-xs">${r.scrapedAt?new Date(r.scrapedAt).toLocaleDateString():'-'}</td>
      </tr>`).join('') || `<tr><td colspan="4" class="text-center text-zinc-500 py-8">No records</td></tr>`;
    }
    renderPag(d.total, d.limit, state.p, `af-${plat}-pag`, p => { state.p=p; afLoad(plat); });
  } catch(e) {
    console.error(`afLoad ${plat} error:`, e);
  }
}

async function loadAfnanTags() {
  try {
    const r = await fetch(`/api/cloud/tags?_=${Date.now()}${getDateParams()}`);
    const tags = await r.json();
    
    const countEl = document.getElementById('af-tags-count');
    if(countEl) countEl.innerText = `${tags.length} tags`;
    
    const container = document.getElementById('afnan-tags-container');
    if(!container) return;
    
    if(tags.length === 0) {
      container.innerHTML = `<div class="w-full text-center text-zinc-600 py-12">No tags found</div>`;
      return;
    }
    
    container.innerHTML = tags.map(t => `
      <div class="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 cursor-default">
        <span class="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">#${esc(t.name)}</span>
        <span class="text-[10px] font-mono text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded-md group-hover:bg-indigo-500/20 group-hover:text-indigo-200 transition-all">${t.count}</span>
      </div>
    `).join('');
  } catch(e) {
    console.error('loadAfnanTags error:', e);
  }
}

// ═══════════════════════════════════════════
// LOCAL (SANJEEV)
// ═══════════════════════════════════════════
window.sjLoad = async function() {
  try {
    const dp = getDateParams();
    const r = await fetch(`/api/local/emails?page=${sjState.p}&status=all&q=&${dp ? dp.slice(1) : ''}`);
    const d = await r.json();
    const statEl = document.getElementById('sj-table-stats');
    if(statEl) statEl.innerText = `${d.total} records`;
    const tbEl = document.getElementById('sj-tbody');
    if(tbEl) {
      tbEl.innerHTML = d.rows.map(r => `<tr>
        <td>${platformBadge(r.platform)}</td>
        <td>${usernameLink(r.username, r.platform)}</td>
        <td class="font-mono text-xs text-zinc-400">${esc(r.email)}</td>
        <td class="font-mono text-xs">${fmtNum(r.followers)}</td>
        <td class="text-zinc-500 text-xs">${r.scrapedAt?new Date(r.scrapedAt).toLocaleDateString():'-'}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="text-center text-zinc-500 py-8">No records</td></tr>`;
    }
    renderPag(d.total, d.limit, sjState.p, 'sj-pag', p => { sjState.p=p; sjLoad(); });
  } catch(e) {
    console.error('sjLoad error:', e);
  }
}

// ═══════════════════════════════════════════
// ARCHITECTURAL GRAPH — Futuristic Building Style
// ═══════════════════════════════════════════
function createArchitecturalChart(canvasId, type, labels, datasets, options = {}) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return null;
  const ctx = canvas.getContext('2d');

  const config = {
    type: type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          display: type === 'pie' || type === 'doughnut',
          position: 'bottom',
          labels: { color: '#a1a1aa', font: { family: 'Inter', size: 11 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: 'rgba(10,10,14,0.95)', borderColor: 'rgba(93,95,239,0.3)',
          borderWidth: 1, titleColor: '#fff', bodyColor: '#a1a1aa',
          padding: 14, cornerRadius: 12,
          titleFont: { family: 'Outfit', size: 14, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 12 },
        }
      },
      ...options
    }
  };

  if (type === 'bar' || type === 'line') {
    config.options.scales = {
      x: {
        grid: { display: false },
        ticks: { color: '#52525b', font: { family: 'JetBrains Mono', size: 10 } },
        border: { color: 'rgba(255,255,255,0.05)' },
        ...(options.scales?.x || {})
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
        ticks: { color: '#52525b', font: { family: 'JetBrains Mono', size: 10 } },
        border: { display: false },
        beginAtZero: true,
        ...(options.scales?.y || {})
      },
      ...((options.scales && options.scales.y1) ? { y1: options.scales.y1 } : {})
    };
  }

  return new Chart(ctx, config);
}

let brandChart = null;

const brandOutreachHistory = [
  { date: "02/03", sent: 80, replies: 4 },
  { date: "03/03", sent: 150, replies: 8 },
  { date: "04/03", sent: 120, replies: 9 },
  { date: "05/03", sent: 200, replies: 12 },
  { date: "06/03", sent: 350, replies: 28 },
  { date: "07/03", sent: 0, replies: 15 },
  { date: "08/03", sent: 0, replies: 10 },
  { date: "09/03", sent: 180, replies: 14 },
  { date: "10/03", sent: 210, replies: 16 },
  { date: "11/03", sent: 0, replies: 8 },
  { date: "12/03", sent: 90, replies: 5 },
  { date: "13/03", sent: 165, replies: 11 },
  { date: "14/03", sent: 240, replies: 13 },
  { date: "15/03", sent: 0, replies: 3 },
  { date: "16/03", sent: 0, replies: 5 }
];

function getFilteredBrandOutreach() {
  if (typeof brandOutreachHistory === 'undefined') return { sent: 0, replies: 0 };
  let sent = 0;
  let replies = 0;
  brandOutreachHistory.forEach(item => {
    const parts = item.date.split('/');
    if (parts.length === 2) {
      const itemDateStr = `2026-${parts[1]}-${parts[0]}`;
      let include = true;
      if (currentRange && currentRange.start && itemDateStr < currentRange.start) include = false;
      if (currentRange && currentRange.end && itemDateStr > currentRange.end) include = false;
      if (include) {
        sent += item.sent;
        replies += item.replies;
      }
    }
  });
  return { sent, replies };
}

function loadBrandOutreachChart() {
  if (brandChart) brandChart.destroy();
  
  const labels = brandOutreachHistory.map(d => d.date);
  const sentData = brandOutreachHistory.map(d => d.sent);
  const repliesData = brandOutreachHistory.map(d => d.replies);

  brandChart = createArchitecturalChart('chartBrandOutreach', 'bar', labels, [
    {
      type: 'line',
      label: 'Replies',
      data: repliesData,
      borderColor: '#f472b6',
      backgroundColor: 'transparent',
      borderWidth: 3,
      tension: 0.4,
      pointBackgroundColor: '#ec4899',
      pointBorderColor: '#fff',
      pointRadius: 4,
      yAxisID: 'y1'
    },
    {
      type: 'bar',
      label: 'Emails Sent',
      data: sentData,
      backgroundColor: createGradient('chartBrandOutreach', '#ec4899'),
      hoverBackgroundColor: '#fbcfe8',
      borderColor: '#ec4899',
      borderWidth: 1,
      borderRadius: 4,
      yAxisID: 'y'
    }
  ], {
    scales: {
      y: { type: 'linear', position: 'left', beginAtZero: true },
      y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } }
    }
  });
}

let creatorChart = null;

// ── Live outreach data loaded from Google Sheets via /api/creator-outreach ──
let creatorOutreachData = [];

// Legacy placeholder — no longer used (replaced by live API)
const creatorOutreachHistory = [
  { date: "02/03", sent: 500, replies: 11, signups: 11, social: 6, email: 5 },
  { date: "03/03", sent: 1000, replies: 33, signups: 8, social: 5, email: 3 },
  { date: "04/03", sent: 1000, replies: 59, signups: 7, social: 4, email: 3 },
  { date: "05/03", sent: 2000, replies: 70, signups: 11, social: 9, email: 2 },
  { date: "06/03", sent: 3000, replies: 108, signups: 14, social: 11, email: 3 },
  { date: "07/03", sent: null, replies: 83, signups: 14, social: 6, email: 8 },
  { date: "08/03", sent: null, replies: 80, signups: 9, social: 4, email: 5 },
  { date: "09/03", sent: 1500, replies: 39, signups: 8, social: 4, email: 4 },
  { date: "10/03", sent: 1500, replies: 66, signups: 7, social: 3, email: 4 },
  { date: "11/03", sent: null, replies: 65, signups: 6, social: 2, email: 4 },
  { date: "12/03", sent: 468, replies: 20, signups: 4, social: 2, email: 2 },
  { date: "13/03", sent: 1146, replies: 49, signups: 0, social: 0, email: 0 },
  { date: "14/03", sent: 1918, replies: 40, signups: 8, social: 6, email: 2 },
  { date: "15/03", sent: 20, replies: 7, signups: 2, social: 1, email: 1 },
  { date: "16/03", sent: null, replies: 14, signups: 2, social: 0, email: 2 },
  { date: "17/03", sent: 684, replies: 22, signups: 5, social: 3, email: 2 },
  { date: "18/03", sent: 2550, replies: 55, signups: 6, social: 0, email: 6 },
  { date: "19/03", sent: 1794, replies: 25, signups: 5, social: 0, email: 5 },
  { date: "20/03", sent: 321, replies: 10, signups: 1, social: 0, email: 1 },
  { date: "21/03", sent: 336, replies: 13, signups: 4, social: 2, email: 2 },
  { date: "22/03", sent: 761, replies: 8, signups: 0, social: 0, email: 0 },
  { date: "23/03", sent: 1718, replies: 20, signups: 2, social: 2, email: 0 },
  { date: "24/03", sent: 1368, replies: 22, signups: 2, social: 0, email: 2 },
  { date: "25/03", sent: 3843, replies: 30, signups: 0, social: 0, email: 0 },
  { date: "26/03", sent: 0, replies: 16, signups: 0, social: 0, email: 0 },
  { date: "27/03", sent: 2833, replies: 35, signups: 5, social: 3, email: 2 },
  { date: "28/03", sent: 3844, replies: 50, signups: 11, social: 7, email: 4 },
  { date: "29/03", sent: 2953, replies: 80, signups: 20, social: 13, email: 7 },
  { date: "30/03", sent: 1870, replies: 78, signups: 20, social: 13, email: 7 },
  { date: "31/03", sent: 810, replies: 44, signups: 19, social: 11, email: 8 },
  { date: "01/04", sent: 817, replies: 34, signups: 11, social: 5, email: 6 },
  { date: "02/04", sent: 2009, replies: 29, signups: 13, social: 8, email: 5 },
  { date: "03/04", sent: 1456, replies: 40, signups: 18, social: 9, email: 9 },
  { date: "04/04", sent: 965, replies: null, signups: null, social: null, email: null }
];

// Returns totals already pre-filtered by API — just sum the cached data
function getFilteredCreatorOutreach() {
  return creatorOutreachData.reduce((acc, d) => ({
    sent:    acc.sent    + (d.sent    || 0),
    replies: acc.replies + (d.replies || 0),
    signups: acc.signups + (d.signups || 0),
    social:  acc.social  + (d.social  || 0),
    email:   acc.email   + (d.email   || 0),
  }), { sent: 0, replies: 0, signups: 0, social: 0, email: 0 });
}

async function loadCreatorOutreachChart() {
  try {
    const dp = getDateParams();
    const url = `/api/creator-outreach${dp ? '?' + dp.slice(1) : ''}`;
    const data = await fetch(url).then(r => r.json());
    creatorOutreachData = Array.isArray(data) ? data : [];

    // ── Directly update all KPI cards from Tracking sheet columns ──
    // Emails Sent → Total Emails, Inbox Replies → Replies, etc.
    const totals = creatorOutreachData.reduce((acc, d) => ({
      sent:    acc.sent    + (d.sent    || 0),
      replies: acc.replies + (d.replies || 0),
      signups: acc.signups + (d.signups || 0),
      social:  acc.social  + (d.social  || 0),
      email:   acc.email   + (d.email   || 0),
    }), { sent: 0, replies: 0, signups: 0, social: 0, email: 0 });

    animateVal('c-total',         totals.sent);
    animateVal('c-replied',       totals.replies);
    const rr = totals.sent > 0 ? ((totals.replies / totals.sent) * 100).toFixed(1) + '%' : '0%';
    const rrEl = document.getElementById('c-reply-rate');
    if (rrEl) { rrEl.innerText = rr; rrEl.dataset.val = rr; }

    if (creatorChart) { creatorChart.destroy(); creatorChart = null; }

    if (creatorOutreachData.length === 0) {
      showChartEmptyState('chartCreatorOutreach', 'No outreach data — check your Google Sheet is shared with the service account');
      const insightEl = document.getElementById('trend-insight-text');
      if (insightEl) insightEl.innerHTML = 'No outreach data found for the selected period.';
      return;
    }
    clearChartEmptyState('chartCreatorOutreach');

    // ── Trend Insights ──
    let peakSent = 0, peakSentDay = 'N/A', bestConv = 0, bestConvDay = 'N/A';
    creatorOutreachData.forEach(d => {
      if ((d.sent || 0) > peakSent) { peakSent = d.sent; peakSentDay = d.label; }
      if ((d.signups || 0) > bestConv) { bestConv = d.signups; bestConvDay = d.label; }
    });
    const insightEl = document.getElementById('trend-insight-text');
    if (insightEl) {
      insightEl.innerHTML = `Peak volume was a massive <strong class='text-white'>${(peakSent||0).toLocaleString()}</strong> emails on <strong class='text-indigo-400'>${peakSentDay}</strong>. Best conversion: <strong class='text-teal-400'>${bestConvDay}</strong> with <strong class='text-white'>${bestConv || 0} total signups</strong>.`;
    }

    const labels      = creatorOutreachData.map(d => d.label);
    const sentData    = creatorOutreachData.map(d => d.sent);
    const repliesData = creatorOutreachData.map(d => d.replies);

    creatorChart = createArchitecturalChart('chartCreatorOutreach', 'bar', labels, [
      {
        type: 'line',
        label: 'Replies',
        data: repliesData,
        borderColor: '#34d399',
        backgroundColor: 'transparent',
        borderWidth: 3,
        tension: 0.4,
        spanGaps: true,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1'
      },
      {
        type: 'bar',
        label: 'Emails Sent',
        data: sentData,
        backgroundColor: createGradient('chartCreatorOutreach', '#6366f1'),
        hoverBackgroundColor: '#818cf8',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y'
      }
    ], {
      animation: { duration: 1500, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const val = ctx.raw;
              if (val === null || val === undefined) return ` ${ctx.dataset.label}: -`;
              return ` ${ctx.dataset.label}: ${val.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        y:  { type: 'linear', position: 'left',  beginAtZero: true },
        y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } }
      }
    });

    // Populate Tracking Data Table
    const tbEl = document.getElementById('tracking-tbody');
    if (tbEl) {
      // Show newest first
      const reversedData = [...creatorOutreachData].reverse();
      tbEl.innerHTML = reversedData.map(r => `<tr>
        <td class="font-mono text-[13px] text-zinc-300 border-l border-l-white/5">${r.date}</td>
        <td class="text-zinc-400 text-[13px]">${r.day ? esc(r.day) : '-'}</td>
        <td class="font-mono text-[13px] text-white font-bold">${fmtNum(r.sent)}</td>
        <td class="font-mono text-[13px] text-amber-400 font-bold">${fmtNum(r.replies)}</td>
        <td class="font-mono text-[13px] text-teal-400 font-bold">${fmtNum(r.signups)}</td>
        <td class="font-mono text-[13px] text-lime-400 font-bold">${fmtNum(r.social)}</td>
        <td class="font-mono text-[13px] text-fuchsia-400 font-bold border-r border-r-white/5">${fmtNum(r.email)}</td>
      </tr>`).join('') || `<tr><td colspan="7" class="text-center text-zinc-500 py-8 border-x border-x-white/5">No tracking data found</td></tr>`;
      
      const statEl = document.getElementById('tracking-stats');
      if (statEl) statEl.innerText = `${creatorOutreachData.length} records`;
    }

    // ── Populate Tracking Card KPIs (social/email/non-converted from live API) ──
    if (typeof window.loadTrackingCard === 'function') {
      window.loadTrackingCard();
    }

  } catch(e) {
    console.error('loadCreatorOutreachChart error:', e);
    showChartEmptyState('chartCreatorOutreach', 'Failed to load outreach data');
  }
}

function showChartEmptyState(canvasId, message = 'No data available yet') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  // Remove any existing empty state
  const existing = parent.querySelector('.chart-empty-state');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'chart-empty-state';
  el.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;pointer-events:none;';
  el.innerHTML = `<div style="font-size:2.5rem;opacity:0.25;">📊</div><p style="font-size:12px;font-weight:600;color:rgba(161,161,170,0.6);text-align:center;letter-spacing:0.05em;">${message}</p>`;
  parent.style.position = 'relative';
  parent.appendChild(el);
  canvas.style.opacity = '0';
}

function clearChartEmptyState(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const existing = parent.querySelector('.chart-empty-state');
  if (existing) existing.remove();
  canvas.style.opacity = '1';
}

// ═══════════════════════════════════════════
// ASH TIKTOK
// ═══════════════════════════════════════════
async function loadAshTkChart() {
  try {
    const res = await fetch('/api/ash-tk/daily');
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();

    if (ashTkChart) { ashTkChart.destroy(); ashTkChart = null; }

    // Update 'Today' KPI
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRow = data.find(d => d.date === todayStr);
    const todayCount = todayRow ? (todayRow.emails || 0) : 0;
    animateVal('ash-tk-today', todayCount);

    const hasData = data.some(d => (d.emails || 0) > 0);
    if (!hasData) {
      showChartEmptyState('chartAshTk', 'No data yet — check TikTok(Ash) sheet is populated');
      return;
    }
    clearChartEmptyState('chartAshTk');

    const labels = data.map(d => d.label);
    ashTkChart = createArchitecturalChart('chartAshTk', 'bar', labels, [
      {
        type: 'line',
        label: 'Users Scraped',
        data: data.map(d => d.tk || 0),
        borderColor: '#22d3ee',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        tension: 0.4,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1'
      },
      {
        type: 'bar',
        label: 'Emails Found',
        data: data.map(d => d.emails || 0),
        backgroundColor: createGradient('chartAshTk', '#0ea5e9'),
        hoverBackgroundColor: '#38bdf8',
        borderColor: '#0ea5e9',
        borderWidth: 1,
        borderRadius: 6,
        yAxisID: 'y'
      }
    ], {
      animation: { duration: 1500, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      scales: {
        y:  { type: 'linear', position: 'left',  beginAtZero: true },
        y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } }
      }
    });
  } catch(e) {
    console.error('loadAshTkChart error:', e);
    showChartEmptyState('chartAshTk', 'Failed to load chart data');
  }
}

window.loadAshTkData = async function(page = 1) {
  try {
    ashTkState.p = page;
    const q = (document.getElementById('ash-tk-search')?.value || '').trim();
    const dp = getDateParams();
    const url = `/api/ash-tk/emails?page=${page}&q=${encodeURIComponent(q)}${dp}`;
    const d = await fetch(url).then(r => r.json());

    const statEl = document.getElementById('ash-tk-stats');
    if (statEl) statEl.innerText = `${d.total.toLocaleString()} records`;

    const tbEl = document.getElementById('ash-tk-tbody');
    if (tbEl) {
      tbEl.innerHTML = d.rows.map(r => `<tr>
        <td>${usernameLink(r.username, 'TikTok')}</td>
        <td class="font-mono text-xs text-zinc-400">${esc(r.email)}</td>
        <td class="font-mono text-xs">${fmtNum(r.followers)}</td>
        <td class="text-zinc-500 text-xs">${r.hashtag ? '<span class="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full text-[11px] font-semibold">#'+esc(r.hashtag)+'</span>' : '-'}</td>
        <td class="text-zinc-500 text-xs">${r.scrapedAt ? new Date(r.scrapedAt).toLocaleDateString() : '-'}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="text-center text-zinc-500 py-8">No records found</td></tr>`;
    }
    renderPag(d.total, d.limit, page, 'ash-tk-pag', p => { ashTkState.p = p; loadAshTkData(p); });
  } catch(e) {
    console.error('loadAshTkData error:', e);
  }
};

async function loadAfnanChart() {
  try {
    const [igRes, tkRes] = await Promise.all([
      fetch('/api/afnan-ig/daily').then(r => r.json()),
      fetch('/api/afnan-tk/daily').then(r => r.json())
    ]);

    if(afnanChart) { afnanChart.destroy(); afnanChart = null; }

    const hasData = igRes.some(d => d.emails > 0) || tkRes.some(d => d.emails > 0);
    if (!hasData) {
      showChartEmptyState('chartAfnan', 'Collecting data — check back soon');
      return;
    }
    clearChartEmptyState('chartAfnan');

    const labels = igRes.map(d => d.label);
    afnanChart = createArchitecturalChart('chartAfnan', 'bar', labels, [
      {
        label: 'IG Emails',
        data: igRes.map(d => d.emails),
        backgroundColor: '#a78bfa',
        borderRadius: 6,
      },
      {
        label: 'TK Emails',
        data: tkRes.map(d => d.emails),
        backgroundColor: '#22d3ee',
        borderRadius: 6,
      }
    ]);
  } catch(e) {
    console.error('loadAfnanChart error:', e);
    showChartEmptyState('chartAfnan', 'Failed to load chart data');
  }
}

async function loadLocalChart() {
  try {
    const res = await fetch('/api/local/daily');
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();

    if(localChart) { localChart.destroy(); localChart = null; }

    if (!Array.isArray(data) || data.length === 0) {
      showChartEmptyState('chartLocal', 'No collection data yet — start the local scraper');
      return;
    }

    const hasData = data.some(d => (d.discovered || 0) > 0 || (d.processed || 0) > 0);
    if (!hasData) {
      showChartEmptyState('chartLocal', 'No activity in the last 14 days');
      return;
    }
    clearChartEmptyState('chartLocal');

    const labels = data.map(d => d.label);
    localChart = createArchitecturalChart('chartLocal', 'bar', labels, [
      {
        label: 'Users Discovered',
        data: data.map(d => d.discovered || 0),
        backgroundColor: '#f59e0b',
        borderRadius: 6,
      },
      {
        label: 'Emails Processed',
        data: data.map(d => d.processed || 0),
        backgroundColor: '#fb923c',
        borderRadius: 6,
      }
    ]);
  } catch(e) {
    console.error('loadLocalChart error:', e);
    showChartEmptyState('chartLocal', 'Failed to load chart data');
  }
}

async function loadNicheChart() {
  try {
    const res = await fetch('/api/local/niches');
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();

    if(nicheChart) { nicheChart.destroy(); nicheChart = null; }

    if (!Array.isArray(data) || data.length === 0) {
      showChartEmptyState('chartNiches', 'No niche data yet');
      return;
    }
    clearChartEmptyState('chartNiches');

    nicheChart = createArchitecturalChart('chartNiches', 'pie', data.map(d => d.name), [
      {
        data: data.map(d => d.value),
        backgroundColor: [
          '#5D5FEF', '#10B981', '#F59E0B', '#EC4899', '#4B4CE5',
          '#34D399', '#D97706', '#DB2777', '#6366F1', '#14B8A6'
        ],
        borderWidth: 0,
      }
    ]);
  } catch(e) {
    console.error('loadNicheChart error:', e);
    showChartEmptyState('chartNiches', 'Failed to load niche data');
  }
}

async function loadCountryChart() {
  try {
    const res = await fetch('/api/local/countries');
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();

    if(countryChart) { countryChart.destroy(); countryChart = null; }

    if (!Array.isArray(data) || data.length === 0) {
      showChartEmptyState('chartCountries', 'No country data yet');
      return;
    }
    clearChartEmptyState('chartCountries');

    countryChart = createArchitecturalChart('chartCountries', 'bar', data.map(d => d.name), [
      {
        label: 'Profiles',
        data: data.map(d => d.value),
        backgroundColor: '#5D5FEF',
        borderRadius: 4,
      }
    ], {
        indexAxis: 'y',
        plugins: { legend: { display: false } }
    });
  } catch(e) {
    console.error('loadCountryChart error:', e);
    showChartEmptyState('chartCountries', 'Failed to load country data');
  }
}

function createGradient(canvasId, color) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return 'transparent';
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);

  // Parse hex color to rgba
  const r = parseInt(color.slice(1,3), 16);
  const g = parseInt(color.slice(3,5), 16);
  const b = parseInt(color.slice(5,7), 16);

  gradient.addColorStop(0, `rgba(${r},${g},${b},0.25)`);
  gradient.addColorStop(0.5, `rgba(${r},${g},${b},0.08)`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  return gradient;
}

// ═══════════════════════════════════════════
// LIVE LOGS
// ═══════════════════════════════════════════
const logMessages = [
  '🔍 Scraping username @fashionista_nyc...',
  '📧 Email extracted: fashion***@gmail.com',
  '✅ Profile processed successfully',
  '💾 Database updated — new record added',
  '🔍 Scraping username @creative.minds...',
  '📧 Email extracted: creative***@outlook.com',
  '✅ Profile processed successfully',
  '💾 Database updated — record merged',
  '🔍 Scraping username @lifestyle_guru...',
  '⚡ Batch complete — 12 profiles in 4.2s',
  '📧 Email extracted: guru***@yahoo.com',
  '✅ Profile processed successfully',
  '💾 Database updated — new record added',
  '🔍 Scraping username @fitness_coach_pro...',
  '📧 Email extracted: coach***@gmail.com',
  '🔄 Rotating session — Account 3 active',
  '✅ Profile processed successfully',
  '💾 Database updated — 847 total records',
  '🔍 Scraping username @beauty.secrets...',
  '⚡ Rate limit approaching — throttling...',
  '📧 Email extracted: beauty***@proton.me',
  '✅ Profile processed successfully',
  '💾 Database updated — duplicate skipped',
  '🔍 Scraping username @tech_innovator...',
  '📧 Email extracted: tech***@gmail.com',
  '✅ Profile processed successfully',
];

let logIndex = 0;

function pollLiveLogs() {
  if(view !== 'afnan') return;
  const container = document.getElementById('live-logs-afnan');
  if(!container) return;

  // Add 1-3 random log lines
  const count = Math.floor(Math.random() * 3) + 1;
  for(let i = 0; i < count; i++) {
    const line = document.createElement('div');
    const msg = logMessages[logIndex % logMessages.length];
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let colorClass = 'text-zinc-500';
    if(msg.includes('📧')) colorClass = 'text-emerald-400';
    else if(msg.includes('✅')) colorClass = 'text-green-400';
    else if(msg.includes('💾')) colorClass = 'text-blue-400';
    else if(msg.includes('⚡')) colorClass = 'text-amber-400';
    else if(msg.includes('🔄')) colorClass = 'text-purple-400';
    else if(msg.includes('🔍')) colorClass = 'text-zinc-400';

    line.className = `${colorClass} animate-[fadeIn_0.3s_ease-out]`;
    line.innerHTML = `<span class="text-zinc-600 mr-3">[${ts}]</span>${esc(msg)}`;
    container.appendChild(line);
    logIndex++;
  }

  // Remove old lines to prevent memory buildup
  while(container.children.length > 100) {
    container.removeChild(container.firstChild);
  }

  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════

function platformBadge(platform) {
  if(platform === 'Instagram') {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-400 border border-pink-500/20">📸 IG</span>`;
  }
  if(platform === 'TikTok') {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">🎵 TK</span>`;
  }
  return `<span class="text-xs text-zinc-500">${esc(platform)}</span>`;
}

function usernameLink(username, platform) {
  if(!username) return '-';
  let url = '#';
  const clean = username.replace(/^@/, '');
  if(platform === 'Instagram' || platform === 'ig') {
    url = `https://www.instagram.com/${clean}/`;
  } else if(platform === 'TikTok' || platform === 'tk') {
    url = `https://www.tiktok.com/@${clean}`;
  }
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="username-link">@${esc(clean)}</a>`;
}

function renderPag(tot, lim, cur, id, cb) {
  const w = document.getElementById(id);
  if(!w) return;
  w.innerHTML='';
  const pages = Math.ceil(tot/lim); 
  if(pages<=1) return;
  
  const createBtn = (text, targetPage, disabled = false) => {
    const b = document.createElement('button');
    b.className = 'px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 cursor-pointer border ' + 
      (disabled ? 'bg-white/5 text-zinc-600 border-transparent cursor-not-allowed opacity-50' : 
                  (targetPage === cur ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 
                                        'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'));
    b.innerText = text;
    if(!disabled) b.onclick = () => cb(targetPage);
    w.appendChild(b);
  };

  createBtn('«', 1, cur === 1);
  createBtn('‹', cur - 1, cur === 1);

  for(let i=Math.max(1,cur-2); i<=Math.min(pages,cur+2); i++) {
    createBtn(i, i);
  }

  createBtn('›', cur + 1, cur === pages);
  createBtn('»', pages, cur === pages);
}

window.logout = async function() {
  try {
    await fetch('/api/logout', {method:'POST'}); window.location.href='/';
  } catch(e) {
    console.error('logout error:', e);
  }
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function fmtNum(n) {
  const num = parseInt(n);
  if (!num || isNaN(num)) return '<span class="text-zinc-600">—</span>';
  if (num >= 1e6) return `<span class="text-purple-400">${(num/1e6).toFixed(1)}M</span>`;
  if (num >= 1e3) return `<span class="text-sky-400">${(num/1e3).toFixed(1)}K</span>`;
  return num.toLocaleString();
}

// ═══════════════════════════════════════════
// SIGNUP DATA MODAL — KPI card click handlers
// ═══════════════════════════════════════════

let _modalRows = []; // currently displayed rows (used by downloadModalCSV)
let _signupStatsCache = null; // cache fetched stats per reload

/** Fetch (or return cached) influencer stats from the server */
async function fetchInfluencerStats() {
  try {
    console.log('[modal] Fetching /api/influencer-stats...');
    const r = await fetch('/api/influencer-stats');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    console.log('[modal] Got stats:', { total: data.total, with_socials: data.with_socials, email_only: data.email_only, non_converted: data.non_converted_records?.length });
    _signupStatsCache = data;
    return data;
  } catch(e) {
    console.error('[modal] fetchInfluencerStats error:', e);
    return null;
  }
}

/**
 * Open the data modal for the given type:
 *   'total'         → all signed-up users
 *   'social'        → users with social accounts linked
 *   'email'         → email-only sign-ups
 *   'trk_social'    → users from our emails who linked socials
 *   'trk_email'     → users from our emails who signed up email-only
 *   'non_converted' → people we emailed who never signed up
 */
window.openDataModal = async function(type) {
  // Show modal immediately in loading state
  const modal = document.getElementById('data-modal');
  const tbody = document.getElementById('data-modal-tbody');
  const titleEl = document.getElementById('data-modal-title');
  const subtitleEl = document.getElementById('data-modal-subtitle');

  if (!modal) { console.error('[modal] #data-modal not found'); return; }
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (tbody) tbody.innerHTML = '<tr><td colspan="2" class="text-center text-zinc-500 py-10"><span class="inline-block animate-pulse">⏳ Loading...</span></td></tr>';

  // Map type → title/subtitle
  const META = {
    total:         { title: '📝 Total Sign-ups',       subtitle: 'All users who created a V1RA account' },
    social:        { title: '🌐 Social Sign-ups',      subtitle: 'Users who linked at least one social account' },
    email:         { title: '✉️ Email-Only Sign-ups',  subtitle: 'Users who signed up with email only (no socials)' },
    trk_social:    { title: '🌐 Social — From My Emails', subtitle: 'Users we emailed who signed up & linked socials' },
    trk_email:     { title: '✉️ Email-Only — From My Emails', subtitle: 'Users we emailed who signed up via email only' },
    non_converted: { title: '🚫 Non-Converted Emails', subtitle: 'People we emailed who have NOT signed up yet' },
  };
  const meta = META[type] || { title: 'Details', subtitle: '' };
  if (titleEl)    titleEl.textContent    = meta.title;
  if (subtitleEl) subtitleEl.textContent = meta.subtitle;

  try {
    const data = await fetchInfluencerStats();
    if (!data) throw new Error('Failed to fetch stats');

    let rows = [];
    switch (type) {
      case 'total':
        rows = (data.all_records || []);
        break;
      case 'social':
        rows = (data.all_records || []).filter(r => r.has_socials);
        break;
      case 'email':
        rows = (data.all_records || []).filter(r => !r.has_socials);
        break;
      case 'trk_social':
        rows = (data.records_from_our_emails || []).filter(r => r.has_socials);
        break;
      case 'trk_email':
        rows = (data.records_from_our_emails || []).filter(r => !r.has_socials);
        break;
      case 'non_converted':
        rows = (data.non_converted_records || []);
        break;
      default:
        rows = [];
    }

    console.log(`[modal] type=${type} rows=${rows.length}`);
    _modalRows = rows; // save for CSV export

    if (!tbody) return;

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-center text-zinc-500 py-10">No records found for this filter</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(r =>
      `<tr>
        <td class="font-semibold text-white">${esc(r.name || '—')}</td>
        <td class="font-mono text-xs text-zinc-300">${esc(r.email || '—')}</td>
      </tr>`
    ).join('');

    // Update subtitle with count
    if (subtitleEl) subtitleEl.textContent = `${meta.subtitle} · ${rows.length.toLocaleString()} records`;

  } catch(e) {
    console.error('[modal] openDataModal error:', e);
    if (tbody) tbody.innerHTML = `<tr><td colspan="2" class="text-center text-red-400 py-10">❌ Error: ${esc(e.message)}</td></tr>`;
  }
};

window.closeDataModal = function() {
  const modal = document.getElementById('data-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
};

/** Download current modal rows as a CSV file */
window.downloadModalCSV = function() {
  if (!_modalRows || _modalRows.length === 0) {
    alert('No data to export');
    return;
  }
  const lines = ['Name,Email'];
  _modalRows.forEach(r => {
    const name  = (r.name  || '').replace(/,/g, ' ');
    const email = (r.email || '').replace(/,/g, ' ');
    lines.push(`"${name}","${email}"`);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `signups_export_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('[modal] CSV exported:', _modalRows.length, 'rows');
};

// ═══════════════════════════════════════════
// TRACKING CARD — populate KPI numbers
// ═══════════════════════════════════════════

/**
 * Called after creator outreach chart loads.
 * Fetches /api/influencer-stats and populates the Tracking Card KPIs:
 *   trk-sent       → total sent from Google Sheet (already set by loadCreatorOutreachChart)
 *   trk-social     → from_our_emails who linked socials
 *   trk-email      → from_our_emails who are email-only
 *   trk-nonconverted → did not sign up at all
 */
window.loadTrackingCard = async function() {
  try {
    console.log('[tracking] Loading tracking card data...');

    // trk-sent is already populated by loadCreatorOutreachChart via animateVal
    // We only need to populate trk-social, trk-email, trk-nonconverted from live stats
    const data = _signupStatsCache || await fetchInfluencerStats();
    if (!data) {
      console.warn('[tracking] No stats data available');
      return;
    }

    const trkSocial       = (data.records_from_our_emails || []).filter(r => r.has_socials).length;
    const trkEmail        = (data.records_from_our_emails || []).filter(r => !r.has_socials).length;
    const trkNonConverted = (data.non_converted_records || []).length;
    const trkSent         = (data.records_from_our_emails?.length || 0) + trkNonConverted; // total we emailed

    console.log('[tracking] trk-social:', trkSocial, 'trk-email:', trkEmail, 'trk-nonconverted:', trkNonConverted);

    // Populate sent (total emails we sent that are in our outreach log)
    const sentEl = document.getElementById('trk-sent');
    if (sentEl) {
      // Use the Google Sheet total sent if available (already animated), but also fallback
      // Only set if it still shows the dash placeholder
      if (sentEl.textContent === '—' || sentEl.textContent === '') {
        animateVal('trk-sent', trkSent);
      }
    }

    animateVal('trk-social',        trkSocial);
    animateVal('trk-email',         trkEmail);
    animateVal('trk-nonconverted',  trkNonConverted);

    // Also update the main KPI signup cards (in case fetchSignups hasn't run yet)
    const totalSignups = data.total || 0;
    const withSocials  = data.with_socials || 0;
    const emailOnly    = data.email_only || 0;

    const totalEl  = document.getElementById('c-signup-total');
    const socialEl = document.getElementById('c-signup-social');
    const emailEl  = document.getElementById('c-signup-email');
    if (totalEl  && (totalEl.textContent  === '0' || totalEl.textContent  === '')) animateVal('c-signup-total',  totalSignups);
    if (socialEl && (socialEl.textContent === '0' || socialEl.textContent === '')) animateVal('c-signup-social', withSocials);
    if (emailEl  && (emailEl.textContent  === '0' || emailEl.textContent  === '')) animateVal('c-signup-email',  emailOnly);

    console.log('[tracking] Tracking card populated successfully');
  } catch(e) {
    console.error('[tracking] loadTrackingCard error:', e);
  }
};
