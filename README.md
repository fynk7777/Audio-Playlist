# Audio-Player

@fynk7777 for use [chatGPT](https://chatGPT.com)

これは、自分がゲームをするときに裏で音楽を流したいなと思って作ったものです。  
**自分用に作っているため、バグが起きることもありますがご了承ください。**

[>>リンクはこちら<<](https://fynk7777.github.io/Audio-Playlist)

---

## 使い方

### 準備

#### 全体の画面
以下は全体の画面の画像です。  
![全体](images/explanation.png)

#### 音声ファイルのアップロード
左上の「Upload Audio Files」から音声ファイルをアップロードすると、「Available Songs」に曲が追加されます。  
![Upload Audio Files](images/Upload.png)

#### IndexedDBの容量確認
「IndexedDBの容量の確認」ボタンを押すと、ブラウザのIndexedDBの容量を確認できます。  
![indexedDB](images/indexedDB.png)

#### 使い方の確認
「使い方を見る」を押すと使い方のページが表示されます。
![using](images/useing.png)

#### グローバル音量の設定
「Global Volume」で全体の音量を調整可能です。（初期設定: 10）  
![Global Volume](images/Gloval%20Volume.png)

#### プレイリストへの曲追加
「Available Songs」から曲をドラッグ＆ドロップ、またはダブルクリックで「Playlist」に曲を追加できます。  
![Available,playlist](images/Available,Playlist.png)

#### 曲ごとの音量設定
曲ごとのスライダーで音量を個別に設定できます。（初期設定: 5）  
![songvolume](images/Song%20Volume.png)

---

### 曲再生

#### 再生ボタンの説明
以下が各ボタンの説明です。  
![buttons](images/Buttons.png)

- **Previous**: 前の曲  
- **Play/Pause**: 再生/一時停止  
- **Next**: 次の曲  
- **Play All**: プレイリスト内の曲を再生  
- **Loop Playlist**: プレイリストのループ切り替え（初期設定: ON）

#### 再生中の曲
再生中の曲はプレイリスト内で強調表示されます。  
![playing song](images/Playing%20Song.png)

また、再生中の曲の音量や再生位置をスライダーで調整できます。  
![Playing](images/Playing.png)

---

### ショートカット

#### グローバル音量
- 音量を1増やす: `ArrowUp`  
- 音量を1減らす: `ArrowDown`  
- 音量を10増やす: `Shift + ArrowUp`  
- 音量を10減らす: `Shift + ArrowDown`

#### 再生中の曲
- 音量を1増やす: `Ctrl + ArrowUp`  
- 音量を1減らす: `Ctrl + ArrowDown`  
- 音量を10増やす: `Ctrl + Shift + ArrowUp`  
- 音量を10減らす: `Ctrl + Shift + ArrowDown`

#### 再生操作
- 前の曲: `ArrowLeft`  
- 次の曲: `ArrowRight`  
- 再生/一時停止: `Space`  
- プレイリスト再生: `Enter`  
- ループ切り替え: `L`

---

### その他

- **IndexedDB対応**: サイトを読み込み直しても「Global Volume」や曲ごとの音量設定が保持されます。
- **重複アップロード対応**: 同じ名前の曲をアップロードすると、以前の音量設定が引き継がれます。
- **容量制限**: IndexedDBの容量が上限に達した場合は、ブラウザのキャッシュをクリアしてください。


### 現在発見しているバグ
- PlaylistからAvailable Songsにドラッグで曲を戻した後に、別の曲をドラッグでPlaylistに入れたときに前に戻した曲が戻ってくるというバグ
> ダブルクリックで移動しいると上記のバグは起きない
- PlaylistからドラッグでAvailable Songsに曲を移動したとき、曲の見た目が薄くなる
> ダブルクリックで移動しいると上記のバグは起きない