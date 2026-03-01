// 東京都交通局 API連携用設定
const API_KEY = 'YOUR_ACCESS_TOKEN'; // ←ここに昨日のトークンを入力
const BUS_STOP_ID = 'odpt.Busstop:Toei.Yamabukicho'; // 山吹町バス停ID

async function fetchRealtimeData() {
    const url = `https://api.odpt.org/api/v4/odpt:Bus?odpt:operator=odpt.Operator:Toei&odpt:busstop=${BUS_STOP_ID}&acl:consumerKey=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // 取得したデータから「新宿駅西口行」などを抽出
        const filteredBuses = data.filter(bus => {
            // 現在の方面（shinjuku / ueno）に合わせてフィルタリング
            const targetDest = currentDirection === 'shinjuku' ? '新宿駅西口' : '上野松坂屋';
            return bus['odpt:destinationSign'] === targetDest;
        });

        // リアルタイム情報を upcomingBuses 配列に反映
        upcomingBuses = filteredBuses.map(bus => {
            const date = new Date(bus['odpt:expectedArrivalTime']);
            return {
                h: date.getHours(),
                m: date.getMinutes(),
                route: bus['odpt:busRoutePattern'].split(':').pop().split('.')[0], // 系統名抽出
                dest: bus['odpt:destinationSign'],
                color: currentDirection === 'shinjuku' ? "#008542" : "#ff8c00",
                isRealtime: true
            };
        });

        updateTimetable(); // 表示を更新
    } catch (error) {
        console.error("API取得エラー:", error);
    }
}

// 5分ごとにリアルタイムデータを更新
setInterval(fetchRealtimeData, 300000);
