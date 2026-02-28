const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fetch = require('node-fetch');
require('dotenv').config();

const ACCESS_TOKEN = process.env.ODPT_ACCESS_TOKEN;
const API_URL = "https://api.odpt.org/api/v4/gtfs/realtime/toei_bus_rt";
const TARGET_STOP_ID = "odpt.Busstop:Toei.Yamabukicho.656.1";

async function fetchBusData() {
    if (!ACCESS_TOKEN) {
        console.error("エラー: トークンが設定されていません。");
        return;
    }
    
    console.log("最新の運行データを取得中...");
    try {
        const response = await fetch(`${API_URL}?acl:consumerKey=${ACCESS_TOKEN}`);
        if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);

        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

        console.log("\n--- 山吹町 到着予測 ---");
        let found = false;
        feed.entity.forEach(entity => {
            if (entity.tripUpdate && entity.tripUpdate.stopTimeUpdate) {
                entity.tripUpdate.stopTimeUpdate.forEach(update => {
                    if (update.stopId === TARGET_STOP_ID) {
                        found = true;
                        if (update.arrival && update.arrival.time) {
                            const arrivalTime = new Date(update.arrival.time * 1000);
                            const now = new Date();
                            const diffMins = Math.floor((arrivalTime - now) / 1000 / 60);
                            if (diffMins >= -1) {
                                console.log(`[到着予定] ${arrivalTime.toLocaleTimeString('ja-JP')} (${diffMins <= 0 ? "まもなく到着" : "あと約 " + diffMins + " 分"})`);
                            }
                        }
                    }
                });
            }
        });
        if (!found) console.log("現在、予測データはありません。");
    } catch (e) {
        console.error("\nエラー:", e.message);
    }
}

fetchBusData();
