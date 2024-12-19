// 目標日時を指定 (例: 2024年12月25日 15:00)  // 月は0から始まるので12月は11
const after = new Date(2024, 11, 24, 0, 0,0)//2024年12月24日 00:00
const befor = new Date(2024, 11, 25, 0, 0, 0);//2024年12月25 00:00
const message = ""

// 現在の日時を取得
const currentDate = new Date();


if (message !== ""){//メッセージが空白のときは実行しない
  if (after < currentDate && currentDate < befor) {// 現在の日付が目標日時より前かどうかを比較
    // 目標日時前ならアラートを表示
    alert(message);
  }
}
