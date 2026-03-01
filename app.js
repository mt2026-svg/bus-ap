/**
 * 都営バス 山吹町 リアルタイム接近情報
 * ODPT API v4
 */

const BUSSTOP_ID  = 'odpt.Busstop:Toei.Yamabukicho';
const ARRIVAL_URL = 'https://api.odpt.org/api/4.0/odpt:BusPassingInformation';

// ── 状態 ──────────────────────────────────────────────
let currentTab    = 'shinjuku';
let allArrivals   = { shinjuku: [], iidabashi: [] };
let demoBaseTime  = null;
let tickTimer     = null;
let fetchTimer    = null;
let isDemo        = false;
let lastFetchAt   = null;
let speedOffset   = 0;

// ── APIキー ───────────────────────────────────────────
function getApiKey() { return localStorage.getItem('TOEI_API_TOKEN') || ''; }

function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) {
    document.getElementById('apiKeyInput').style.borderColor = '#ef4444';
    return;
  }
  localStorage.setItem('TOEI_API_TOKEN', key);
  isDemo = false;
  document.getElementById('demoLabel').style.display = 'none';
  closeModal();
  startApp();
}

function openModal()  { document.getElementById('apiModal').style.display = 'flex'; }
function closeModal() { document.getElementById('apiModal').style.display = 'none'; }

// ── 方面判定 ──────────────────────────────────────────
function classifyDirection(destName) {
  if (!destName) return null;
  if (destName.includes('新宿')) return 'shinjuku';
  if (destName.includes('上野') || destName.includes('早稲田') || destName.includes('九段下')) return 'iidabashi';
  return null;
}

// ── 時刻ユーティリティ ────────────────────────────────
function parseTime(str) {
  // "HH:MM" or "HH:MM:SS" → 今日の Date
  if (!str) return null;
  if (/^\d{2}:\d{2}/.test(str)) {
    const [hh, mm, ss] = str.split(':').map(Number);
    const d = new Date();
    d.setHours(hh, mm, ss || 0, 0);
    if (d < Date.now() - 60000) d.setDate(d.getDate() + 1);
    return d;
  }
  return new Date(str);
}

function formatHHMM(d) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function msUntil(d) {
  return d - Date.now();
}

// ── フェッチ ──────────────────────────────────────────
async function fetchArrivals() {
  const key = getApiKey();
  if (!key) { useDemo(); return; }

  try {
    const url = `${ARRIVAL_URL}?odpt:busstop=${encodeURIComponent(BUSSTOP_ID)}&acl:consumerKey=${encodeURIComponent(key)}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    processData(data);
    lastFetchAt = Date.now();
  } catch (e) {
    console.warn('Fetch failed, using demo:', e.message);
    useDemo();
  }
}

function processData(data) {
  const now = Date.now();
  const result = { shinjuku: [], iidabashi: [] };

  for (const item of data) {
    const destName =
      item['odpt:destinationBusstopTitle']?.ja ||
      item['odpt:toStationTitle']?.ja ||
      item['odpt:destinationBusstop'] || '';

    const dir = classifyDirection(destName);
    if (!dir) continue;

    const etaStr =
      item['odpt:estimatedArrivalTime'] ||
      item['odpt:expectedArrivalTime']  ||
      item['odpt:arrivalTime'];

    const eta = parseTime(etaStr);
    if (!eta) continue;

    const ms = msUntil(eta);
    if (ms < -60000) continue;

    const routeRaw = item['odpt:busroutePattern'] || item['odpt:busRoute'] || '';
    const route = routeRaw.match(/\.([^.]+)$/)?.[1] || routeRaw;

    result[dir].push({ eta, destName, route });
  }

  for (const dir of ['shinjuku', 'iidabashi']) {
    result[dir].sort((a, b) => a.eta - b.eta);
  }

  allArrivals = result;
  isDemo = false;
  document.getElementById('demoLabel').style.display = 'none';
  renderAll();
}

// ── デモデータ ────────────────────────────────────────
function useDemo() {
  isDemo = true;
  document.getElementById('demoLabel').style.display = 'inline';
  demoBaseTime = Date.now();
  resetDemoData();
  renderAll();
}

function resetDemoData() {
  const base = Date.now();
  allArrivals = {
    shinjuku: [
      { eta: new Date(base + 4*60000 + 44000), destName: '新宿駅西口', route: '早77' },
      { eta: new Date(base + 12*60000),         destName: '新宿駅西口', route: '飯62' },
      { eta: new Date(base + 21*60000),         destName: '新宿駅西口', route: '早77' },
    ],
    iidabashi: [
      { eta: new Date(base + 7*60000 + 15000), destName: '九段下',   route: '飯62' },
      { eta: new Date(base + 17*60000),         destName: '上野公園', route: '上58' },
      { eta: new Date(base + 28*60000),         destName: '早稲田',   route: '早77' },
    ]
  };
}

// ── タブ切り替え ──────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-shinjuku').classList.toggle('active', tab === 'shinjuku');
  document.getElementById('tab-iidabashi').classList.toggle('active', tab === 'iidabashi');
  renderAll();
}

// ── 10倍速機能は削除済み ─────────────────────────────
function getEffectiveNow() { return Date.now() + speedOffset; }
function msUntilEffective(d) { return d.getTime() - getEffectiveNow(); }

// ── レンダリング ──────────────────────────────────────
function renderAll() {
  const buses = allArrivals[currentTab];
  if (!buses || buses.length === 0) {
    renderEmpty();
    return;
  }
  renderNextBus(buses[0]);
  renderList(buses.slice(1));
}

function renderNextBus(bus) {
  const ms   = msUntilEffective(bus.eta);
  const secs = ms / 1000;

  // 方面バッジ
  const badge = document.getElementById('directionBadge');
  badge.textContent = bus.destName || '―';

  // 行先・系統
  document.getElementById('destName').textContent  = bus.destName || '―';
  document.getElementById('trainType').textContent = bus.route    || '';

  const cdNormal   = document.getElementById('cdNormal');
  const cdArriving = document.getElementById('cdArriving');
  const cdLabel    = document.getElementById('cdLabel');

  if (secs <= 0) {
    // 到着中
    cdNormal.style.display   = 'none';
    cdArriving.style.display = 'block';
    cdLabel.style.display    = 'none';
    return;
  }

  cdNormal.style.display   = 'flex';
  cdArriving.style.display = 'none';
  cdLabel.style.display    = 'block';

  const totalSecs = Math.floor(secs);
  const mins  = Math.floor(totalSecs / 60);
  const secsR = totalSecs % 60;
  const cents = Math.floor((secs - totalSecs) * 100);

  document.getElementById('cdMin').textContent   = String(mins).padStart(2, '0');
  document.getElementById('cdSec').textContent   = String(secsR).padStart(2, '0');
  document.getElementById('cdCents').textContent = String(cents).padStart(2, '0');
}

function renderList(buses) {
  const el = document.getElementById('listArea');

  if (buses.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:#bbb;padding:20px;font-size:13px;">後続バスなし</div>';
    return;
  }

  const labels = ['次便', '次々便', '次々々便'];
  el.innerHTML = buses.slice(0, 3).map((bus, i) => {
    const ms   = msUntilEffective(bus.eta);
    const secs = Math.max(0, ms / 1000);
    const mins = Math.floor(secs / 60);
    const secsR = Math.floor(secs % 60);
    const timeStr = secs <= 0 ? 'まもなく' : `${formatHHMM(bus.eta)}発`;
    const rowClass = i === 0 ? 'bus-row row-next' : 'bus-row row-later';
    return `
    <div class="${rowClass}">
      <span class="row-label">${labels[i] || ''}</span>
      <span class="row-type">${bus.route || '―'}</span>
      <span class="row-time">${timeStr}</span>
    </div>`;
  }).join('');
}

function renderEmpty() {
  document.getElementById('destName').textContent  = 'データなし';
  document.getElementById('trainType').textContent = '';
  document.getElementById('cdMin').textContent     = '--';
  document.getElementById('cdSec').textContent     = '--';
  document.getElementById('cdCents').textContent   = '--';
  document.getElementById('cdNormal').style.display   = 'flex';
  document.getElementById('cdArriving').style.display = 'none';
  document.getElementById('directionBadge').textContent = '―';
  document.getElementById('listArea').innerHTML =
    '<div style="text-align:center;color:#bbb;padding:24px;font-size:13px;">この方面のバス情報がありません</div>';
}

// ── tick（16ms ≒ 60fps でカウントダウン更新） ──────────
function tick() {
  renderAll();

  if (isDemo) {
    const buses = [...(allArrivals.shinjuku || []), ...(allArrivals.iidabashi || [])];
    const allPast = buses.every(b => msUntilEffective(b.eta) < -5000);
    if (allPast) {
      speedOffset = 0;
      resetDemoData();
    }
  }
}

function startTick() {
  clearInterval(tickTimer);
  tickTimer = setInterval(tick, 50); // ~20fps で十分滑らか
}

// ── 30秒ごと再フェッチ ────────────────────────────────
function scheduleRefetch() {
  clearTimeout(fetchTimer);
  fetchTimer = setTimeout(async () => {
    await fetchArrivals();
    scheduleRefetch();
  }, 30000);
}

// ── 初期化 ────────────────────────────────────────────
function startApp() {
  fetchArrivals().then(scheduleRefetch);
  startTick();
}

window.addEventListener('DOMContentLoaded', () => {

  const key = getApiKey();
  if (!key) {
    useDemo();
    startTick();
    scheduleRefetch();
    if (!sessionStorage.getItem('modalShown')) {
      sessionStorage.setItem('modalShown', '1');
      openModal();
    }
  } else {
    startApp();
  }
});
