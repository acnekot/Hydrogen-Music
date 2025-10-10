import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/store/playerStore'

const regNewLine = /\n/
const timeTag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g
const regTimeOriginal = /\[\d{2}:\d{2}.\d{2,3}\]/

const parseTimeTag = (tag) => {
  const m = tag.match(/\[(\d{1,2}):(\d{2})\.?(\d{0,3})?\]/)
  if (!m) return 0
  const mm = parseInt(m[1] || '0', 10)
  const ss = parseInt(m[2] || '0', 10)
  const ms = m[3] ? parseInt((m[3] + '00').slice(0, 3), 10) : 0
  return mm * 60 + ss + ms / 1000
}

const formatLyricTimeOriginal = (time) => {
  const regMin = /.*:/
  const regSec = /:.*\./
  const regMs = /\./

  if (time.indexOf('.') === -1) time = time.replace(/(.*):/, '$1.')
  const min = parseInt(time.match(regMin)[0].slice(0, 2))
  let sec = parseInt(time.match(regSec)[0].slice(1, 3))
  const ms = time.slice(time.match(regMs).index + 1, time.match(regMs).index + 3)
  if (min !== 0) sec += min * 60
  return Number(`${sec}.${ms}`)
}

const buildMultiTrack = (songList, currentIndex, olrc, tlrc, rlrc) => {
  const byTime = new Map()

  const feed = (text, fieldOrder = ['lyric', 'tlyric', 'rlyric'], directField = null) => {
    if (!text || typeof text !== 'string') return
    const lines = text.split(/\r?\n/)
    for (const raw of lines) {
      if (!raw) continue
      const tags = Array.from(raw.matchAll(timeTag))
      if (!tags || tags.length === 0) continue
      const lyricText = raw.split(']').pop().trim()
      if (!lyricText) continue

      for (const t of tags) {
        const sec = parseTimeTag(t[0])
        const key = sec.toFixed(3)
        if (!byTime.has(key)) byTime.set(key, { time: sec, lyric: '', tlyric: '', rlyric: '', active: true })
        const obj = byTime.get(key)
        if (directField) {
          if (!obj[directField]) obj[directField] = lyricText
        } else {
          for (const f of fieldOrder) {
            if (!obj[f]) { obj[f] = lyricText; break }
          }
        }
      }
    }
  }

  feed(tlrc, ['tlyric', 'lyric', 'rlyric'], 'tlyric')
  feed(rlrc, ['rlyric', 'lyric', 'tlyric'], 'rlyric')
  feed(olrc, ['lyric', 'tlyric', 'rlyric'], null)

  let isPureMusic = false
  for (const obj of byTime.values()) {
    if (obj.lyric && obj.lyric.includes('纯音乐')) { isPureMusic = true; break }
    if (obj.tlyric && obj.tlyric.includes('纯音乐')) { isPureMusic = true; break }
  }
  if (isPureMusic) {
    const duration = Math.trunc((songList?.value?.[currentIndex?.value]?.dt || 0) / 1000)
    return [
      { lyric: '纯音乐，请欣赏', tlyric: '', rlyric: '', time: 0, active: true },
      { lyric: '', tlyric: '', rlyric: '', time: duration, active: true }
    ]
  }

  return Array.from(byTime.values()).sort((a, b) => a.time - b.time)
}

const lyricHandleOriginal = (songList, currentIndex, arr, tarr, rarr) => {
  let lyricArr = []
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === '') continue
    const obj = {}
    const lyctime = arr[i].match(regTimeOriginal)
    if (!lyctime) continue
    obj.lyric = arr[i].split(']')[1].trim() === '' ? '' : arr[i].split(']')[1].trim()
    if (!obj.lyric) continue
    if (obj.lyric.indexOf('纯音乐') !== -1 || obj.time > 4500) {
      const duration = Math.trunc(songList.value[currentIndex.value].dt / 1000)
      lyricArr = [
        { lyric: '纯音乐，请欣赏', time: 0 },
        { lyric: '', time: duration }
      ]
      return lyricArr
    }
    if (tarr && obj.lyric.indexOf('作词') === -1 && obj.lyric.indexOf('作曲') === -1) {
      for (let j = 0; j < tarr.length; j++) {
        if (tarr[j] === '') continue
        if (tarr[j].indexOf(lyctime[0].substring(0, lyctime[0].length - 1)) !== -1) {
          obj.tlyric = tarr[j].split(']')[1].trim() === '' ? '' : tarr[j].split(']')[1].trim()
          if (!obj.tlyric) {
            tarr.splice(j, 1)
            j--
            continue
          }
          tarr.splice(j, 1)
          break
        }
      }
    }
    if (rarr && obj.lyric.indexOf('作词') === -1 && obj.lyric.indexOf('作曲') === -1) {
      for (let k = 0; k < rarr.length; k++) {
        if (rarr[k] === '') continue
        if (rarr[k].indexOf(lyctime[0].substring(0, lyctime[0].length - 1)) !== -1) {
          obj.rlyric = rarr[k].split(']')[1].trim() === '' ? '' : rarr[k].split(']')[1].trim()
          if (!obj.rlyric) {
            rarr.splice(k, 1)
            k--
            continue
          }
          rarr.splice(k, 1)
          break
        }
      }
    }
    obj.time = lyctime ? formatLyricTimeOriginal(lyctime[0].slice(1, lyctime[0].length - 1)) : 0
    if (!(obj.lyric === '')) lyricArr.push(obj)
  }
  lyricArr.sort((a, b) => a.time - b.time)
  return lyricArr
}

export function createDesktopLyricService({ pinia, electronAPI }) {
  const playerStore = usePlayerStore(pinia)
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
    lyric
  } = storeToRefs(playerStore)

  let lyricProgressInterval = null
  let lyricIndexInterval = null
  let unwatchPlaying = null
  let unwatchIsDesktopLyricOpen = null
  let unwatchCurrentIndex = null
  let unwatchLyricsObjArr = null
  let unwatchCurrentLyricIndex = null
  let unwatchProgress = null
  let unwatchLyric = null

  const electron = electronAPI || (typeof window !== 'undefined' ? window.electronAPI : null)

  const calculateLyricIndex = () => {
    if (!lyricsObjArr.value || lyricsObjArr.value.length === 0 || !currentMusic.value) return
    const length = lyricsObjArr.value.length - 1
    const currentSeek = currentMusic.value.seek()
    const newIndex = lyricsObjArr.value.findIndex((item, index) => {
      if (index !== length) {
        return (currentSeek + 0.2) * 1000 < lyricsObjArr.value[index + 1].time * 1000
      }
      return (currentSeek + 0.2) * 1000 > item.time * 1000
    })
    if (newIndex !== -1 && newIndex !== currentLyricIndex.value) {
      playerStore.currentLyricIndex = newIndex
    }
  }

  const sendCurrentLyricData = () => {
    if (!electron) return
    try {
      const hasData = songList.value && songList.value.length > 0 && currentIndex.value >= 0
      const currentSong = hasData ? songList.value[currentIndex.value] : null
      const lyricData = {
        type: 'song-change',
        song: currentSong
          ? {
              name: String(currentSong.name || currentSong.localName || '未知歌曲'),
              ar: Array.isArray(currentSong.ar)
                ? currentSong.ar.map(artist => ({ name: String(artist.name || '未知艺术家') }))
                : [{ name: '未知艺术家' }],
              type: String(currentSong.type || 'online')
            }
          : null,
        lyrics: Array.isArray(lyricsObjArr.value)
          ? lyricsObjArr.value.map(lyric => ({
              lyric: String(lyric.lyric || ''),
              tlyric: String(lyric.tlyric || ''),
              rlyric: String(lyric.rlyric || ''),
              time: Number(lyric.time || 0)
            }))
          : []
      }
      electron.updateLyricData(lyricData)
    } catch (error) {
      console.error('发送桌面歌词数据错误:', error)
    }
  }

  const sendLyricProgress = () => {
    if (!isDesktopLyricOpen.value || !electron) return
    try {
      const playStateData = {
        type: 'play-state',
        playing: playing.value
      }
      electron.updateLyricData(playStateData)

      if (lyricsObjArr.value && lyricsObjArr.value.length > 0) {
        const progressData = {
          type: 'lyric-progress',
          currentIndex: currentLyricIndex.value,
          progress: progress.value,
          currentTime: (progress.value / 100) * time.value
        }
        electron.updateLyricData(progressData)
      }
    } catch (error) {
      // ignore errors silently
    }
  }

  const stopDesktopLyricSync = () => {
    if (lyricProgressInterval) {
      clearInterval(lyricProgressInterval)
      lyricProgressInterval = null
    }
  }

  const startDesktopLyricSync = () => {
    stopDesktopLyricSync()
    if (isDesktopLyricOpen.value && playing.value) {
      lyricProgressInterval = setInterval(sendLyricProgress, 300)
    }
  }

  const stopLyricIndexCalculation = () => {
    if (lyricIndexInterval) {
      clearInterval(lyricIndexInterval)
      lyricIndexInterval = null
    }
  }

  const startLyricIndexCalculation = () => {
    stopLyricIndexCalculation()
    if (playing.value) {
      lyricIndexInterval = setInterval(calculateLyricIndex, 200)
    }
  }

  const processLyricData = () => {
    if (!lyric.value) {
      playerStore.lyricsObjArr = []
      return
    }
    try {
      const hasTimeTag = lyric.value.lrc && typeof lyric.value.lrc.lyric === 'string' && lyric.value.lrc.lyric.indexOf('[') !== -1
      const curSong = songList.value && songList.value[currentIndex.value]
      const isLocal = !!(curSong && curSong.type === 'local')
      if (hasTimeTag) {
        const olrc = lyric.value.lrc?.lyric || ''
        const tlrc = lyric.value.tlyric && lyric.value.tlyric.lyric ? lyric.value.tlyric.lyric : ''
        const rlrc = lyric.value.romalrc && lyric.value.romalrc.lyric ? lyric.value.romalrc.lyric : ''
        const processed = isLocal
          ? buildMultiTrack(songList, currentIndex, olrc, tlrc, rlrc)
          : lyricHandleOriginal(
              songList,
              currentIndex,
              olrc.split(regNewLine),
              tlrc ? tlrc.split(regNewLine) : null,
              rlrc ? rlrc.split(regNewLine) : null
            )
        playerStore.lyricsObjArr = processed
      } else {
        const lines = (lyric.value.lrc?.lyric || '').split(regNewLine)
        const processed = []
        for (const line of lines) {
          if (!line || line.trim() === '') continue
          processed.push({ lyric: line.trim(), tlyric: '', rlyric: '', time: 0, active: true })
        }
        processed.push({
          lyric: '',
          tlyric: '',
          rlyric: '',
          time: Math.trunc((songList.value[currentIndex.value]?.dt || 0) / 1000),
          active: true
        })
        playerStore.lyricsObjArr = processed
      }
    } catch (error) {
      console.error('处理歌词数据出错:', error)
      playerStore.lyricsObjArr = []
    }
  }

  const toggleDesktopLyric = async () => {
    if (!electron) return
    try {
      if (isDesktopLyricOpen.value) {
        const result = await electron.closeLyricWindow()
        if (result && result.success) {
          playerStore.isDesktopLyricOpen = false
        }
      } else {
        const result = await electron.createLyricWindow()
        if (result && result.success) {
          playerStore.isDesktopLyricOpen = true
          setTimeout(() => {
            sendCurrentLyricData()
          }, 200)
        }
      }
    } catch (error) {
      console.error('切换桌面歌词窗口失败:', error)
    }
  }

  const init = () => {
    if (electron) {
      electron.isLyricWindowVisible?.().then(isVisible => {
        playerStore.isDesktopLyricOpen = !!isVisible
      })
      electron.getCurrentLyricData?.(() => {
        sendCurrentLyricData()
      })
      electron.onDesktopLyricClosed?.(() => {
        playerStore.isDesktopLyricOpen = false
      })
    }

    unwatchPlaying = watch(() => playing.value, (newVal) => {
      if (isDesktopLyricOpen.value) {
        sendLyricProgress()
      }
      if (newVal) {
        startLyricIndexCalculation()
        if (isDesktopLyricOpen.value) {
          startDesktopLyricSync()
        }
      } else {
        stopLyricIndexCalculation()
        stopDesktopLyricSync()
      }
    })

    unwatchIsDesktopLyricOpen = watch(() => isDesktopLyricOpen.value, (newVal) => {
      if (newVal) {
        sendCurrentLyricData()
        if (playing.value) {
          startDesktopLyricSync()
        }
      } else {
        stopDesktopLyricSync()
      }
    })

    unwatchCurrentIndex = watch(() => currentIndex.value, () => {
      if (playing.value) {
        startLyricIndexCalculation()
      }
      if (isDesktopLyricOpen.value) {
        setTimeout(() => {
          sendCurrentLyricData()
        }, 500)
        if (playing.value) {
          startDesktopLyricSync()
        }
      }
    })

    unwatchLyricsObjArr = watch(() => lyricsObjArr.value, (newLyrics, oldLyrics) => {
      if (isDesktopLyricOpen.value && newLyrics && newLyrics.length > 0) {
        const lyricsChanged = !oldLyrics ||
          oldLyrics.length !== newLyrics.length ||
          (newLyrics.length > 0 && oldLyrics.length > 0 && newLyrics[0].lyric !== oldLyrics[0].lyric)
        if (lyricsChanged) {
          setTimeout(() => {
            sendCurrentLyricData()
          }, 50)
        }
      }
    })

    unwatchCurrentLyricIndex = watch(() => currentLyricIndex.value, () => {
      if (isDesktopLyricOpen.value) {
        sendLyricProgress()
      }
    })

    unwatchProgress = watch(() => progress.value, () => {
      if (isDesktopLyricOpen.value) {
        sendLyricProgress()
      }
    })

    unwatchLyric = watch(() => lyric.value, () => {
      processLyricData()
      if (isDesktopLyricOpen.value) {
        setTimeout(() => {
          sendCurrentLyricData()
        }, 100)
      }
    })

    processLyricData()
  }

  const destroy = () => {
    stopLyricIndexCalculation()
    stopDesktopLyricSync()
    if (unwatchPlaying) unwatchPlaying()
    if (unwatchIsDesktopLyricOpen) unwatchIsDesktopLyricOpen()
    if (unwatchCurrentIndex) unwatchCurrentIndex()
    if (unwatchLyricsObjArr) unwatchLyricsObjArr()
    if (unwatchCurrentLyricIndex) unwatchCurrentLyricIndex()
    if (unwatchProgress) unwatchProgress()
    if (unwatchLyric) unwatchLyric()
  }

  return {
    init,
    destroy,
    toggleDesktopLyric,
    sendCurrentLyricData,
    sendLyricProgress
  }
}
