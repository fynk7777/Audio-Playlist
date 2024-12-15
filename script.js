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
document.getElementById('check-storage-button').addEventListener('click', showIndexedDBUsage);

let currentSongIndex = 0;
let playlistSongs = [];
let isPlaylistLooping = false;
const songVolumes = new Map();
let globalVolume = parseFloat(localStorage.getItem('globalVolume')) || 0.1;
let dragging = false;  // ドラッグ操作中かどうかを示すフラグ

// IndexedDB 初期化
let db;

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
    };

    request.onerror = (e) => {
        console.error('Failed to open IndexedDB:', e.target.errorCode);
    };
}
initializeDB();

// IndexedDBに音量を保存
function saveVolumeToDB(songName, volume) {
    const transaction = db.transaction(['volumes'], 'readwrite');
    const store = transaction.objectStore('volumes');
    const data = { songName, volume };

    const request = store.put(data);
    request.onerror = (e) => {
        console.error('Failed to save volume to IndexedDB:', e.target.errorCode);
    };
}

// IndexedDBから音量を取得
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

// グローバル音量の設定
globalVolumeSlider.value = globalVolume;
globalVolumeNumber.value = (globalVolume * 100).toFixed(0);

globalVolumeSlider.addEventListener('input', (e) => {
    globalVolume = parseFloat(e.target.value);
    globalVolumeNumber.value = (globalVolume * 100).toFixed(0);
    updateAudioPlayerVolume();  // グローバル音量の変更時に音量を反映

    // IndexedDBにグローバル音量を保存
    saveVolumeToDB('globalVolume', globalVolume);
});

globalVolumeNumber.addEventListener('input', (e) => {
    const value = Math.min(100, Math.max(0, parseInt(e.target.value)));
    globalVolume = value / 100;
    globalVolumeSlider.value = globalVolume;
    updateAudioPlayerVolume();  // グローバル音量の変更時に音量を反映

    // IndexedDBにグローバル音量を保存
    saveVolumeToDB('globalVolume', globalVolume);
});

function updateAudioPlayerVolume() {
    if (audioPlayer.src) {
        const currentSong = playlistSongs[currentSongIndex];
        const songVolume = songVolumes.get(currentSong) !== undefined ? songVolumes.get(currentSong) : 1; // undefined の場合は 1 を設定
        audioPlayer.volume = songVolume * globalVolume;
    }
}
// Add drag-and-drop functionality
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
        } else if (container === availableSongs && !availableSongs.contains(songElement)) {
            availableSongs.appendChild(songElement);
            playlistSongs = playlistSongs.filter(src => src !== songElement.getAttribute('data-src'));
        }
    });
}

enableDragAndDrop(availableSongs);
enableDragAndDrop(playlist);

playPauseButton.addEventListener('click', () => {
    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
});

// Handle file upload
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
                });

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

                volumeSlider.addEventListener('mouseup', () => {
                    dragging = false;  // 操作終了後、ドラッグを再度有効にする
                });

                volumeNumber.addEventListener('blur', () => {
                    dragging = false;
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

// 再生中の曲のスライダーと数値入力欄を同期する関数
function syncNowPlayingVolumeControls(volume) {
    const nowPlayingSlider = nowPlayingContainer.querySelector('input[type="range"]');
    const nowPlayingNumber = nowPlayingContainer.querySelector('input[type="number"]');
    if (nowPlayingSlider && nowPlayingNumber) {
        nowPlayingSlider.value = volume;
        nowPlayingNumber.value = (volume * 100).toFixed(0);
    }
}

// Play all songs in playlist
playAllButton.addEventListener('click', () => {
    if (playlistSongs.length > 0) {
        currentSongIndex = 0;
        playSong(currentSongIndex);
    }
});

// 次の曲に進む
const nextSongButton = document.getElementById('next-song');
nextSongButton.addEventListener('click', () => {
    if (playlistSongs.length > 0) {
        currentSongIndex = (currentSongIndex + 1) % playlistSongs.length; // 次の曲のインデックスを計算
        playSong(currentSongIndex);
    }
});

// 前の曲に戻る
const previousSongButton = document.getElementById('previous-song');
previousSongButton.addEventListener('click', () => {
    if (playlistSongs.length > 0) {
        currentSongIndex = (currentSongIndex - 1 + playlistSongs.length) % playlistSongs.length; // 前の曲のインデックスを計算
        playSong(currentSongIndex);
    }
});
addEventListener('keydown', (e) => {
    if (e.key==="ArrowLeft"){
        if (playlistSongs.length > 0) {
            currentSongIndex = (currentSongIndex - 1 + playlistSongs.length) % playlistSongs.length; // 前の曲のインデックスを計算
            playSong(currentSongIndex);
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
        }
    }else if (e.key===" "){
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    }else if (e.key==="l"){
        isPlaylistLooping = !isPlaylistLooping;
        loopPlaylistButton.textContent = `Loop Playlist: ${isPlaylistLooping ? 'ON' : 'OFF'}`;
    }
});

function playSong(index) {
    if (index < playlistSongs.length) {
        const currentSong = playlistSongs[index];
        const songVolume = songVolumes.get(currentSong) || 1;
        audioPlayer.src = currentSong;
        audioPlayer.volume = songVolume * globalVolume;
        audioPlayer.play();

        // 再生中の曲を強調表示
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('playing');
        });

        const currentSongElement = Array.from(document.querySelectorAll('.song-item'))
            .find(item => item.getAttribute('data-src') === currentSong);

        if (currentSongElement) {
            currentSongElement.classList.add('playing');
        }

        // 再生中の曲名と音量を表示
        nowPlayingContainer.innerHTML = '';  // 表示をクリア
        const nowPlayingTitle = document.createElement('div');
        nowPlayingTitle.textContent = `Now Playing: ${currentSongElement.textContent}`;

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
            saveVolumeToDB(currentSongElement.textContent, value);

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
            syncPlaylistVolumeControls(currentSong, value / 100);
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

// プレイリスト内のスライダーと数値を同期する関数
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


// Toggle playlist looping
loopPlaylistButton.addEventListener('click', () => {
    isPlaylistLooping = !isPlaylistLooping;
    loopPlaylistButton.textContent = `Loop Playlist: ${isPlaylistLooping ? 'ON' : 'OFF'}`;
});

