//-----------------------------------------------------------------------------
const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
const audioFilesInput = document.getElementById('audio-files');
const availableSongs = document.getElementById('available-songs');
const playlist = document.getElementById('playlist');
const audioPlayer = document.getElementById('audio-player');
const playAllButton = document.getElementById('play-all');
const loopPlaylistButton = document.getElementById('loop-playlist');
const globalVolumeSlider = document.getElementById('global-volume');
const globalVolumeNumber = document.getElementById('global-volume-number');
const nowPlayingContainer = document.getElementById('now-playing'); // 再生中の曲名と音量表示用
const playPauseButton = document.getElementById('play-pause');
const favicon = document.getElementById('favicon')
const storage_check = document.getElementById('check-storage-button')
const outputDevices = document.getElementById('output-devices');
const modal = document.getElementById('modal');
const openModalBtn = document.getElementById('open-modal');
const closeModalBtn = document.getElementById('close-modal');
const outputDevicesContainer = outputDevices.parentElement; // セレクトボックスの親要素

let currentSongIndex = 0;
let playlistSongs = [];
let isPlaylistLooping = true;
const songVolumes = new Map();
let globalVolume = parseFloat(localStorage.getItem('globalVolume')) || 0.1;
let dragging = false;  // ドラッグ操作中かどうかを示すフラグ
let inputkey = false
let focusslider = false
//-----------------------------------------------------------------------------


//--------------------------
let db, songtitle;
//--------------------------


//-------------------キーボード入力がされたときに変数に追加する関数----------------------
document.addEventListener('keydown', (e)=>{
    presskey.add(e.key.toLowerCase());
})
//----------------------------------------------------------------------------------


//----------------------IndexDBを初期化する関数-------------------------------
function initializeDB() {
    const request = indexedDB.open('MusicApp', 1);

    request.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains('volumes')) {
            db.createObjectStore('volumes', { keyPath: 'songName' });
        }
    };

    request.onsuccess = (e) => {
        db = e.target.result;

        // IndexedDBが初期化された後に音量を取得
        getGlobalVolumeFromDB((savedVolume) => {
            globalVolume = savedVolume;
            globalVolumeSlider.value = globalVolume;
            globalVolumeNumber.value = (globalVolume * 100).toFixed(0);
            updateAudioPlayerVolume();
        });
    };

    request.onerror = (e) => {
        console.error('Failed to open IndexedDB:', e.target.errorCode);
    };
}
initializeDB();
//---------------------------------------------------------------------


//--------------------IndexedDBに音量を保存-----------------------------
function saveVolumeToDB(songName, volume) {
    const transaction = db.transaction(['volumes'], 'readwrite');
    const store = transaction.objectStore('volumes');
    const data = { songName, volume };

    const request = store.put(data);
    request.onerror = (e) => {
        console.error('Failed to save volume to IndexedDB:', e.target.errorCode);
    };
}
//-------------------------------------------------------------------


//---------------------IndexedDBから音量を取得-------------------------
function getVolumeFromDB(songName, callback) {
    const transaction = db.transaction(['volumes'], 'readonly');
    const store = transaction.objectStore('volumes');
    const request = store.get(songName);

    request.onsuccess = (e) => {
        const result = e.target.result;
        callback(result ? result.volume : null);
    };

    request.onerror = (e) => {
        console.error('Failed to fetch volume from IndexedDB:', e.target.errorCode);
        callback(null);
    };
}
//-------------------------------------------------------------------


//--------------------グローバル音量の設定-------------------------------
globalVolumeSlider.value = globalVolume;
globalVolumeNumber.value = (globalVolume * 100).toFixed(0);

globalVolumeSlider.addEventListener('input', (e) => {
    globalVolume = parseFloat(e.target.value);
    globalVolumeNumber.value = (globalVolume * 100).toFixed(0);
    updateAudioPlayerVolume(); // 音量を反映

    // IndexedDBに保存
    saveGlobalVolumeToDB(globalVolume); // IndexedDB に保存
});

globalVolumeNumber.addEventListener('input', (e) => {
    const value = Math.min(100, Math.max(0, parseInt(e.target.value)));
    globalVolume = value / 100;
    globalVolumeSlider.value = globalVolume;
    updateAudioPlayerVolume(); // 音量を反映

    // IndexedDBに保存
    saveGlobalVolumeToDB(globalVolume); // IndexedDB に保存
});
globalVolumeNumber.addEventListener('click', ()=>{
    inputkey = true
})
globalVolumeNumber.addEventListener('blur', ()=>{
    inputkey = false
})
//----------------------------------------------------------------------


//-------------------曲ごとを読み込み表示する関数---------------------------
function enablePlaylistReordering(playlist) {
    let draggedItem = null;
    let dropIndicator = document.createElement('div');
    dropIndicator.style.height = '4px';
    dropIndicator.style.backgroundColor = '#008bff';
    dropIndicator.style.position = 'absolute';
    dropIndicator.style.width = '100%';
    dropIndicator.style.display = 'none';
    playlist.appendChild(dropIndicator);

    playlist.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('song-item')) {
            draggedItem = e.target;
            e.target.style.opacity = '0.5';
        }
    });

    playlist.addEventListener('dragend', (e) => {
        if (draggedItem) {
            draggedItem.style.opacity = '1';
            draggedItem = null;
            dropIndicator.style.display = 'none';
        }
    });

    playlist.addEventListener('dragover', (e) => {
        e.preventDefault();

        if (!draggedItem) return;

        const mouseY = e.clientY;
        let closestElement = null;
        let closestOffset = Number.POSITIVE_INFINITY;

        [...playlist.children].forEach(child => {
            if (child !== draggedItem && child.classList.contains('song-item')) {
                const rect = child.getBoundingClientRect();
                const offset = Math.abs(rect.top + rect.height / 2 - mouseY);

                if (offset < closestOffset) {
                    closestElement = child;
                    closestOffset = offset;
                }
            }
        });

        if (closestElement) {
            const rect = closestElement.getBoundingClientRect();
            dropIndicator.style.top = `${mouseY < rect.top + rect.height / 2 ? closestElement.offsetTop : closestElement.offsetTop + closestElement.offsetHeight}px`;
            dropIndicator.style.display = 'block';
        }
    });

    playlist.addEventListener('dragleave', (e) => {
        dropIndicator.style.display = 'none';
    });

    playlist.addEventListener('drop', (e) => {
        e.preventDefault();
        dropIndicator.style.display = 'none';
    
        const mouseY = e.clientY;
        let closestElement = null;
        let closestOffset = Number.POSITIVE_INFINITY;
    
        [...playlist.children].forEach(child => {
            if (child !== draggedItem && child.classList.contains('song-item')) {
                const rect = child.getBoundingClientRect();
                const offset = Math.abs(rect.top + rect.height / 2 - mouseY);
    
                if (offset < closestOffset) {
                    closestElement = child;
                    closestOffset = offset;
                }
            }
        });
    
        if (closestElement) {
            if (mouseY < closestElement.getBoundingClientRect().top + closestElement.offsetHeight / 2) {
                playlist.insertBefore(draggedItem, closestElement);
            } else {
                playlist.insertBefore(draggedItem, closestElement.nextSibling);
            }
        }
    
        updatePlaylistOrder();
    });
}
//----------------------------------------------------------------


//-------------プレイリストにドラッグ&ドロップを適用---------------------
enablePlaylistReordering(playlist);
//---------------------------------------------------------------


//--------------プレイリストの曲の順番を設定する関数---------------------
function updatePlaylistOrder() {
    playlistSongs = Array.from(playlist.children)
        .filter(item => item.classList.contains('song-item'))
        .map(item => item.getAttribute('data-src'));
}
//---------------------------------------------------------------


//--------------------プレイリストに再並び替えを適用-----------------
enablePlaylistReordering(playlist);
//-----------------------------------------------------------------


//----------------------音量調整の関数--------------------------------
function updateAudioPlayerVolume() {
    if (audioPlayer.src) {
        const currentSong = playlistSongs[currentSongIndex];
        const songVolume = songVolumes.get(currentSong) !== undefined ? songVolumes.get(currentSong) : 1; // undefined の場合は 1 を設定
        audioPlayer.volume = songVolume * globalVolume;
    }
}
//-------------------------------------------------------------------


//------------------ドラッグアンドドロップの関数--------------------------
function enableDragAndDrop(container) {
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.classList.add('dragover');
    });

    container.addEventListener('dragleave', () => {
        container.classList.remove('dragover');
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.classList.remove('dragover');

        const songId = e.dataTransfer.getData('text');
        const songElement = document.getElementById(songId);

        if (container === playlist && !playlist.contains(songElement)) {
            playlist.appendChild(songElement);
            playlistSongs.push(songElement.getAttribute('data-src'));
            updatePlaylistOrder(); // プレイリストへの追加後に更新
        } else if (container === availableSongs && !availableSongs.contains(songElement)) {
            availableSongs.appendChild(songElement);
            playlistSongs = playlistSongs.filter(src => src !== songElement.getAttribute('data-src'));
            updatePlaylistOrder(); // プレイリストから削除後に更新
        }
    });
}
//--------------------------------------------------------------------------------


//-----------------ドラッグアンドドロップの関数を実行する--------------------------------
enableDragAndDrop(availableSongs);
enableDragAndDrop(playlist);
//----------------------------------------------------------------------------


//-----------------------再生/一時停止ボタンの関数------------------------------
playPauseButton.addEventListener('click', () => {
    if (songtitle !== void 0){
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    }
});
//---------------------------------------------------------------------------


//-------------------------ダブルクリックで曲を移動--------------------------------
function enableDoubleClickTransfer(sourceContainer, targetContainer) {
    sourceContainer.addEventListener('dblclick', (e) => {
        if (!focusslider){
            const songItem = e.target.closest('.song-item'); // ダブルクリックされた曲を取得
            if (songItem) {
                const songSrc = songItem.getAttribute('data-src');

                // ソースから削除
                sourceContainer.removeChild(songItem);

                // ターゲットに追加
                targetContainer.appendChild(songItem);

                // プレイリストの更新
                if (sourceContainer === playlist) {
                    playlistSongs = playlistSongs.filter(src => src !== songSrc);
                } else {
                    playlistSongs.push(songSrc);
                }

                updatePlaylistOrder();
            }
        }
    });
}
//---------------------------------------------------------------------------------


//----------------------------ダブルクリック移動を有効化-------------------------------
enableDoubleClickTransfer(availableSongs, playlist);
enableDoubleClickTransfer(playlist, availableSongs);
//----------------------------------------------------------------------------------


// ---------------------------曲をアップロードしたときの関数------------------------------
audioFilesInput.addEventListener('change', () => {
    Array.from(audioFilesInput.files).forEach(file => {
        const songId = `song-${file.name.replace(/\s+/g, '-')}`;

        if (!document.getElementById(songId)) {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.id = songId;
            songItem.draggable = true;
            songItem.textContent = file.name;
            songItem.setAttribute('data-src', URL.createObjectURL(file));

            songItem.addEventListener('dragstart', (e) => {
                if (!dragging) {  // ドラッグ操作中でない場合にのみドラッグを開始
                    e.dataTransfer.setData('text', songItem.id);
                }
            });

            // Prevent dragging when interacting with the volume slider
            const volumeSlider = document.createElement('input');
            volumeSlider.type = 'range';
            volumeSlider.min = 0;
            volumeSlider.max = 1;
            volumeSlider.step = 0.01;

            // IndexedDBから保存された音量を適用
            getVolumeFromDB(file.name, (savedVolume) => {
                const volume = savedVolume !== null ? savedVolume : 0.05; // デフォルト値を適用
                volumeSlider.value = volume;

                const volumeNumber = document.createElement('input');
                volumeNumber.type = 'number';
                volumeNumber.min = 0;
                volumeNumber.max = 100;
                volumeNumber.step = 1;
                volumeNumber.value = (volume * 100).toFixed(0);

                volumeSlider.addEventListener('mousedown', (e) => {
                    dragging = true;  // 音量スライダー操作中
                    songItem.draggable = false;
                    inputkey = true
                });
                volumeNumber.addEventListener('click', ()=>{
                    dragging = true;
                    songItem.draggable = false;
                    inputkey = true
                })

                volumeSlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    volumeNumber.value = (value * 100).toFixed(0);
                    songVolumes.set(songItem.getAttribute('data-src'), value);
                    updateAudioPlayerVolume();
                
                    // IndexedDBに音量を保存
                    saveVolumeToDB(file.name, value);
                
                    // 再生中の曲の音量スライダーを同期
                    if (playlistSongs[currentSongIndex] === songItem.getAttribute('data-src')) {
                        syncNowPlayingVolumeControls(value);
                    }
                });

                volumeNumber.addEventListener('input', (e) => {
                    const value = Math.min(100, Math.max(0, e.target.value));
                    volumeSlider.value = value / 100;
                    songVolumes.set(songItem.getAttribute('data-src'), value / 100);
                    updateAudioPlayerVolume();

                    // IndexedDBに音量を保存
                    saveVolumeToDB(file.name, value / 100);

                    // 再生中の曲の音量スライダーを同期
                    if (playlistSongs[currentSongIndex] === songItem.getAttribute('data-src')) {
                        syncNowPlayingVolumeControls(value);
                    }
                });
                volumeSlider.addEventListener('focus', ()=>{
                    focusslider = true
                })
                volumeSlider.addEventListener('blur', ()=>{
                    focusslider = false
                })
                volumeSlider.addEventListener('mouseup', () => {
                    dragging = false;  // 操作終了後、ドラッグを再度有効にする
                    songItem.draggable = true;
                    inputkey = false
                });
                volumeNumber.addEventListener('focus', () => {
                    focusslider = true
                })
                volumeNumber.addEventListener('blur', () => {
                    dragging = false;
                    songItem.draggable = true;
                    inputkey = false
                    focusslider = false
                });

                const volumeControls = document.createElement('div');
                volumeControls.className = 'song-volume';
                volumeControls.appendChild(volumeSlider);
                volumeControls.appendChild(volumeNumber);

                songItem.appendChild(volumeControls);
                availableSongs.appendChild(songItem);

                // Initialize volume map
                songVolumes.set(songItem.getAttribute('data-src'), volume);
            });
        }
    });
});
//-----------------------------------------------------------------------------------


//--------------------再生中の曲のスライダーと数値入力欄を同期する関数------------------------
function syncNowPlayingVolumeControls(volume) {
    const nowPlayingSlider = nowPlayingContainer.querySelector('input[type="range"]');
    const nowPlayingNumber = nowPlayingContainer.querySelector('input[type="number"]');
    if (nowPlayingSlider && nowPlayingNumber) {
        nowPlayingSlider.value = volume;
        nowPlayingNumber.value = (volume * 100).toFixed(0);
    }
}
//------------------------------------------------------------------------------------


//-----------------------------------PlayAllボタンの関数---------------------------------
playAllButton.addEventListener('click', () => {
    if (playlistSongs.length > 0) {
        currentSongIndex = 0;
        playSong(currentSongIndex);
    }
});
//-------------------------------------------------------------------------------------


//-----------------------------------次の曲に進む----------------------------------------
const nextSongButton = document.getElementById('next-song');
nextSongButton.addEventListener('click', () => {
    if (playlistSongs.length > 0) {
        currentSongIndex = (currentSongIndex + 1) % playlistSongs.length; // 次の曲のインデックスを計算
        playSong(currentSongIndex);
    }
});
//-----------------------------------------------------------------------------------


//------------------------------------前の曲に戻る----------------------------------
const previousSongButton = document.getElementById('previous-song');
previousSongButton.addEventListener('click', () => {
    if (playlistSongs.length > 0) {
        currentSongIndex = (currentSongIndex - 1 + playlistSongs.length) % playlistSongs.length; // 前の曲のインデックスを計算
        playSong(currentSongIndex);
    }
});
//--------------------------------------------------------------------------------------


//-----------------------------------曲を再生する関数---------------------------------------
function playSong(index) {
    if (index < playlistSongs.length) {
        const currentSong = playlistSongs[index];
        const songVolume = songVolumes.get(currentSong) || 1;
        audioPlayer.src = currentSong;
        audioPlayer.volume = songVolume * globalVolume;

        // 再生中の曲を強調表示
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('playing');
        });

        const currentSongElement = Array.from(document.querySelectorAll('.song-item'))
            .find(item => item.getAttribute('data-src') === currentSong);

        audioPlayer.play();

        if (currentSongElement) {
            currentSongElement.classList.add('playing');
        }

        // 再生中の曲名と音量を表示
        nowPlayingContainer.innerHTML = '';  // 表示をクリア
        songtitle = currentSongElement.textContent
        const nowPlayingTitle = document.createElement('div');
        nowPlayingTitle.textContent = `Now Playing: No.${index + 1}, ${songtitle}`;

        // 再生中の曲の音量スライダーを表示
        const nowPlayingVolumeControls = currentSongElement.querySelector('.song-volume').cloneNode(true);  // スライダーを複製

        nowPlayingContainer.appendChild(nowPlayingTitle);
        nowPlayingContainer.appendChild(nowPlayingVolumeControls);

        // スライダーと数値入力の同期
        const nowPlayingSlider = nowPlayingVolumeControls.querySelector('input[type="range"]');
        const nowPlayingNumber = nowPlayingVolumeControls.querySelector('input[type="number"]');

        nowPlayingSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            nowPlayingNumber.value = (value * 100).toFixed(0);
            songVolumes.set(currentSong, value);
            updateAudioPlayerVolume();

            // IndexedDBに保存
            saveVolumeToDB(currentSongElement.textContent,((value * 100).toFixed(1)) / 100);

            // プレイリスト内の対応するスライダーを更新
            syncPlaylistVolumeControls(currentSong, value);
        });

        nowPlayingNumber.addEventListener('input', (e) => {
            const value = Math.min(100, Math.max(0, parseFloat(e.target.value)));
            nowPlayingSlider.value = value / 100;
            songVolumes.set(currentSong, value / 100);
            updateAudioPlayerVolume();

            // IndexedDBに保存
            saveVolumeToDB(currentSongElement.textContent, value / 100);

            // プレイリスト内の対応するスライダーを更新
            syncPlaylistVolumeControls(currentSong, value);
        });

        document.addEventListener('keydown', (e) => {
            if (!inputkey) {
                if (presskey.has("arrowup") && presskey.has("control")) {
                    // 再生中の曲の音量を調整
                    let value = presskey.has("shift") ? parseFloat(nowPlayingSlider.value) + 0.1 : parseFloat(nowPlayingSlider.value) + 0.01;
                    value = Math.min(1, value); // 音量の上限を1に設定
                    nowPlayingSlider.value = value;
                    nowPlayingNumber.value = (value * 100).toFixed(0);
                    
                    const currentSong = playlistSongs[currentSongIndex];
                    songVolumes.set(currentSong, value);
                    updateAudioPlayerVolume();
        
                    // IndexedDBに保存
                    saveVolumeToDB(currentSong, value);
        
                    // プレイリスト内のスライダーを更新
                    syncPlaylistVolumeControls(currentSong, value);
        
                    e.preventDefault();
                } else if (presskey.has("arrowdown") && presskey.has("control")) {
                    // 再生中の曲の音量を調整
                    let value = presskey.has("shift") ? parseFloat(nowPlayingSlider.value) - 0.1 : parseFloat(nowPlayingSlider.value) - 0.01;
                    value = Math.max(0, value); // 音量の下限を0に設定
                    nowPlayingSlider.value = value;
                    nowPlayingNumber.value = (value * 100).toFixed(0);
                    
                    const currentSong = playlistSongs[currentSongIndex];
                    songVolumes.set(currentSong, value);
                    updateAudioPlayerVolume();
        
                    // IndexedDBに保存
                    saveVolumeToDB(currentSong, value);
        
                    // プレイリスト内のスライダーを更新
                    syncPlaylistVolumeControls(currentSong, value);
        
                    e.preventDefault();
                }
            }
        });
        

        audioPlayer.onended = () => {
            currentSongIndex++;
            if (currentSongIndex >= playlistSongs.length && isPlaylistLooping) {
                currentSongIndex = 0;
            }
            if (currentSongIndex < playlistSongs.length) {
                playSong(currentSongIndex);
            }
        };
    }
}
//-------------------------------------------------------------------------------------------


//--------------------------プレイリスト内のスライダーと数値を同期する関数----------------------------
function syncPlaylistVolumeControls(songSrc, volume) {
    const correspondingSongElement = Array.from(document.querySelectorAll('.song-item'))
        .find(item => item.getAttribute('data-src') === songSrc);

    if (correspondingSongElement) {
        const playlistSlider = correspondingSongElement.querySelector('input[type="range"]');
        const playlistVolumeNumber = correspondingSongElement.querySelector('input[type="number"]');
        playlistSlider.value = volume;
        playlistVolumeNumber.value = (volume * 100).toFixed(0);
    }
}
//------------------------------------------------------------------------------


//---------------------------------------IndexedDBをリセットする仕組み---------------------------------------
function resetIndexedDB(databaseName) {
    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(databaseName);

        deleteRequest.onsuccess = () => {
            alert(`IndexedDB "${databaseName}" のデータベースが削除されました`);
            resolve();
        };

        deleteRequest.onerror = (e) => {
            alert(`IndexedDB "${databaseName}" の削除中にエラーが発生しました:`, e.target.errorCode);
            reject(e.target.error);
        };

        deleteRequest.onblocked = () => {
            alert(`IndexedDB "${databaseName}" を削除中にブロックされました。`);
        };
    });
}
//------------------------------------------------------------------------------


//---------------------------------------容量を表示する関数---------------------------------------
storage_check.addEventListener('click', showIndexedDBUsage);
async function showIndexedDBUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0; // 使用済み容量（バイト）
            const quota = estimate.quota || 0; // 最大容量（バイト）
            const percentageUsed = ((usage / quota) * 100).toFixed(2); // 使用率

            // 容量を適切な単位に変換
            function formatBytes(bytes) {
                const units = ['B', 'KB', 'MB', 'GB', 'TB'];
                let i = 0;
                let value = bytes;
                while (value >= 1024 && i < units.length - 1) {
                    value /= 1024;
                    i++;
                }
                return `${value.toFixed(2)} ${units[i]}`;
            }

            const formattedUsage = formatBytes(usage);
            const formattedQuota = formatBytes(quota);

            alert(`現在の容量 : ${formattedUsage} / ${formattedQuota} (${percentageUsed}%)`);
        } catch (error) {
            console.error('容量の取得中にエラーが発生しました:', error);
            alert('IndexedDB容量を取得できませんでした。');
        }
    } else {
        alert('このブラウザはストレージ使用量の取得をサポートしていません。');
    }
}
//------------------------------------------------------------------------------


//-------------------------------ループボタンの関数-------------------------------
loopPlaylistButton.addEventListener('click', () => {
    isPlaylistLooping = !isPlaylistLooping;
    loopPlaylistButton.textContent = `Loop Playlist: ${isPlaylistLooping ? 'ON' : 'OFF'}`;
});
//-----------------------------------------------------------------------------


//----------------------------キーボード入力に対応させる----------------------------
const presskey = new Set();
const p = document.querySelector('#p')

addEventListener('keydown', (e) => {
    if(!inputkey){
        if (e.key==="ArrowLeft"){
            if (playlistSongs.length > 0) {
                currentSongIndex = (currentSongIndex - 1 + playlistSongs.length) % playlistSongs.length; // 前の曲のインデックスを計算
                playSong(currentSongIndex);
                e.preventDefault();
            }
        } else if(e.key==="ArrowRight"){
            if (playlistSongs.length > 0) {
                currentSongIndex = (currentSongIndex + 1) % playlistSongs.length; // 次の曲のインデックスを計算
                playSong(currentSongIndex);
            }
        }else if (e.key==="Enter"){
            if (playlistSongs.length > 0) {
                currentSongIndex = 0;
                playSong(currentSongIndex);
                e.preventDefault();
            }
        }else if (e.key===" "){
            if(songtitle!== void 0){
                if (audioPlayer.paused) {
                    audioPlayer.play();
                } else {
                    audioPlayer.pause();
                }
            }
            e.preventDefault();
        }else if (e.key==="l"){
            isPlaylistLooping = !isPlaylistLooping;
            loopPlaylistButton.textContent = `Loop Playlist: ${isPlaylistLooping ? 'ON' : 'OFF'}`;
            e.preventDefault();
        }else if(presskey.has("arrowup") && !presskey.has("control")) {
            globalVolume = presskey.has("shift") ? globalVolume + Number(0.1) : globalVolume + Number(0.01) ;
            if(globalVolume > 1){
                globalVolume = 1
            }
            globalVolumeNumber.value = (globalVolume * 100).toFixed(0);
            globalVolumeSlider.value = globalVolume;
            updateAudioPlayerVolume(); // 音量を反映
        
            // IndexedDBに保存
            localStorage.setItem('globalVolume', globalVolume);
            e.preventDefault();
        }else if(presskey.has("arrowdown") && !presskey.has("control")) {
            globalVolume = presskey.has("shift") ? globalVolume - Number(0.1) : globalVolume - Number(0.01) ;
            if(globalVolume < 0){
                globalVolume = 0
            }
            globalVolumeNumber.value = (globalVolume * 100).toFixed(0);
            globalVolumeSlider.value = globalVolume;
            updateAudioPlayerVolume(); // 音量を反映
        
            // IndexedDBに保存
            localStorage.setItem('globalVolume', globalVolume);
            e.preventDefault();
        }else if(presskey.has('h')){
            if (modal.style.display==='flex'){
                modal.style.display = 'none';
            }else{
                modal.style.display = 'flex';
            }
        }else if(presskey.has('control') && presskey.has('u')){
            audioFilesInput.click()
            e.preventDefault();
        }else if(presskey.has('control') && presskey.has('i')){
            showIndexedDBUsage()
            e.preventDefault()
        }
    }
});

window.addEventListener("blur", () => {
    presskey.clear()    
});
document.addEventListener('keyup', (e) => {
    presskey.delete(e.key.toLowerCase());
});

//------------------------------------------------------------------------------


//---------------------titleとfaviconの変更------------------------------
// Base64形式のファビコンデータ
const favicons = {
  set: "data:image/png;base64,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", // Set.pngのBase64データ
  play: "data:image/png;base64,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", // favicon.pngのBase64データ
  pause: "data:image/png;base64,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" // pause.pngのBase64データ
};

// ファビコンを動的に変更する関数
function setFavicon(base64Data) {
  const favicon = document.getElementById("favicon");
  if (favicon) {
    favicon.href = base64Data;
  }
}

// タイトルとファビコンを動的に変更
audioPlayer.addEventListener("play", () => {
  setFavicon(favicons.play); // 再生中アイコンに変更
  let lastTime = Date.now();
  let count = 0;
  document.title = "再生中";

  function updateTitle() {
    const now = Date.now();
    if (audioPlayer.paused) return; // 再生が停止したら終了
    if (now - lastTime >= 3000) {
      count++;
      document.title = count % 2 === 0 ? "再生中" : songtitle;
      lastTime = now;
    }
    setTimeout(updateTitle, 100);
  }
  updateTitle();
});

audioPlayer.addEventListener("pause", () => {
  setFavicon(favicons.pause); // 一時停止アイコンに変更
  let lastTime = Date.now();
  let count = 0;
  document.title = "一時停止中";

  function updateTitle() {
    const now = Date.now();
    if (!audioPlayer.paused) return; // 再生が開始したら終了
    if (now - lastTime >= 3000) {
      count++;
      document.title = count % 2 === 0 ? "一時停止中" : songtitle;
      lastTime = now;
    }
    setTimeout(updateTitle, 100);
  }
  updateTitle();
});

window.addEventListener("beforeunload", () => {
  setFavicon(favicons.set); // 初期アイコンに戻す
});
//-------------------------------------------------------------------------


//---------------------使い方の表示------------------------
// モーダルの開閉処理
openModalBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Escapeキーでモーダルを閉じる処理
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
    }
});

// モーダルの外側をクリックしたときに閉じる
modal.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
 //-----------------------------------------------


//------------------------出力デバイスの変更-------------------------------
if (window.location.protocol === "https:") {

    // デバイスリストの取得関数
    async function getAudioOutputDevices() {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });

            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

            outputDevices.innerHTML = ''; // セレクトボックスをリセット

            audioOutputs.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `デバイスID: ${device.deviceId}`;
                outputDevices.appendChild(option);
            });
        } catch (err) {
            console.error('デバイスリストの取得エラー:', err);
        }
    }

    // デバイス変更イベント
    outputDevices.addEventListener('change', async () => {
        const selectedDeviceId = outputDevices.value;

        if (audioPlayer.setSinkId) {
            try {
                await audioPlayer.setSinkId(selectedDeviceId);
                console.log(`出力先を変更: ${selectedDeviceId}`);
            } catch (err) {
                console.error('出力先の変更エラー:', err);
            }
        } else {
            console.warn('このブラウザでは setSinkId がサポートされていません。');
        }
    });

    // ページロード時に取得
    getAudioOutputDevices();

    // デバイス変更イベントでリストを更新
    navigator.mediaDevices.ondevicechange = () => {
        console.log('デバイス変更を検知');
        getAudioOutputDevices();
    };
} else {
    document.getElementById('outputDevicesContainer').style.display = 'none'; // セレクトボックスを非表示
    console.warn('この機能は HTTPS 接続が必要です。');
}
//---------------------------------------------------------------------


//----------------gloval volumeを保存・読み込みする関数------------------
function saveGlobalVolumeToDB(volume) {
    const transaction = db.transaction(['volumes'], 'readwrite');
    const store = transaction.objectStore('volumes');
    const data = { songName: 'globalVolume', volume };

    const request = store.put(data);
    request.onerror = (e) => {
        console.error('Failed to save global volume to IndexedDB:', e.target.errorCode);
    };
}

function getGlobalVolumeFromDB(callback) {
    const transaction = db.transaction(['volumes'], 'readonly');
    const store = transaction.objectStore('volumes');
    const request = store.get('globalVolume');

    request.onsuccess = (e) => {
        const result = e.target.result;
        callback(result ? result.volume : 0.1); // デフォルト値 0.1 を使用
    };

    request.onerror = (e) => {
        console.error('Failed to fetch global volume from IndexedDB:', e.target.errorCode);
        callback(0.1);
    };
}
getGlobalVolumeFromDB((savedVolume) => {
    globalVolume = savedVolume;
    globalVolumeSlider.value = globalVolume;
    globalVolumeNumber.value = (globalVolume * 100).toFixed(0);
    updateAudioPlayerVolume();
});
//------------------------------------------------------------------------------
