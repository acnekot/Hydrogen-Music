const PANEL_CLASS = 'hm-horizontal-lyrics-demo__root';
const STYLE_ID = 'hm-horizontal-lyrics-demo-style';

function createStyleElement() {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.${PANEL_CLASS} {
    position: fixed;
    left: 50%;
    bottom: 48px;
    transform: translateX(-50%);
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    width: min(760px, calc(100vw - 64px));
    height: 148px;
    background: linear-gradient(135deg, #1d222f 0%, #151a24 100%);
    border: 1px solid rgba(86, 117, 166, 0.45);
    box-shadow: 0 18px 48px rgba(10, 16, 32, 0.45);
    color: #e7ecf8;
    font-family: 'Orbitron', 'Share Tech Mono', 'Microgramma', 'Nunito Sans', 'Noto Sans CJK SC', sans-serif;
    letter-spacing: 0.06em;
    z-index: 9999;
    pointer-events: none;
}
.${PANEL_CLASS} *,
.${PANEL_CLASS} *::before,
.${PANEL_CLASS} *::after {
    box-sizing: border-box;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__sidebar {
    width: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, rgba(64, 90, 129, 0.28) 0%, rgba(37, 55, 83, 0.68) 100%);
    border-right: 1px solid rgba(86, 117, 166, 0.45);
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__play-icon {
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-left: 18px solid #b8d7ff;
    filter: drop-shadow(0 0 6px rgba(184, 215, 255, 0.5));
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__center {
    flex: 1;
    position: relative;
    background: #f3f6ff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 32px;
    overflow: hidden;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__line {
    position: relative;
    width: 100%;
    max-width: 480px;
    font-size: 26px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-align: center;
    color: #1a1f2b;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__text-base {
    display: block;
    position: relative;
    z-index: 1;
    color: #1a1f2b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__highlight {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(90deg, #121722 0%, #1b2232 100%);
    color: #eaf3ff;
    text-shadow: 0 0 8px rgba(108, 194, 255, 0.4);
    transform-origin: left center;
    transform: scaleX(0);
    opacity: 0.95;
    will-change: transform;
    overflow: hidden;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__highlight-text {
    padding: 4px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__highlight--active {
    animation: hm-horizontal-lyrics-demo-sweep var(--hm-horizontal-lyrics-duration, 2.4s) cubic-bezier(0.32, 0.04, 0.26, 1) forwards;
}
@keyframes hm-horizontal-lyrics-demo-sweep {
    0% {
        transform: scaleX(0);
    }
    12% {
        transform: scaleX(0.1);
    }
    100% {
        transform: scaleX(1);
    }
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__meta {
    width: 220px;
    padding: 22px 28px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
    background: linear-gradient(180deg, rgba(31, 43, 62, 0.72) 0%, rgba(21, 30, 44, 0.9) 100%);
    border-left: 1px solid rgba(86, 117, 166, 0.45);
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__meta-line {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: 500;
    color: rgba(199, 212, 238, 0.9);
    line-height: 1.4;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__meta-label {
    font-size: 11px;
    letter-spacing: 0.28em;
    color: rgba(149, 180, 226, 0.75);
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__meta-value {
    font-size: 13px;
    letter-spacing: 0.06em;
    color: #e5ecff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.${PANEL_CLASS} .hm-horizontal-lyrics-demo__placeholder {
    opacity: 0.45;
}
`;
    return style;
}

function buildMarkup() {
    const root = document.createElement('div');
    root.className = PANEL_CLASS;
    root.innerHTML = `
        <div class="hm-horizontal-lyrics-demo__sidebar">
            <div class="hm-horizontal-lyrics-demo__play-icon"></div>
        </div>
        <div class="hm-horizontal-lyrics-demo__center">
            <div class="hm-horizontal-lyrics-demo__line">
                <span class="hm-horizontal-lyrics-demo__text-base" data-role="lyric-text">咔啦咔啦啦……</span>
                <span class="hm-horizontal-lyrics-demo__highlight" data-role="lyric-highlight">
                    <span class="hm-horizontal-lyrics-demo__highlight-text" data-role="lyric-highlight-text">咔啦咔啦啦……</span>
                </span>
            </div>
        </div>
        <div class="hm-horizontal-lyrics-demo__meta">
            <div class="hm-horizontal-lyrics-demo__meta-line">
                <span class="hm-horizontal-lyrics-demo__meta-label">TRACK</span>
                <span class="hm-horizontal-lyrics-demo__meta-value" data-role="track-value">カラカラカラのカラ</span>
            </div>
            <div class="hm-horizontal-lyrics-demo__meta-line">
                <span class="hm-horizontal-lyrics-demo__meta-label">ARTIST</span>
                <span class="hm-horizontal-lyrics-demo__meta-value" data-role="artist-value">きくお / 初音ミク</span>
            </div>
        </div>
    `;
    return {
        root,
        elements: {
            text: root.querySelector('[data-role="lyric-text"]'),
            highlight: root.querySelector('[data-role="lyric-highlight"]'),
            highlightText: root.querySelector('[data-role="lyric-highlight-text"]'),
            track: root.querySelector('[data-role="track-value"]'),
            artist: root.querySelector('[data-role="artist-value"]'),
        },
    };
}

function pickSongFromState(state) {
    if (!state) return null;
    const { songList, currentIndex, listInfo, currentMusic } = state;
    const index = Number.isInteger(currentIndex) ? currentIndex : 0;

    if (Array.isArray(songList) && songList.length > 0) {
        return songList[Math.max(0, Math.min(index, songList.length - 1))] || null;
    }
    if (listInfo && Array.isArray(listInfo.tracks) && listInfo.tracks.length > 0) {
        return listInfo.tracks[Math.max(0, Math.min(index, listInfo.tracks.length - 1))] || null;
    }
    if (currentMusic && typeof currentMusic === 'object') {
        return currentMusic;
    }
    return null;
}

function getSongTitle(song) {
    if (!song) return '';
    return (
        song.name ||
        song.title ||
        song.songName ||
        song.filename ||
        song.trackName ||
        ''
    );
}

function readArtistName(artist) {
    if (!artist) return '';
    if (typeof artist === 'string') return artist;
    if (typeof artist === 'object') {
        return artist.name || artist.nickname || artist.title || '';
    }
    return '';
}

function getSongArtists(song) {
    if (!song) return '';
    if (Array.isArray(song.ar) && song.ar.length) {
        return song.ar.map(readArtistName).filter(Boolean).join(' / ');
    }
    if (Array.isArray(song.artists) && song.artists.length) {
        return song.artists.map(readArtistName).filter(Boolean).join(' / ');
    }
    if (Array.isArray(song.artist) && song.artist.length) {
        return song.artist.map(readArtistName).filter(Boolean).join(' / ');
    }
    if (Array.isArray(song.singers) && song.singers.length) {
        return song.singers.map(readArtistName).filter(Boolean).join(' / ');
    }
    if (song.ar) {
        const value = readArtistName(song.ar);
        if (value) return value;
    }
    if (song.artist) {
        const value = readArtistName(song.artist);
        if (value) return value;
    }
    if (song.singer) {
        const value = readArtistName(song.singer);
        if (value) return value;
    }
    return '';
}

function pickLyricLine(state) {
    if (!state || !Array.isArray(state.lyricsObjArr) || state.lyricsObjArr.length === 0) {
        return { text: '', index: -1, nextTime: null, currentTime: null };
    }
    const index = Number.isInteger(state.currentLyricIndex) ? state.currentLyricIndex : -1;
    const arr = state.lyricsObjArr;
    if (index < 0 || index >= arr.length) {
        return { text: '', index, nextTime: null, currentTime: null };
    }
    const current = arr[index] || {};
    let text = current.lyric || current.tlyric || current.rlyric || '';
    if (!text && typeof current === 'string') text = current;

    let nextTime = null;
    let currentTime = typeof current.time === 'number' ? current.time : null;
    for (let i = index + 1; i < arr.length; i += 1) {
        const candidate = arr[i];
        if (candidate && typeof candidate.time === 'number') {
            nextTime = candidate.time;
            break;
        }
    }
    return { text, index, nextTime, currentTime };
}

function computeHighlightDuration(currentTime, nextTime) {
    if (typeof currentTime === 'number' && typeof nextTime === 'number') {
        const delta = Math.max(0, nextTime - currentTime);
        if (Number.isFinite(delta) && delta > 0.05) {
            return Math.min(Math.max(delta, 0.8), 8);
        }
    }
    return 2.4;
}

function updateLyricElements(elements, payload) {
    const { text, duration, animate } = payload;
    const displayText = text || '……';
    if (elements.text) {
        elements.text.textContent = displayText;
        elements.text.classList.toggle('hm-horizontal-lyrics-demo__placeholder', !text);
    }
    if (!elements.highlight || !elements.highlightText) return;

    elements.highlightText.textContent = displayText;
    elements.highlight.style.setProperty('--hm-horizontal-lyrics-duration', `${duration}s`);

    elements.highlight.classList.remove('hm-horizontal-lyrics-demo__highlight--active');
    void elements.highlight.offsetWidth; // force reflow to restart animation
    if (animate) {
        elements.highlight.classList.add('hm-horizontal-lyrics-demo__highlight--active');
    }
}

function updateMetaElements(elements, { track, artist }) {
    if (elements.track) {
        elements.track.textContent = track || 'カラカラカラのカラ';
        elements.track.classList.toggle('hm-horizontal-lyrics-demo__placeholder', !track);
    }
    if (elements.artist) {
        elements.artist.textContent = artist || 'きくお / 初音ミク';
        elements.artist.classList.toggle('hm-horizontal-lyrics-demo__placeholder', !artist);
    }
}

module.exports = {
    activate(context) {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }
        const player = context && context.stores && context.stores.player;
        if (!player) {
            context?.utils?.notice?.('横向桌面歌词示例：无法读取播放器状态');
            return;
        }

        if (!document.getElementById(STYLE_ID)) {
            document.head.appendChild(createStyleElement());
        }

        const { root, elements } = buildMarkup();
        document.body.appendChild(root);

        let lastLyricKey = null;

        const render = (state) => {
            if (!state) return;
            const song = pickSongFromState(state);
            const title = getSongTitle(song);
            const artists = getSongArtists(song);
            updateMetaElements(elements, {
                track: title,
                artist: artists,
            });

            const { text, index, currentTime, nextTime } = pickLyricLine(state);
            const duration = computeHighlightDuration(currentTime, nextTime);
            const lyricKey = `${index}:${text}`;
            const shouldAnimate = text ? lyricKey !== lastLyricKey : false;
            updateLyricElements(elements, { text, duration, animate: shouldAnimate });
            if (shouldAnimate) {
                lastLyricKey = lyricKey;
            }
        };

        render(player.$state || player);

        const unsubscribe = player.$subscribe((_, state) => {
            render(state);
        });

        context.onCleanup(() => {
            try {
                unsubscribe?.();
            } catch (_) {
                // ignore
            }
            if (root && root.parentNode) {
                root.parentNode.removeChild(root);
            }
            const styleEl = document.getElementById(STYLE_ID);
            if (styleEl && styleEl.parentNode && document.querySelectorAll(`#${STYLE_ID}`).length <= 1) {
                styleEl.parentNode.removeChild(styleEl);
            }
        });
    },
};
