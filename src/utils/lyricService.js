import { watch } from 'vue';
import { usePlayerStore } from '../store/playerStore';
import { storeToRefs } from 'pinia';

let lyricIndexInterval = null;
let initialized = false;
const stopWatchers = [];

const playerStore = usePlayerStore();
const {
    playing,
    progress,
    currentIndex,
    songList,
    lyricsObjArr,
    currentLyricIndex,
    time,
    currentMusic,
    lyric,
} = storeToRefs(playerStore);

const regNewLine = /\n/;
const timeTag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

function parseTimeTag(tag) {
    const m = tag.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/);
    if (!m) return 0;
    const mm = parseInt(m[1] || '0', 10);
    const ss = parseInt(m[2] || '0', 10);
    const ms = m[3] ? parseInt((m[3] + '00').slice(0, 3), 10) : 0;
    return mm * 60 + ss + ms / 1000;
}

function buildMultiTrack(olrc, tlrc, rlrc) {
    const byTime = new Map();

    const feed = (text, fieldOrder = ['lyric', 'tlyric', 'rlyric'], directField = null) => {
        if (!text || typeof text !== 'string') return;
        const lines = text.split(/\r?\n/);
        for (const raw of lines) {
            if (!raw) continue;
            const tags = Array.from(raw.matchAll(timeTag));
            if (!tags || tags.length === 0) continue;
            const lyricText = raw.split(']').pop().trim();
            if (!lyricText) continue;

            for (const t of tags) {
                const sec = parseTimeTag(t[0]);
                const key = sec.toFixed(3);
                if (!byTime.has(key)) byTime.set(key, { time: sec, lyric: '', tlyric: '', rlyric: '', active: true });
                const obj = byTime.get(key);
                if (directField) {
                    if (!obj[directField]) obj[directField] = lyricText;
                } else {
                    for (const f of fieldOrder) {
                        if (!obj[f]) { obj[f] = lyricText; break; }
                    }
                }
            }
        }
    };

    feed(tlrc, ['tlyric', 'lyric', 'rlyric'], 'tlyric');
    feed(rlrc, ['rlyric', 'lyric', 'tlyric'], 'rlyric');
    feed(olrc, ['lyric', 'tlyric', 'rlyric'], null);

    let isPureMusic = false;
    for (const obj of byTime.values()) {
        if ((obj.lyric && obj.lyric.includes('纯音乐')) || (obj.tlyric && obj.tlyric.includes('纯音乐'))) {
            isPureMusic = true;
            break;
        }
    }
    if (isPureMusic) {
        return [
            { lyric: '纯音乐，请欣赏', tlyric: '', rlyric: '', time: 0, active: true },
            { lyric: '', tlyric: '', rlyric: '', time: Math.trunc((songList.value[currentIndex.value]?.dt || 0) / 1000), active: true },
        ];
    }

    return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}

const regTimeOriginal = /\[\d{2}:\d{2}.\d{2,3}\]/;
const formatLyricTimeOriginal = (time) => {
    const regMin = /.*:/;
    const regSec = /:.*\./;
    const regMs = /\./;

    if (time.indexOf('.') === -1) time = time.replace(/(.*):/, '$1.');
    const min = parseInt(time.match(regMin)[0].slice(0, 2));
    let sec = parseInt(time.match(regSec)[0].slice(1, 3));
    const ms = time.slice(time.match(regMs).index + 1, time.match(regMs).index + 3);
    if (min !== 0) sec += min * 60;
    return Number(sec + '.' + ms);
};

function lyricHandleOriginal(arr, tarr, rarr) {
    let lyricArr = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === '') continue;
        const obj = {};
        const lyctime = arr[i].match(regTimeOriginal);
        if (!lyctime) continue;
        obj.lyric = arr[i].split(']')[1].trim() === '' ? '' : arr[i].split(']')[1].trim();
        if (!obj.lyric) continue;
        if (obj.lyric.indexOf('纯音乐') !== -1 || obj.time > 4500) {
            const duration = Math.trunc((songList.value?.[currentIndex.value]?.dt || 0) / 1000);
            lyricArr = [
                { lyric: '纯音乐，请欣赏', time: 0 },
                { lyric: '', time: duration },
            ];
            return lyricArr;
        }
        if (tarr && obj.lyric.indexOf('作词') === -1 && obj.lyric.indexOf('作曲') === -1) {
            for (let j = 0; j < tarr.length; j++) {
                if (tarr[j] === '') continue;
                if (tarr[j].indexOf(lyctime[0].substring(0, lyctime[0].length - 1)) !== -1) {
                    obj.tlyric = tarr[j].split(']')[1].trim() === '' ? '' : tarr[j].split(']')[1].trim();
                    if (!obj.tlyric) {
                        tarr.splice(j, 1);
                        j--;
                        continue;
                    }
                    tarr.splice(j, 1);
                    break;
                }
            }
        }
        if (rarr && obj.lyric.indexOf('作词') === -1 && obj.lyric.indexOf('作曲') === -1) {
            for (let k = 0; k < rarr.length; k++) {
                if (rarr[k] === '') continue;
                if (rarr[k].indexOf(lyctime[0].substring(0, lyctime[0].length - 1)) !== -1) {
                    obj.rlyric = rarr[k].split(']')[1].trim() === '' ? '' : rarr[k].split(']')[1].trim();
                    if (!obj.rlyric) {
                        rarr.splice(k, 1);
                        k--;
                        continue;
                    }
                    rarr.splice(k, 1);
                    break;
                }
            }
        }
        obj.time = lyctime ? formatLyricTimeOriginal(lyctime[0].slice(1, lyctime[0].length - 1)) : 0;
        if (obj.lyric !== '') lyricArr.push(obj);
    }
    function sortBy(field) {
        return (x, y) => x[field] - y[field];
    }
    return lyricArr.sort(sortBy('time'));
}

function processLyricData() {
    if (!lyric.value) {
        playerStore.lyricsObjArr = [];
        return;
    }

    try {
        const hasTimeTag = lyric.value.lrc && typeof lyric.value.lrc.lyric === 'string' && lyric.value.lrc.lyric.indexOf('[') !== -1;
        const curSong = songList.value && songList.value[currentIndex.value];
        const isLocal = !!(curSong && curSong.type === 'local');
        if (hasTimeTag) {
            const olrc = lyric.value.lrc?.lyric || '';
            const tlrc = lyric.value.tlyric && lyric.value.tlyric.lyric ? lyric.value.tlyric.lyric : '';
            const rlrc = lyric.value.romalrc && lyric.value.romalrc.lyric ? lyric.value.romalrc.lyric : '';
            const processed = isLocal
                ? buildMultiTrack(olrc, tlrc, rlrc)
                : lyricHandleOriginal(
                    olrc.split(regNewLine),
                    tlrc ? tlrc.split(regNewLine) : null,
                    rlrc ? rlrc.split(regNewLine) : null
                  );
            playerStore.lyricsObjArr = processed;
        } else {
            const lines = (lyric.value.lrc?.lyric || '').split(regNewLine);
            const processed = [];
            for (const line of lines) {
                if (!line || line.trim() === '') continue;
                processed.push({ lyric: line.trim(), tlyric: '', rlyric: '', time: 0, active: true });
            }
            processed.push({ lyric: '', tlyric: '', rlyric: '', time: Math.trunc((songList.value[currentIndex.value]?.dt || 0) / 1000), active: true });
            playerStore.lyricsObjArr = processed;
        }
    } catch (error) {
        console.error('处理歌词数据出错:', error);
        playerStore.lyricsObjArr = [];
    }
}

function findLyricIndexAt(timeInSeconds) {
    if (!Array.isArray(lyricsObjArr.value) || lyricsObjArr.value.length === 0) return -1;
    const target = Number(timeInSeconds);
    if (!Number.isFinite(target)) return -1;
    const arr = lyricsObjArr.value;
    const padded = target + 0.2;
    let left = 0;
    let right = arr.length - 1;
    let answer = -1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const lyricTime = Number(arr[mid]?.time || 0);
        if (lyricTime <= padded) {
            answer = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    if (answer < 0) return 0;
    if (answer > arr.length - 1) return arr.length - 1;
    return answer;
}

function updateIndexFromPlayback() {
    if (!currentMusic.value || typeof currentMusic.value.seek !== 'function') {
        syncIndexFromProgress();
        return;
    }
    const seek = currentMusic.value.seek();
    const idx = findLyricIndexAt(seek);
    if (idx >= 0 && idx !== currentLyricIndex.value) {
        playerStore.currentLyricIndex = idx;
    }
}

function syncIndexFromProgress() {
    const baseTime = Number(progress.value) || 0;
    const idx = findLyricIndexAt(baseTime);
    if (idx >= 0) {
        if (currentLyricIndex.value !== idx) playerStore.currentLyricIndex = idx;
    } else if (currentLyricIndex.value !== -1) {
        playerStore.currentLyricIndex = -1;
    }
}

function startLyricIndexCalculation() {
    stopLyricIndexCalculation();
    if (!playing.value) return;
    lyricIndexInterval = setInterval(updateIndexFromPlayback, 200);
}

function stopLyricIndexCalculation() {
    if (lyricIndexInterval) {
        clearInterval(lyricIndexInterval);
        lyricIndexInterval = null;
    }
}

export function initLyricService() {
    if (initialized) return;
    initialized = true;

    stopWatchers.push(watch(() => lyric.value, () => {
        processLyricData();
        syncIndexFromProgress();
    }, { immediate: true }));

    stopWatchers.push(watch(() => playing.value, (isPlaying) => {
        if (isPlaying) {
            startLyricIndexCalculation();
        } else {
            stopLyricIndexCalculation();
            syncIndexFromProgress();
        }
    }, { immediate: true }));

    stopWatchers.push(watch(() => progress.value, () => {
        if (!playing.value) {
            syncIndexFromProgress();
        }
    }));

    stopWatchers.push(watch(() => currentIndex.value, () => {
        syncIndexFromProgress();
    }));

    stopWatchers.push(watch(() => lyricsObjArr.value, () => {
        syncIndexFromProgress();
    }));

    stopWatchers.push(watch(() => time.value, () => {
        syncIndexFromProgress();
    }));
}

export function destroyLyricService() {
    stopLyricIndexCalculation();
    while (stopWatchers.length) {
        const stop = stopWatchers.pop();
        if (typeof stop === 'function') stop();
    }
    initialized = false;
}

export function syncLyricIndexFromProgress() {
    syncIndexFromProgress();
}
