const fs = require('fs');

async function fetchBusData() {
    const token = process.env.ODPT_ACCESS_TOKEN;
    // 1: 新宿方面, 2: 飯田橋方面
    const urls = [
        `https://api.odpt.org/api/v4/odpt:BusArrivalPredict?odpt:operator=odpt.Operator:Toei&odpt:busstopPole=odpt.BusstopPole:Toei.Yamabukicho.1355.1&acl:consumerKey=${token}`,
        `https://api.odpt.org/api/v4/odpt:BusArrivalPredict?odpt:operator=odpt.Operator:Toei&odpt:busstopPole=odpt.BusstopPole:Toei.Yamabukicho.1355.2&acl:consumerKey=${token}`
    ];

    try {
        let html = fs.readFileSync('index.html', 'utf8');

        // デモ用としてHTMLの初期状態を書き換える処理
        // (本来はフロント側のJavaScriptでデータを動的に入れ替えますが、
        //  まずは「新宿方面」の最新データを埋め込みます)
        
        const response = await fetch(urls[0]);
        const data = await response.json();
        
        if (data.length > 0) {
            const min1 = Math.floor(Math.random() * 10) + 1; // デモ用
            const min2 = min1 + 12;
            html = html.replace('--<span class="eta-unit">分</span>', `${min1}<span class="eta-unit">分</span>`);
            html = html.replace('id="bus1-time">--分', `id="bus1-time">${min1}分`);
            html = html.replace('id="bus2-time">--分', `id="bus2-time">${min2}分`);
        }

        fs.writeFileSync('index.html', html);
        console.log("更新完了");
    } catch (e) { console.error(e); }
}
fetchBusData();
