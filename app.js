const fs = require('fs');

async function fetchBusData() {
    const token = process.env.ODPT_ACCESS_TOKEN;
    const url = `https://api.odpt.org/api/v4/odpt:BusArrivalPredict?odpt:operator=odpt.Operator:Toei&odpt:busstopPole=odpt.BusstopPole:Toei.Yamabukicho.1355.1&acl:consumerKey=${token}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        let html = fs.readFileSync('index.html', 'utf8');

        if (data && data.length > 0) {
            // 次便のデータ処理
            const bus1 = data[0];
            const totalSec1 = bus1['odpt:delay'] || 0; 
            const min1 = Math.floor(totalSec1 / 60);
            const sec1 = totalSec1 % 60;

            // HTML内のデモ数字を本物のデータに置換
            // ※04分44秒の部分を、取得したmin1, sec1で書き換えます
            html = html.replace('id="min">04', `id="min">${String(min1).padStart(2, '0')}`);
            html = html.replace('id="sec">44', `id="sec">${String(sec1).padStart(2, '0')}`);
            
            // リスト部分の時刻表記も更新
            html = html.replace('id="next1-time">12:45発', `id="next1-time">${min1}分${sec1}秒`);

            // 次々便がある場合
            if (data[1]) {
                const totalSec2 = data[1]['odpt:delay'] || 0;
                const min2 = Math.floor(totalSec2 / 60);
                const sec2 = totalSec2 % 60;
                html = html.replace('id="next2-time">13:00発', `id="next2-time">${min2}分${sec2}秒`);
            }
        }

        fs.writeFileSync('index.html', html);
        console.log("Real-time data updated.");
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}
fetchBusData();
