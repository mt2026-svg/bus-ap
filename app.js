function updateTimetable() {
    // ...既存のコード...
    upcomingBuses = schedule.filter(t => (t.h * 3600 + t.m * 60) > currentSec).slice(0, 3);
    
    // 【追加】もし次便がなかったら、強制的に10分後のダミーを作る
    if (upcomingBuses.length === 0) {
        const now = new Date();
        upcomingBuses = [{
            h: now.getHours(), 
            m: now.getMinutes() + 10, 
            route: "TEST", 
            dest: "デバッグ表示中", 
            color: "#666"
        }];
    }
    // ...以降の表示処理...
}
