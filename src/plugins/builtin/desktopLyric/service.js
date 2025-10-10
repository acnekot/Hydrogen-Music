import { watch } from 'vue';
import { storeToRefs } from 'pinia';

const regNewLine = /\n/;
const timeTag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

function parseTimeTag(tag) {
  const m = tag.match(/\[(\d{1,2}):(\d{2})\.?(\d{0,3})?\]/);
  if (!m) return 0;
  const mm = parseInt(m[1] || '0', 10);
  const ss = parseInt(m[2] || '0', 10);
  const ms = m[3] ? parseInt((m[3] + '00').slice(0, 3), 10) : 0;
  return mm * 60 + ss + ms / 1000;
}

function buildMultiTrack(olrc, tlrc, rlrc, songDuration) {
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
            if (!obj[f]) {
              obj[f] = lyricText;
              break;
            }
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
    if (obj.lyric && obj.lyric.includes('纯音乐')) { isPureMusic = true; break; }
    if (obj.tlyric && obj.tlyric.includes('纯音乐')) { isPureMusic = true; break; }
  }
  if (isPureMusic) {
    return [
      { lyric: '纯音乐，请欣赏', tlyric: '', rlyric: '', time: 0, active: true },
      { lyric: '', tlyric: '', rlyric: '', time: Math.trunc(songDuration / 1000), active: true },
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

function lyricHandleOriginal(arr, tarr, rarr, duration) {
  let lyricArr = [];
  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i] === '') continue;
    const obj = {};
    const lyctime = arr[i].match(regTimeOriginal);
    if (!lyctime) continue;
    obj.lyric = arr[i].split(']')[1].trim() === '' ? '' : arr[i].split(']')[1].trim();
    if (!obj.lyric) continue;
    if (obj.lyric.indexOf('纯音乐') !== -1 || obj.time > 4500) {
      lyricArr = [
        { lyric: '纯音乐，请欣赏', time: 0 },
        { lyric: '', time: Math.trunc(duration / 1000) },
      ];
      return lyricArr;
    }
    if (tarr && obj.lyric.indexOf('作词') === -1 && obj.lyric.indexOf('作曲') === -1) {
      for (let j = 0; j < tarr.length; j += 1) {
        if (tarr[j] === '') continue;
        if (tarr[j].indexOf(lyctime[0].substring(0, lyctime[0].length - 1)) !== -1) {
          obj.tlyric = tarr[j].split(']')[1].trim() === '' ? '' : tarr[j].split(']')[1].trim();
          if (!obj.tlyric) {
            tarr.splice(j, 1);
            j -= 1;
            continue;
          }
          tarr.splice(j, 1);
          break;
        }
      }
    }
    if (rarr && obj.lyric.indexOf('作词') === -1 && obj.lyric.indexOf('作曲') === -1) {
      for (let k = 0; k < rarr.length; k += 1) {
        if (rarr[k] === '') continue;
        if (rarr[k].indexOf(lyctime[0].substring(0, lyctime[0].length - 1)) !== -1) {
          obj.rlyric = rarr[k].split(']')[1].trim() === '' ? '' : rarr[k].split(']')[1].trim();
          if (!obj.rlyric) {
            rarr.splice(k, 1);
            k -= 1;
            continue;
          }
          rarr.splice(k, 1);
          break;
        }
      }
    }
    obj.time = lyctime ? formatLyricTimeOriginal(lyctime[0].slice(1, lyctime[0].length - 1)) : 0;
    if (!(obj.lyric === '')) lyricArr.push(obj);
  }
  function sortBy(field) {
    return (x, y) => x[field] - y[field];
  }
  return lyricArr.sort(sortBy('time'));
}

function createLyricProcessor(playerRefs, logger) {
  return () => {
    const { lyric, songList, currentIndex } = playerRefs;
    if (!lyric.value) {
      playerRefs.playerStore.lyricsObjArr = [];
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
          ? buildMultiTrack(olrc, tlrc, rlrc, songList.value[currentIndex.value]?.dt || 0)
          : lyricHandleOriginal(
            olrc.split(regNewLine),
            tlrc ? tlrc.split(regNewLine) : null,
            rlrc ? rlrc.split(regNewLine) : null,
            songList.value[currentIndex.value]?.dt || 0,
          );
        playerRefs.playerStore.lyricsObjArr = processed;
      } else {
        const lines = (lyric.value.lrc?.lyric || '').split(regNewLine);
        const processed = [];
        for (const line of lines) {
          if (!line || line.trim() === '') continue;
          processed.push({ lyric: line.trim(), tlyric: '', rlyric: '', time: 0, active: true });
        }
        processed.push({ lyric: '', tlyric: '', rlyric: '', time: Math.trunc((songList.value[currentIndex.value]?.dt || 0) / 1000), active: true });
        playerRefs.playerStore.lyricsObjArr = processed;
      }
    } catch (error) {
      logger.error('处理歌词数据出错:', error);
      playerRefs.playerStore.lyricsObjArr = [];
    }
  };
}

export function createDesktopLyricService({ stores, windowApi, logger, addCleanup }) {
  const playerStore = stores.player;
  const refs = storeToRefs(playerStore);
  const {
    playing,
    progress,
    currentIndex,
    songList,
    lyricsObjArr,
    currentLyricIndex,
    isDesktopLyricOpen,
    time,
    currentMusic,
    lyric,
  } = refs;

  const electronAPI = windowApi || (typeof window !== 'undefined' ? window.electronAPI || null : null);

  let lyricProgressInterval = null;
  let lyricIndexInterval = null;
  const stops = [];

  const playerRefs = { lyric, songList, currentIndex, playerStore };
  const processLyricData = createLyricProcessor(playerRefs, logger || console);

  const calculateLyricIndex = () => {
    if (!lyricsObjArr.value || lyricsObjArr.value.length === 0 || !currentMusic.value) return;

    const length = lyricsObjArr.value.length - 1;
    const currentSeek = currentMusic.value.seek();

    const newIndex = lyricsObjArr.value.findIndex((item, index) => {
      if (index !== length) {
        return (currentSeek + 0.2) * 1000 < lyricsObjArr.value[index + 1].time * 1000;
      }
      return (currentSeek + 0.2) * 1000 > item.time * 1000;
    });

    if (newIndex !== -1 && newIndex !== currentLyricIndex.value) {
      playerStore.currentLyricIndex = newIndex;
    }
  };

  const sendCurrentLyricData = () => {
    if (!electronAPI) return;

    try {
      const hasData = songList.value && songList.value.length > 0 && currentIndex.value >= 0;
      const currentSong = hasData ? songList.value[currentIndex.value] : null;

      const lyricData = {
        type: 'song-change',
        song: currentSong
          ? {
            name: String(currentSong.name || currentSong.localName || '未知歌曲'),
            ar: Array.isArray(currentSong.ar) ? currentSong.ar.map((artist) => ({ name: String(artist.name || '未知艺术家') })) : [{ name: '未知艺术家' }],
            type: String(currentSong.type || 'online'),
          }
          : null,
        lyrics: Array.isArray(lyricsObjArr.value)
          ? lyricsObjArr.value.map((l) => ({
            lyric: String(l.lyric || ''),
            tlyric: String(l.tlyric || ''),
            rlyric: String(l.rlyric || ''),
            time: Number(l.time || 0),
          }))
          : [],
      };

      electronAPI.updateLyricData(lyricData);
    } catch (error) {
      (logger || console).error('发送桌面歌词数据错误:', error);
    }
  };

  const sendLyricProgress = () => {
    if (!isDesktopLyricOpen.value || !electronAPI) return;

    try {
      const playStateData = {
        type: 'play-state',
        playing: playing.value,
      };
      electronAPI.updateLyricData(playStateData);

      if (lyricsObjArr.value && lyricsObjArr.value.length > 0) {
        const progressData = {
          type: 'lyric-progress',
          currentIndex: currentLyricIndex.value,
          progress: progress.value,
          currentTime: (progress.value / 100) * time.value,
        };
        electronAPI.updateLyricData(progressData);
      }
    } catch (error) {
      // ignore
    }
  };

  const stopDesktopLyricSync = () => {
    if (lyricProgressInterval) {
      clearInterval(lyricProgressInterval);
      lyricProgressInterval = null;
    }
  };

  const startDesktopLyricSync = () => {
    stopDesktopLyricSync();
    if (isDesktopLyricOpen.value && playing.value) {
      lyricProgressInterval = setInterval(sendLyricProgress, 300);
    }
  };

  const stopLyricIndexCalculation = () => {
    if (lyricIndexInterval) {
      clearInterval(lyricIndexInterval);
      lyricIndexInterval = null;
    }
  };

  const startLyricIndexCalculation = () => {
    stopLyricIndexCalculation();
    if (playing.value) {
      lyricIndexInterval = setInterval(calculateLyricIndex, 200);
    }
  };

  const toggleDesktopLyric = async () => {
    if (!electronAPI) {
      return;
    }

    try {
      if (isDesktopLyricOpen.value) {
        const result = await electronAPI.closeLyricWindow();
        if (result && result.success) {
          playerStore.isDesktopLyricOpen = false;
        }
      } else {
        const result = await electronAPI.createLyricWindow();
        if (result && result.success) {
          playerStore.isDesktopLyricOpen = true;
          setTimeout(() => {
            sendCurrentLyricData();
          }, 200);
        }
      }
    } catch (error) {
      (logger || console).warn('桌面歌词窗口控制失败', error);
    }
  };

  if (electronAPI) {
    electronAPI.isLyricWindowVisible().then((isVisible) => {
      playerStore.isDesktopLyricOpen = isVisible;
    }).catch(() => {});

    electronAPI.getCurrentLyricData(() => {
      sendCurrentLyricData();
    });

    electronAPI.onDesktopLyricClosed(() => {
      playerStore.isDesktopLyricOpen = false;
    });
  }

  stops.push(watch(() => playing.value, (newVal) => {
    if (isDesktopLyricOpen.value) {
      sendLyricProgress();
    }

    if (newVal) {
      startLyricIndexCalculation();
      if (isDesktopLyricOpen.value) {
        startDesktopLyricSync();
      }
    } else {
      stopLyricIndexCalculation();
      stopDesktopLyricSync();
    }
  }));

  stops.push(watch(() => isDesktopLyricOpen.value, (newVal) => {
    if (newVal) {
      sendCurrentLyricData();
      if (playing.value) {
        startDesktopLyricSync();
      }
    } else {
      stopDesktopLyricSync();
    }
  }));

  stops.push(watch(() => currentIndex.value, () => {
    if (playing.value) {
      startLyricIndexCalculation();
    }
    if (isDesktopLyricOpen.value) {
      setTimeout(() => {
        sendCurrentLyricData();
      }, 500);
      if (playing.value) {
        startDesktopLyricSync();
      }
    }
  }));

  stops.push(watch(() => lyricsObjArr.value, (newLyrics, oldLyrics) => {
    if (isDesktopLyricOpen.value && newLyrics && newLyrics.length > 0) {
      const lyricsChanged = !oldLyrics ||
        oldLyrics.length !== newLyrics.length ||
        (newLyrics.length > 0 && oldLyrics.length > 0 &&
          newLyrics[0].lyric !== oldLyrics[0].lyric);

      if (lyricsChanged) {
        setTimeout(() => {
          sendCurrentLyricData();
        }, 50);
      }
    }
  }));

  stops.push(watch(() => currentLyricIndex.value, () => {
    if (isDesktopLyricOpen.value) {
      sendLyricProgress();
    }
  }));

  stops.push(watch(() => progress.value, () => {
    if (isDesktopLyricOpen.value) {
      sendLyricProgress();
    }
  }));

  stops.push(watch(() => lyric.value, () => {
    processLyricData();
    if (isDesktopLyricOpen.value) {
      setTimeout(() => {
        sendCurrentLyricData();
      }, 100);
    }
  }, { immediate: true }));

  const destroy = () => {
    stopLyricIndexCalculation();
    stopDesktopLyricSync();
    stops.forEach((stop) => {
      if (typeof stop === 'function') stop();
    });
  };

  if (typeof addCleanup === 'function') {
    addCleanup(destroy);
  }

  return {
    toggleDesktopLyric,
    destroy,
  };
}
