// 目標日時を指定 (例: 2024年12月25日 15:00)
const targetDate = new Date(2024, 11, 25, 15, 0, 0); // 月は0から始まるので12月は11
const message = ""

// 現在の日時を取得
const currentDate = new Date();

// 現在の日付が目標日時より前かどうかを比較
if (message !== ""){
  if (currentDate < targetDate) {
    // 目標日時前ならアラートを表示
    alert(message);
  }
}