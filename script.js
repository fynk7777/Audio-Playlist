//-----------------------------------------------------------------------------
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
audioPlayer.addEventListener('play', () => {
    favicon.href = "images/favicon.png";
    let lastTime = Date.now();
    let count = 0;
    document.title = "再生中";

    function updateTitle() {
        const now = Date.now();
        if (audioPlayer.paused) {
            return; // 再生が停止したら終了
        }
        if (now - lastTime >= 3000) {
            count++;
            document.title = count % 2 === 0 ? "再生中" : songtitle;
            lastTime = now;
        }
        setTimeout(updateTitle, 100); // 次のチェックをスケジュール
    }
    updateTitle();
});

audioPlayer.addEventListener('pause', () => {
    favicon.href = "images/pause.png";
    let lastTime = Date.now();
    let count = 0;
    document.title = "一時停止中";

    function updateTitle() {
        const now = Date.now();
        if (!audioPlayer.paused) {
            return; // 再生が開始したら終了
        }
        if (now - lastTime >= 3000) {
            count++;
            document.title = count % 2 === 0 ? "一時停止中" : songtitle;
            lastTime = now;
        }
        setTimeout(updateTitle, 100); // 次のチェックをスケジュール
    }
    updateTitle();
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
const https = window.location.protocol !== 'https:' && window.location.hostname !== 'localhost'
if (https) {
    console.warn('HTTP環境ではデバイス選択を非表示にします。');
    outputDevicesContainer.style.display = 'none'; // セレクトボックスを非表示
} else {
    // 出力デバイスの一覧を取得
    async function getAudioOutputDevices() {
        try {
            // デバイス権限を取得
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
            console.error('デバイス権限の取得またはデバイス一覧の取得に失敗しました:', err);
        }
    }

    // 出力デバイスを変更
    async function changeAudioOutputDevice(deviceId) {
        if (audioPlayer.setSinkId) {
            try {
                await audioPlayer.setSinkId(deviceId);
                console.log(`出力デバイスを変更: ${deviceId}`);
            } catch (err) {
                console.error(`デバイス変更エラー: ${err.message}`);
            }
        } else {
            alert('このブラウザでは出力デバイスの変更がサポートされていません。');
        }
    }

    // セレクトボックスの変更時
    outputDevices.addEventListener('change', (e) => {
        changeAudioOutputDevice(e.target.value);
    });
    
    // ページロード時にデバイスリストの取得
    getAudioOutputDevices();

}
if (!https){
setInterval(() => {
    getAudioOutputDevices();
}, 5000);
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
