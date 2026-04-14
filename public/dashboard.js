// dashboard.js — V1RA Dashboard v3 (Redesigned)

let view = 'global';
let afIgState = { p:1, q:'' }, afTkState = { p:1, q:'' }, sjState = { p:1, q:'' };
let ashTkState = { p:1, q:'' };
let creatorState = { p:1 }, brandState = { p:1 };
let afnanChart = null, localChart = null, nicheChart = null, countryChart = null;
let ashTkChart = null;

let currentRange = { start: null, end: null, type: 'all', label: 'All Time' };

// unified caching
const _apiCache = new Map();
async function fetchWithCache(url, ttlMs = 60000) {
  const now = Date.now();
  if (_apiCache.has(url)) {
    const { data, ts } = _apiCache.get(url);
    if (now - ts < ttlMs) return data;
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const data = await r.json();
  _apiCache.set(url, { data, ts: now });
  return data;
}
// ─── ISO 3166-1 alpha-2 country code → full name map ───
const ISO_COUNTRIES = {
  AF:'Afghanistan',AX:'Åland Islands',AL:'Albania',DZ:'Algeria',AS:'American Samoa',
  AD:'Andorra',AO:'Angola',AI:'Anguilla',AQ:'Antarctica',AG:'Antigua & Barbuda',
  AR:'Argentina',AM:'Armenia',AW:'Aruba',AU:'Australia',AT:'Austria',AZ:'Azerbaijan',
  BS:'Bahamas',BH:'Bahrain',BD:'Bangladesh',BB:'Barbados',BY:'Belarus',BE:'Belgium',
  BZ:'Belize',BJ:'Benin',BM:'Bermuda',BT:'Bhutan',BO:'Bolivia',BQ:'Caribbean Netherlands',
  BA:'Bosnia & Herzegovina',BW:'Botswana',BV:'Bouvet Island',BR:'Brazil',
  IO:'British Indian Ocean Territory',BN:'Brunei',BG:'Bulgaria',BF:'Burkina Faso',
  BI:'Burundi',CV:'Cape Verde',KH:'Cambodia',CM:'Cameroon',CA:'Canada',
  KY:'Cayman Islands',CF:'Central African Republic',TD:'Chad',CL:'Chile',
  CN:'China',CX:'Christmas Island',CC:'Cocos Islands',CO:'Colombia',KM:'Comoros',
  CG:'Congo - Brazzaville',CD:'Congo - Kinshasa',CK:'Cook Islands',CR:'Costa Rica',
  CI:'Côte d’Ivoire',HR:'Croatia',CU:'Cuba',CW:'Curaçao',CY:'Cyprus',CZ:'Czechia',
  DK:'Denmark',DJ:'Djibouti',DM:'Dominica',DO:'Dominican Republic',EC:'Ecuador',
  EG:'Egypt',SV:'El Salvador',GQ:'Equatorial Guinea',ER:'Eritrea',EE:'Estonia',
  SZ:'Eswatini',ET:'Ethiopia',FK:'Falkland Islands',FO:'Faroe Islands',FJ:'Fiji',
  FI:'Finland',FR:'France',GF:'French Guiana',PF:'French Polynesia',
  TF:'French Southern Territories',GA:'Gabon',GM:'Gambia',GE:'Georgia',DE:'Germany',
  GH:'Ghana',GI:'Gibraltar',GR:'Greece',GL:'Greenland',GD:'Grenada',GP:'Guadeloupe',
  GU:'Guam',GT:'Guatemala',GG:'Guernsey',GN:'Guinea',GW:'Guinea-Bissau',GY:'Guyana',
  HT:'Haiti',HM:'Heard & McDonald Islands',VA:'Vatican City',HN:'Honduras',
  HK:'Hong Kong',HU:'Hungary',IS:'Iceland',IN:'India',ID:'Indonesia',IR:'Iran',
  IQ:'Iraq',IE:'Ireland',IM:'Isle of Man',IL:'Israel',IT:'Italy',JM:'Jamaica',
  JP:'Japan',JE:'Jersey',JO:'Jordan',KZ:'Kazakhstan',KE:'Kenya',KI:'Kiribati',
  KP:'North Korea',KR:'South Korea',KW:'Kuwait',KG:'Kyrgyzstan',LA:'Laos',
  LV:'Latvia',LB:'Lebanon',LS:'Lesotho',LR:'Liberia',LY:'Libya',LI:'Liechtenstein',
  LT:'Lithuania',LU:'Luxembourg',MO:'Macao',MG:'Madagascar',MW:'Malawi',MY:'Malaysia',
  MV:'Maldives',ML:'Mali',MT:'Malta',MH:'Marshall Islands',MQ:'Martinique',
  MR:'Mauritania',MU:'Mauritius',YT:'Mayotte',MX:'Mexico',FM:'Micronesia',
  MD:'Moldova',MC:'Monaco',MN:'Mongolia',ME:'Montenegro',MS:'Montserrat',MA:'Morocco',
  MZ:'Mozambique',MM:'Myanmar',NA:'Namibia',NR:'Nauru',NP:'Nepal',NL:'Netherlands',
  NC:'New Caledonia',NZ:'New Zealand',NI:'Nicaragua',NE:'Niger',NG:'Nigeria',
  NU:'Niue',NF:'Norfolk Island',MK:'North Macedonia',MP:'Northern Mariana Islands',
  NO:'Norway',OM:'Oman',PK:'Pakistan',PW:'Palau',PS:'Palestine',PA:'Panama',
  PG:'Papua New Guinea',PY:'Paraguay',PE:'Peru',PH:'Philippines',PN:'Pitcairn Islands',
  PL:'Poland',PT:'Portugal',PR:'Puerto Rico',QA:'Qatar',RE:'Réunion',RO:'Romania',
  RU:'Russia',RW:'Rwanda',BL:'Saint Barthélemy',SH:'Saint Helena',KN:'Saint Kitts & Nevis',
  LC:'Saint Lucia',MF:'Saint Martin',PM:'Saint Pierre & Miquelon',
  VC:'Saint Vincent & Grenadines',WS:'Samoa',SM:'San Marino',ST:'São Tomé & Príncipe',
  SA:'Saudi Arabia',SN:'Senegal',RS:'Serbia',SC:'Seychelles',SL:'Sierra Leone',
  SG:'Singapore',SX:'Sint Maarten',SK:'Slovakia',SI:'Slovenia',SB:'Solomon Islands',
  SO:'Somalia',ZA:'South Africa',GS:'South Georgia',SS:'South Sudan',ES:'Spain',
  LK:'Sri Lanka',SD:'Sudan',SR:'Suriname',SJ:'Svalbard & Jan Mayen',SE:'Sweden',
  CH:'Switzerland',SY:'Syria',TW:'Taiwan',TJ:'Tajikistan',TZ:'Tanzania',TH:'Thailand',
  TL:'Timor-Leste',TG:'Togo',TK:'Tokelau',TO:'Tonga',TT:'Trinidad & Tobago',
  TN:'Tunisia',TR:'Turkey',TM:'Turkmenistan',TC:'Turks & Caicos Islands',TV:'Tuvalu',
  UG:'Uganda',UA:'Ukraine',AE:'United Arab Emirates',GB:'United Kingdom',
  US:'United States',UM:'U.S. Outlying Islands',UY:'Uruguay',UZ:'Uzbekistan',
  VU:'Vanuatu',VE:'Venezuela',VN:'Vietnam',VG:'British Virgin Islands',
  VI:'U.S. Virgin Islands',WF:'Wallis & Futuna',EH:'Western Sahara',YE:'Yemen',
  ZM:'Zambia',ZW:'Zimbabwe'
};

/** Convert ISO code or raw value to a display name */
function countryDisplayName(code) {
  if (!code) return '';
  const upper = code.trim().toUpperCase();
  return ISO_COUNTRIES[upper] || code; // fall back to raw value if not a code
}

/** Get flag emoji for an ISO 2-letter code */
function countryFlag(code) {
  if (!code || code.trim().length !== 2) return '🏳️';
  const base = 0x1F1E6;
  const c = code.toUpperCase();
  return String.fromCodePoint(base + c.charCodeAt(0) - 65) +
         String.fromCodePoint(base + c.charCodeAt(1) - 65);
}

// ─── Custom Country Dropdown Logic ───

let _activeCountryCode = ''; // currently selected country filter
let _activePlatform = '';    // currently selected platform filter

window.toggleCountryDropdown = function() {
  const panel = document.getElementById('country-dropdown-panel');
  const arrow = document.getElementById('country-dropdown-arrow');
  if (!panel) return;
  const isHidden = panel.classList.toggle('hidden');
  if (arrow) arrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
  if (!isHidden) {
    // Focus search on open
    const input = document.getElementById('country-search-input');
    if (input) { input.value = ''; filterCountryOptions(''); setTimeout(() => input.focus(), 50); }
  }
};

window.filterCountryOptions = function(query) {
  const list = document.getElementById('country-options-list');
  if (!list) return;
  const q = query.toLowerCase();
  list.querySelectorAll('button.country-option[data-code]').forEach(btn => {
    if (btn.dataset.code === '') return; // always show 'All'
    const name = (btn.textContent || '').toLowerCase();
    btn.style.display = (!q || name.includes(q)) ? '' : 'none';
  });
};

window.selectCountry = function(code, btn) {
  _activeCountryCode = code;
  const label = document.getElementById('country-dropdown-label');
  if (label) {
    if (!code) {
      label.textContent = '🌍 All Countries';
    } else {
      const flag = countryFlag(code);
      const name = countryDisplayName(code);
      label.textContent = `${flag}\u00a0${name}`;
    }
  }
  // Highlight selected
  const list = document.getElementById('country-options-list');
  if (list) {
    list.querySelectorAll('button.country-option').forEach(b => {
      const isSel = b.dataset.code === code;
      b.style.background = isSel ? 'rgba(45,212,191,0.12)' : '';
      b.style.color = isSel ? '#5eead4' : '';
    });
  }
  // Close panel
  const panel = document.getElementById('country-dropdown-panel');
  const arrow = document.getElementById('country-dropdown-arrow');
  if (panel) panel.classList.add('hidden');
  if (arrow) arrow.style.transform = 'rotate(0deg)';
  // Filter rows
  applyModalFilters();
};

/** Populate the custom country dropdown with a list of {code, name} entries */
function populateCountryDropdown(rawValues) {
  const list = document.getElementById('country-options-list');
  if (!list) return;
  // Keep the 'All Countries' btn, remove old dynamic ones
  const allBtn = list.querySelector('button[data-code=""]');
  list.innerHTML = '';
  if (allBtn) list.appendChild(allBtn);
  else {
    const a = document.createElement('button');
    a.type = 'button'; a.dataset.code = '';
    a.className = 'country-option w-full text-left px-3 py-2 text-xs font-semibold text-teal-400 hover:bg-teal-500/10 transition-colors flex items-center gap-2';
    a.textContent = '🌍 All Countries';
    a.onclick = () => selectCountry('', a);
    list.appendChild(a);
  }
  rawValues.forEach(raw => {
    const code = raw.trim();
    if (!code) return;
    const flag = countryFlag(code);
    const name = countryDisplayName(code);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.code = code;
    btn.className = 'country-option w-full text-left px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2';
    btn.innerHTML = `<span class="text-base leading-none">${flag}</span><span>${esc(name)}</span>`;
    btn.onclick = () => selectCountry(code, btn);
    list.appendChild(btn);
  });
}

// ─── Platform Dropdown Logic ───

window.togglePlatformDropdown = function() {
  const panel = document.getElementById('platform-dropdown-panel');
  const arrow = document.getElementById('platform-dropdown-arrow');
  if (!panel) return;
  const isHidden = panel.classList.toggle('hidden');
  if (arrow) arrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
};

window.selectPlatform = function(plat) {
  _activePlatform = plat;
  const label = document.getElementById('platform-dropdown-label');
  const ICONS = { '': '📱 All Platforms', 'Instagram': '📸 Instagram', 'TikTok': '🎵 TikTok', 'LinkedIn': '💼 LinkedIn' };
  if (label) label.textContent = ICONS[plat] || plat;
  // Highlight selected
  const list = document.getElementById('platform-options-list');
  if (list) {
    list.querySelectorAll('button.platform-option').forEach(b => {
      const isSel = b.dataset.plat === plat;
      b.style.background = isSel ? 'rgba(99,102,241,0.12)' : '';
      b.style.color = isSel ? '#a5b4fc' : '';
    });
  }
  // Close panel
  const panel = document.getElementById('platform-dropdown-panel');
  const arrow = document.getElementById('platform-dropdown-arrow');
  if (panel) panel.classList.add('hidden');
  if (arrow) arrow.style.transform = 'rotate(0deg)';
  // Re-filter
  applyModalFilters();
};

/** Get today's date string in local timezone as YYYY-MM-DD */
function localDateStr(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Unified filter: applies both country and platform to _modalRows */
function applyModalFilters() {
  const tbody = document.getElementById('data-modal-tbody');
  const subtitleEl = document.getElementById('data-modal-subtitle');
  const meta = { subtitle: (subtitleEl?.textContent || '').split(' \u00b7 ')[0] };
  if (!tbody) return;
  let filtered = _modalRows;
  if (_activeCountryCode) filtered = filtered.filter(r => (r.country || '') === _activeCountryCode);
  if (_activePlatform) {
    const platLower = _activePlatform.toLowerCase();
    // platform_list is an array of lowercase platform names e.g. ['instagram', 'tiktok']
    filtered = filtered.filter(r => {
      const list = r.platform_list;
      if (Array.isArray(list) && list.length > 0) return list.includes(platLower);
      // Fallback: check legacy socials string (e.g. 'instagram:@user,tiktok:@user2')
      const s = (r.socials || '').toLowerCase();
      return s.includes(platLower);
    });
  }
  renderModalRows(filtered, tbody, meta, subtitleEl);
}

window.addEventListener('DOMContentLoaded', () => {
  currentRange.start = null;
  currentRange.end = null;
  
  updateDateField();
  switchView('global');
  setInterval(poll, 60000);
  setInterval(pollLiveLogs, 3000);

  // Close date dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('date-filter-dropdown');
    const menu = document.getElementById('date-menu');
    if (dropdown && !dropdown.contains(e.target)) {
        menu.classList.add('hidden');
        document.getElementById('date-arrow').style.transform = 'rotate(0deg)';
    }
    // Close country dropdown when clicking outside
    const cWrap = document.getElementById('country-dropdown-wrap');
    const cPanel = document.getElementById('country-dropdown-panel');
    const cArrow = document.getElementById('country-dropdown-arrow');
    if (cWrap && cPanel && !cWrap.contains(e.target)) {
      cPanel.classList.add('hidden');
      if (cArrow) cArrow.style.transform = 'rotate(0deg)';
    }
    // Close platform dropdown when clicking outside
    const pWrap = document.getElementById('platform-dropdown-wrap');
    const pPanel = document.getElementById('platform-dropdown-panel');
    const pArrow = document.getElementById('platform-dropdown-arrow');
    if (pWrap && pPanel && !pWrap.contains(e.target)) {
      pPanel.classList.add('hidden');
      if (pArrow) pArrow.style.transform = 'rotate(0deg)';
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
    start = localDateStr(now);
    end = start;
    label = 'Today';
  } else if (type === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    start = localDateStr(yest);
    end = start;
    label = 'Yesterday';
  } else if (type === 'all') {
    start = null; end = null; label = 'All Time';
  }

  currentRange = { start, end, type, label };
  // Bust ALL date-sensitive cached API calls so first click always returns fresh data
  _apiCache.forEach((_, url) => {
    if (url.includes('influencer-stats') || url.includes('creator-outreach') || url.includes('overview')) {
      _apiCache.delete(url);
    }
  });
  updateDateField();
  document.getElementById('date-menu').classList.add('hidden');
  document.getElementById('date-arrow').style.transform = 'rotate(0deg)';
  // Close mobile custom range if open
  const mobBox = document.getElementById('mob-custom-range');
  if (mobBox) mobBox.style.display = 'none';
  // Immediately run fetchSignups so signup KPIs update on first click without waiting for poll
  if (typeof window.fetchSignups === 'function') window.fetchSignups();
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
  _apiCache.forEach((_, url) => {
    if (url.includes('influencer-stats') || url.includes('creator-outreach') || url.includes('overview')) {
      _apiCache.delete(url);
    }
  });
  updateDateField();
  document.getElementById('date-menu').classList.add('hidden');
  document.getElementById('date-arrow').style.transform = 'rotate(0deg)';
  const box = document.getElementById('custom-range-box');
  if (box) box.style.display = 'none';
  if (typeof window.fetchSignups === 'function') window.fetchSignups();
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
  _apiCache.forEach((_, url) => {
    if (url.includes('influencer-stats') || url.includes('creator-outreach') || url.includes('overview')) {
      _apiCache.delete(url);
    }
  });
  const box = document.getElementById('mob-custom-range');
  if (box) box.style.display = 'none';
  updateDateField();
  if (typeof window.fetchSignups === 'function') window.fetchSignups();
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
    const data = await fetchWithCache(url, 60000);
    creatorOutreachData = Array.isArray(data) ? data : [];
  } catch(e) {
    console.error('pollCreatorOutreach error:', e);
    creatorOutreachData = [];
  }
}

function poll() {
  // Parallel fetch: load global and outreach simultaneously
  const pGlobal = loadGlobal();
  const pOutreach = pollCreatorOutreach();

  Promise.all([pGlobal, pOutreach]).then(() => {
    if(view === 'creator') {
      loadCreatorOutreachChart();
      cLoad();
      if (typeof window.fetchSignups === 'function') window.fetchSignups();
    } else {
      if(view === 'brand')  { loadBrandOutreachChart(); bLoad(); }
      if(view === 'afnan')  { loadAfnanChart(); loadAfnanTags(); afLoad('ig'); afLoad('tk'); }
      if(view === 'local')  { loadLocalChart(); loadNicheChart(); loadCountryChart(); sjLoad(); }
      if(view === 'ash-tk') { loadAshTkChart(); loadAshTkData(ashTkState.p); }
    }
  }).catch(e => console.error("Poll Error:", e));
}

// ═══════════════════════════════════════════
// GLOBAL OVERVIEW
// ═══════════════════════════════════════════
async function loadGlobal() {
  try {
    const dp = getDateParams();
    const url = `/api/overview${dp ? '?' + dp.slice(1) : ''}`;
    const d = await fetchWithCache(url, 60000);

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

       // Total Creators: use raw account counts that already respect the date filter
       const totalCreators = (d.cloud?.accounts || 0) + (d.local?.accounts || 0) + (d.ashTk?.accounts || 0);
       const totalScraped = (d.cloud?.emails || 0) + (d.local?.emails || 0) + (d.ashTk?.emails || 0);
       animateVal('c-users', totalCreators);
       animateVal('c-scraped', totalScraped);
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
    const data = await fetchWithCache(url, 60000);
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

/** Fetch (or return cached) influencer stats from the server */
async function fetchInfluencerStats() {
  try {
    const dp = getDateParams();
    console.log('[modal] Fetching /api/influencer-stats...', dp);
    const url = `/api/influencer-stats${dp ? '?' + dp.slice(1) : ''}`;
    const data = await fetchWithCache(url, 60000);
    console.log('[modal] Got stats:', { total: data.total, with_socials: data.with_socials, email_only: data.email_only, non_converted: data.non_converted_records?.length });
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
    total:         { title: '📝 Total Sign-ups',          subtitle: 'All users who created a V1RA account' },
    social:        { title: '🌐 Social Sign-ups',         subtitle: 'Users who linked at least one social account' },
    email:         { title: '✉️ Email-Only Sign-ups',     subtitle: 'Users who signed up with email only (no socials)' },
    trk_total:     { title: '📧 All Sign-ups from Our Emails', subtitle: 'Everyone who signed up after we emailed them' },
    trk_social:    { title: '🌐 Social — From Our Emails',    subtitle: 'Users we emailed who signed up & linked socials' },
    trk_email:     { title: '✉️ Email-Only — From Our Emails', subtitle: 'Users we emailed who signed up via email only' },
    non_converted: { title: '🚫 Non-Converted Emails',   subtitle: 'People we emailed who have NOT signed up yet' },
  };
  const meta = META[type] || { title: 'Details', subtitle: '' };
  if (titleEl)    titleEl.textContent    = meta.title;
  if (subtitleEl) subtitleEl.textContent = meta.subtitle;

  // Reset filters
  _activeCountryCode = '';
  _activePlatform = '';
  const lbl0 = document.getElementById('country-dropdown-label');
  if (lbl0) lbl0.textContent = '\uD83C\uDF0D All Countries';
  const plbl0 = document.getElementById('platform-dropdown-label');
  if (plbl0) plbl0.textContent = '\uD83D\uDCF1 All Platforms';

  // Platform filter is only shown for modal types that have social accounts
  // Never show it for email-only views (no platform data applies)
  const PLATFORM_FILTER_TYPES = ['total', 'social', 'trk_total', 'trk_social'];
  const pWrap = document.getElementById('platform-dropdown-wrap');
  if (pWrap) pWrap.style.display = PLATFORM_FILTER_TYPES.includes(type) ? '' : 'none';

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
      case 'trk_total':
        rows = (data.records_from_our_emails || []);
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
    _modalRows = rows; // full unfiltered set for this type
    _activeCountryCode = '';
    _activePlatform = '';

    // Populate custom country dropdown
    const countryCodes = [...new Set(rows.map(r => r.country || '').filter(Boolean))].sort();
    populateCountryDropdown(countryCodes);
    // Reset country label
    const lbl = document.getElementById('country-dropdown-label');
    if (lbl) lbl.textContent = '\uD83C\uDF0D All Countries';
    // Reset platform dropdown options highlight
    const pList = document.getElementById('platform-options-list');
    if (pList) pList.querySelectorAll('button.platform-option').forEach(b => { b.style.background = ''; b.style.color = ''; });

    if (!tbody) return;
    renderModalRows(rows, tbody, meta, subtitleEl);

  } catch(e) {
    console.error('[modal] openDataModal error:', e);
    if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center text-red-400 py-10">❌ Error: ${esc(e.message)}</td></tr>`;
  }
};

/** Render rows into the modal table (limit to 100 max to avoid DOM freezing) */
function renderModalRows(rows, tbody, meta, subtitleEl) {
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" class="text-center text-zinc-500 py-10">No records found for this filter</td></tr>';
    if (subtitleEl) subtitleEl.textContent = `${meta.subtitle} \u00b7 0 records`;
    return;
  }
  const maxRows = 100;
  const displayRows = rows.slice(0, maxRows);
  tbody.innerHTML = displayRows.map(r =>
    `<tr>
      <td class="font-semibold text-white">${esc(r.name || '\u2014')}</td>
      <td class="font-mono text-xs text-zinc-300">${esc(r.email || '\u2014')}</td>
    </tr>`
  ).join('');
  if (subtitleEl) {
    const limText = rows.length > maxRows ? ` (Showing 1st ${maxRows})` : '';
    subtitleEl.textContent = `${meta.subtitle} \u00b7 ${rows.length.toLocaleString()} records${limText}`;
  }
}

/**
 * Client-side country filter (called by selectCountry).
 * Filters _modalRows by country code and re-renders without any API call.
 */
// filterModalByCountry is kept for backward compat but now delegates to applyModalFilters
window.filterModalByCountry = function(countryCode) {
  _activeCountryCode = countryCode;
  applyModalFilters();
};

window.closeDataModal = function() {
  const modal = document.getElementById('data-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
  // Reset country dropdown
  _activeCountryCode = '';
  const panel = document.getElementById('country-dropdown-panel');
  const arrow = document.getElementById('country-dropdown-arrow');
  const lbl = document.getElementById('country-dropdown-label');
  if (panel) panel.classList.add('hidden');
  if (arrow) arrow.style.transform = 'rotate(0deg)';
  if (lbl) lbl.textContent = '\uD83C\uDF0D All Countries';
  // Reset platform dropdown
  _activePlatform = '';
  const pPanel = document.getElementById('platform-dropdown-panel');
  const pArrow = document.getElementById('platform-dropdown-arrow');
  const pLbl   = document.getElementById('platform-dropdown-label');
  if (pPanel) pPanel.classList.add('hidden');
  if (pArrow) pArrow.style.transform = 'rotate(0deg)';
  if (pLbl)   pLbl.textContent = '\uD83D\uDCF1 All Platforms';
};

/** Download current modal rows as a CSV (exports filtered set if country active, else all) */
window.downloadModalCSV = function() {
  let exportRows = _modalRows;
  if (_activeCountryCode) exportRows = exportRows.filter(r => (r.country || '') === _activeCountryCode);
  if (_activePlatform)    exportRows = exportRows.filter(r => (r.platform || '') === _activePlatform);
  if (!exportRows || exportRows.length === 0) { alert('No data to export'); return; }
  const lines = ['Name,Email'];
  exportRows.forEach(r => {
    const name  = (r.name  || '').replace(/,/g, ' ');
    const email = (r.email || '').replace(/,/g, ' ');
    lines.push(`"${name}","${email}"`);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Count exported rows for the log
  const exportCount = exportRows.length;
  a.download = `signups_export_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('[modal] CSV exported:', exportCount, 'rows');
};

// ═══════════════════════════════════════════
// TRACKING CARD — populate KPI numbers
// ═══════════════════════════════════════════

/**
 * Called after creator outreach chart loads.
 * Fetches /api/influencer-stats and populates the "Sign-ups from Our Emails" Tracking Card KPIs:
 *   trk-sent   → total sign-ups that came from our emails (records_from_our_emails.length)
 *   trk-social → from_our_emails who linked socials
 *   trk-email  → from_our_emails who are email-only
 */
window.loadTrackingCard = async function() {
  try {
    console.log('[tracking] Loading tracking card data...');

    // Always fetch fresh — _signupStatsCache was removed in favour of fetchWithCache
    const data = await fetchInfluencerStats();
    if (!data) {
      console.warn('[tracking] No stats data available');
      return;
    }

    const trkTotal  = (data.records_from_our_emails || []).length;
    const trkSocial = (data.records_from_our_emails || []).filter(r => r.has_socials).length;
    const trkEmail  = (data.records_from_our_emails || []).filter(r => !r.has_socials).length;

    console.log('[tracking] trk-total:', trkTotal, 'trk-social:', trkSocial, 'trk-email:', trkEmail);

    // trk-sent now shows total sign-ups from our emails (clickable → opens trk_total modal)
    animateVal('trk-sent', trkTotal);

    animateVal('trk-social',        trkSocial);
    animateVal('trk-email',         trkEmail);


    // Also update the main KPI signup cards (in case fetchSignups hasn't run yet)
    const totalSignups = data.total || 0;
    const withSocials  = data.with_socials || 0;
    const emailOnly    = data.email_only || 0;

    const totalEl  = document.getElementById('c-signup-total');
    const socialEl = document.getElementById('c-signup-social');
    const emailEl  = document.getElementById('c-signup-email');
    if (totalEl)  animateVal('c-signup-total',  totalSignups);
    if (socialEl) animateVal('c-signup-social', withSocials);
    if (emailEl)  animateVal('c-signup-email',  emailOnly);

    console.log('[tracking] Tracking card populated successfully');
  } catch(e) {
    console.error('[tracking] loadTrackingCard error:', e);
  }
};
