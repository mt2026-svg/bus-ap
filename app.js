const API_KEY = localStorage.getItem('TOEI_API_TOKEN');
const BUS_STOP_ID = 'odpt.Busstop:Toei.Yamabukicho';

let currentDirection = 'shinjuku';
let upcomingBuses = [];

async function fetchBusData() {
    if (!API_KEY) return;
    const url = `https://api.odpt.org/api/v4/odpt:Bus?odpt:operator=odpt.Operator:Toei&odpt:busstop=${BUS_STOP_ID}&acl:consumerKey=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        upcomingBuses = data
            .filter(bus => {
                const dest = bus['odpt:destinationSign'];
                return (currentDirection === 'shinjuku' && dest.includes('新宿')) ||
                       (currentDirection === 'ueno' && (dest.includes('上野') || dest.includes('早稲田')));
            })
            .map(bus => ({
                h: new Date(bus['odpt:expectedArrivalTime']).getHours(),
                m: new Date(bus['odpt:expectedArrivalTime']).getMinutes(),
                route: bus['odpt:busRoutePattern'].split(':').pop().split('.')[0],
                dest: bus['odpt:destinationSign'],
                color: currentDirection === 'shinjuku' ? "#008542" : "#ff8c00",
                timeStr: bus['odpt:expectedArrivalTime']
            }))
            .sort((a, b) => new Date(a.timeStr) - new Date(b.timeStr));

        renderBusList();
    } catch (e) { console.error(e); }
}

function switchDirection(dir) {
    currentDirection = dir;
    document.getElementById('tab-shinjuku').classList.toggle('active-tab', dir === 'shinjuku');
    document.getElementById('tab-ueno').classList.toggle('active-tab', dir === 'ueno');
    fetchBusData();
}

function renderBusList() {
    const list = document.getElementById('bus-list');
    list.innerHTML = upcomingBuses.slice(1, 4).map(t => `
        <div class="flex justify-between items-center px-4 py-3 rounded-xl border-l-4 bg-white opacity-60" style="border-left-color: ${t.color}">
            <span class="text-sm font-bold text-gray-700">${t.dest}</span>
            <span class="font-black text-lg text-gray-600">${String(t.h).padStart(2,'0')}:${String(t.m).padStart(2,'0')}</span>
        </div>
    `).join('');
}

function updateDisplay() {
    const now = new Date();
    const clock = document.getElementById('current-clock');
    if (clock) clock.innerText = now.toLocaleTimeString();

    if (upcomingBuses.length === 0) return;
    
    const diff = new Date(upcomingBuses[0].timeStr) - now;
    const m = Math.max(0, Math.floor(diff / 60000));
    const s = Math.max(0, Math.floor((diff % 60000) / 1000));

    document.getElementById('min').innerText = String(m).padStart(2, '0');
    document.getElementById('sec').innerText = String(s).padStart(2, '0');
    document.getElementById('bus-route-label').innerText = upcomingBuses[0].route;
    document.getElementById('bus-dest-label').innerText = upcomingBuses[0].dest + " 行き";

    if (diff <= 0) fetchBusData();
}

fetchBusData();
setInterval(fetchBusData, 30000);
setInterval(updateDisplay, 1000);
lucide.createIcons();
