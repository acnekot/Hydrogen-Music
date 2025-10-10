const DEFAULT_CONFIG = Object.freeze({
    baseUrl: 'http://127.0.0.1:3000',
    preferredQuality: '128',
    searchType: 'song',
    autoPlay: true,
});

const STORAGE_PREFIX = 'plugin:community.kugou-music:';

const toLowerKeyMap = object => {
    const map = new Map();
    if (!object || typeof object !== 'object') return map;
    for (const [key, value] of Object.entries(object)) {
        map.set(String(key).toLowerCase(), value);
    }
    return map;
};

const safeJsonParse = (value, fallback = null) => {
    if (typeof value !== 'string') return fallback;
    try {
        return JSON.parse(value);
    } catch (_) {
        return fallback;
    }
};

const formatBytes = (bytes) => {
    const numeric = Number(bytes);
    if (!Number.isFinite(numeric) || numeric <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = numeric;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index += 1;
    }
    return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const createElement = (tag, className, textContent) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (typeof textContent === 'string') element.textContent = textContent;
    return element;
};

const normalizeSongInfo = (item) => {
    if (!item || typeof item !== 'object') return null;
    const lower = toLowerKeyMap(item);
    const hash = item.hash
        || item.Hash
        || item.FileHash
        || item.SongHash
        || lower.get('hash')
        || lower.get('filehash')
        || lower.get('hqfilehash')
        || null;
    const albumAudioId = item.album_audio_id
        || item.AlbumAudioId
        || item.albumaudioid
        || lower.get('album_audio_id')
        || lower.get('albumaudioid')
        || lower.get('mixsongid')
        || null;
    const albumId = item.album_id
        || item.AlbumID
        || item.albumid
        || lower.get('album_id')
        || lower.get('albumid')
        || null;
    const name = item.songname
        || item.SongName
        || item.song
        || item.name
        || item.filename
        || lower.get('songname')
        || lower.get('name')
        || lower.get('filename')
        || '未知歌曲';
    const artist = item.singername
        || item.SingerName
        || item.author_name
        || item.singer
        || item.artist
        || item.nickname
        || lower.get('singername')
        || lower.get('author_name')
        || lower.get('artist')
        || '未知歌手';
    const album = item.album_name
        || item.AlbumName
        || item.album
        || lower.get('album_name')
        || lower.get('album')
        || '';
    const duration = item.duration
        || item.Duration
        || item.duration_ms
        || lower.get('duration')
        || lower.get('duration_ms')
        || null;
    const privilege = item.privilege
        || item.Privilege
        || lower.get('privilege')
        || null;
    return {
        name,
        artist,
        album,
        hash,
        albumId,
        albumAudioId,
        duration,
        privilege,
        raw: item,
    };
};

const extractSongUrls = (payload) => {
    if (!payload || typeof payload !== 'object') return [];
    const data = payload.data || payload.body || payload;
    if (!data) return [];

    const list = Array.isArray(data) ? data
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data?.url) ? data.url
        : Array.isArray(data?.urls) ? data.urls
        : Array.isArray(data?.info) ? data.info
        : [];

    return list.map((item) => {
        if (!item || typeof item !== 'object') return null;
        const lower = toLowerKeyMap(item);
        const url = item.url || item.play_url || lower.get('url') || lower.get('play_url') || null;
        if (!url) return null;
        const quality = item.quality || item.type || lower.get('quality') || lower.get('type') || '';
        const bitrate = item.bitrate || item.BitRate || lower.get('bitrate') || lower.get('bitrate_display') || null;
        const size = item.filesize || item.size || lower.get('filesize') || lower.get('size') || null;
        return {
            url,
            quality,
            bitrate,
            size,
            raw: item,
        };
    }).filter(Boolean);
};

const extractLyricContent = (payload) => {
    if (!payload || typeof payload !== 'object') return '';
    const data = payload.body || payload.data || payload;
    if (!data) return '';
    if (typeof data.decodeContent === 'string' && data.decodeContent.trim()) return data.decodeContent;
    if (typeof data.lyrics === 'string') return data.lyrics;
    if (typeof data.content === 'string') {
        try {
            return atob(data.content);
        } catch (_) {
            return data.content;
        }
    }
    return '';
};

class KugouService {
    constructor(config, { notice }) {
        this.config = { ...DEFAULT_CONFIG, ...(config || {}) };
        this.notice = typeof notice === 'function' ? notice : (() => {});
        this.listeners = new Set();
    }

    get baseUrl() {
        const url = this.config.baseUrl || DEFAULT_CONFIG.baseUrl;
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }

    setConfig(patch) {
        this.config = { ...this.config, ...(patch || {}) };
        for (const listener of this.listeners) {
            try { listener(this.config); } catch (_) {}
        }
    }

    onConfigChange(handler) {
        if (typeof handler === 'function') this.listeners.add(handler);
        return () => this.listeners.delete(handler);
    }

    async request(endpoint, { params = {}, method = 'GET', body = null } = {}) {
        const base = this.baseUrl;
        const url = new URL(endpoint.startsWith('/') ? endpoint : `/${endpoint}`, base);
        if (method.toUpperCase() === 'GET') {
            Object.entries(params || {}).forEach(([key, value]) => {
                if (value === undefined || value === null) return;
                url.searchParams.set(key, value);
            });
        }

        const init = {
            method,
            credentials: 'include',
            headers: {},
        };

        if (method.toUpperCase() !== 'GET' && body) {
            init.headers['Content-Type'] = 'application/json';
            init.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        let response;
        try {
            response = await fetch(url.toString(), init);
        } catch (error) {
            throw new Error(`请求失败：${error?.message || error}`);
        }

        let text;
        try {
            text = await response.text();
        } catch (error) {
            throw new Error(`解析响应失败：${error?.message || error}`);
        }

        let data = null;
        try {
            data = JSON.parse(text);
        } catch (_) {
            data = text;
        }

        if (!response.ok) {
            const message = typeof data === 'object' && data !== null ? (data.msg || data.message || data.error) : null;
            throw new Error(message ? `HTTP ${response.status}: ${message}` : `HTTP ${response.status}`);
        }

        if (data && typeof data === 'object' && 'status' in data && Number(data.status) === 0) {
            const message = data.msg || data.message || '接口返回失败';
            throw new Error(message);
        }

        return data;
    }

    async ping() {
        return this.request('/server_now', { params: { timestamp: Date.now() } });
    }

    async searchSongs(keyword, options = {}) {
        if (!keyword || !keyword.trim()) throw new Error('请输入搜索关键词');
        const params = {
            keywords: keyword.trim(),
            type: options.type || this.config.searchType || DEFAULT_CONFIG.searchType,
            page: options.page || 1,
            pagesize: options.pageSize || 30,
        };
        const response = await this.request('/search', { params });
        const payload = response?.data || response?.body || response;
        const lists = Array.isArray(payload?.lists)
            ? payload.lists
            : Array.isArray(payload?.data?.lists)
                ? payload.data.lists
                : Array.isArray(payload?.info)
                    ? payload.info
                    : Array.isArray(payload?.list)
                        ? payload.list
                        : Array.isArray(payload?.data)
                            ? payload.data
                            : [];
        return {
            raw: response,
            items: lists.map(normalizeSongInfo).filter(Boolean),
        };
    }

    async getSongUrl(songInfo, preferredQuality) {
        if (!songInfo || !songInfo.hash) throw new Error('缺少歌曲哈希');
        const params = { hash: songInfo.hash };
        if (songInfo.albumAudioId) params.album_audio_id = songInfo.albumAudioId;
        if (preferredQuality && preferredQuality !== 'auto') params.quality = preferredQuality;
        const response = await this.request('/song/url/new', { params });
        const urls = extractSongUrls(response);
        if (!urls.length) {
            throw new Error('未获取到可用的播放链接');
        }
        return { raw: response, urls };
    }

    async getLyricByHash(hash) {
        if (!hash) throw new Error('缺少歌曲哈希');
        const metaResponse = await this.request('/search/lyric', { params: { hash, man: 'yes' } });
        const metaPayload = metaResponse?.data || metaResponse?.body || metaResponse;
        const candidates = Array.isArray(metaPayload?.info)
            ? metaPayload.info
            : Array.isArray(metaPayload?.candidates)
                ? metaPayload.candidates
                : Array.isArray(metaPayload?.data)
                    ? metaPayload.data
                    : [];
        if (!candidates.length) {
            throw new Error('未找到可用的歌词信息');
        }
        const candidate = candidates[0];
        const lower = toLowerKeyMap(candidate);
        const id = candidate.id || candidate.ID || lower.get('id');
        const accesskey = candidate.accesskey || candidate.AccessKey || lower.get('accesskey');
        if (!id || !accesskey) {
            throw new Error('歌词数据缺少必要参数');
        }
        const lyricResponse = await this.request('/lyric', { params: { id, accesskey, decode: 'true', fmt: 'lrc' } });
        return {
            rawMeta: metaResponse,
            raw: lyricResponse,
            lyric: extractLyricContent(lyricResponse),
        };
    }
}

class KugouSettingsPage {
    constructor(context, service, initialConfig, saveConfig) {
        this.context = context;
        this.service = service;
        this.saveConfig = typeof saveConfig === 'function' ? saveConfig : (() => {});
        this.config = { ...DEFAULT_CONFIG, ...(initialConfig || {}) };
        this.cleanupHandlers = [];

        this.root = null;
        this.styleNode = null;
        this.hostContainer = null;
        this.hostContainerStyles = null;
        this.searchInput = null;
        this.searchButton = null;
        this.resultsContainer = null;
        this.statusNode = null;
        this.audio = null;
        this.lyricContainer = null;
        this.qualitySelect = null;
        this.typeSelect = null;
        this.baseUrlInput = null;
        this.autoPlayToggle = null;
    }

    mount(container) {
        this.unmount();
        const root = createElement('div', 'kugou-plugin');
        const style = document.createElement('style');
        style.textContent = `
            .kugou-plugin { font-family: var(--font-family, 'Segoe UI', sans-serif); color: #e2e8f0; display: flex; flex-direction: column; gap: 20px; padding: 24px; background: radial-gradient(circle at top left, rgba(30,64,175,0.22), transparent 55%) #020617; min-height: 100%; box-sizing: border-box; }
            .kugou-plugin__section { border: 1px solid rgba(148,163,184,0.18); border-radius: 16px; padding: 20px; background: linear-gradient(145deg, rgba(15,23,42,0.92), rgba(15,23,42,0.7)); box-shadow: 0 24px 42px rgba(2,6,23,0.55); }
            .kugou-plugin__section h3 { margin: 0 0 12px; font-size: 18px; font-weight: 600; letter-spacing: 0.01em; color: #f8fafc; }
            .kugou-plugin__section-desc { margin: 0 0 18px; font-size: 13px; line-height: 1.7; color: rgba(226,232,240,0.72); }
            .kugou-plugin__form { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
            .kugou-plugin__form label { font-size: 13px; color: rgba(226,232,240,0.86); letter-spacing: 0.02em; }
            .kugou-plugin__form input[type="text"],
            .kugou-plugin__form select { min-width: 220px; padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(148,163,184,0.35); background: rgba(15,23,42,0.75); color: #f1f5f9; box-shadow: inset 0 1px 2px rgba(15,23,42,0.65); transition: border-color 0.18s ease, box-shadow 0.18s ease; }
            .kugou-plugin__form input[type="text"]:focus,
            .kugou-plugin__form select:focus { outline: none; border-color: rgba(96,165,250,0.9); box-shadow: 0 0 0 2px rgba(59,130,246,0.35); }
            .kugou-plugin__button { border: none; border-radius: 999px; padding: 8px 18px; font-size: 13px; cursor: pointer; background: linear-gradient(135deg, #38bdf8, #6366f1); color: #0f172a; font-weight: 600; box-shadow: 0 8px 24px rgba(56,189,248,0.35); transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease; }
            .kugou-plugin__button:hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(99,102,241,0.45); filter: brightness(1.05); }
            .kugou-plugin__button:active { transform: translateY(0); filter: brightness(0.95); }
            .kugou-plugin__button--secondary { background: rgba(59,130,246,0.16); color: #e2e8f0; box-shadow: none; border: 1px solid rgba(148,163,184,0.32); }
            .kugou-plugin__status { min-height: 22px; font-size: 13px; color: rgba(148,163,184,0.9); letter-spacing: 0.01em; }
            .kugou-plugin__results { display: flex; flex-direction: column; gap: 14px; max-height: 420px; overflow-y: auto; padding-right: 6px; }
            .kugou-plugin__results::-webkit-scrollbar { width: 6px; }
            .kugou-plugin__results::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 999px; }
            .kugou-plugin__result { border-radius: 14px; padding: 16px; background: rgba(30,41,59,0.75); border: 1px solid rgba(148,163,184,0.28); box-shadow: 0 14px 34px rgba(2,6,23,0.45); backdrop-filter: blur(4px); display: flex; flex-direction: column; gap: 12px; }
            .kugou-plugin__result-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
            .kugou-plugin__result-title { font-weight: 600; font-size: 15px; color: #f8fafc; letter-spacing: 0.01em; }
            .kugou-plugin__result-meta { font-size: 12px; color: rgba(226,232,240,0.65); display: flex; gap: 12px; flex-wrap: wrap; }
            .kugou-plugin__result-actions { display: flex; flex-wrap: wrap; gap: 10px; }
            .kugou-plugin__audio { width: 100%; border-radius: 10px; background: rgba(15,23,42,0.6); }
            .kugou-plugin__lyric { white-space: pre-wrap; background: rgba(15,23,42,0.65); border-radius: 12px; padding: 14px; font-size: 13px; color: rgba(226,232,240,0.82); max-height: 260px; overflow-y: auto; line-height: 1.6; }
            .kugou-plugin__config-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; align-items: end; }
            .kugou-plugin__config-item { display: flex; flex-direction: column; gap: 6px; }
            .kugou-plugin__badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; background: rgba(45,212,191,0.2); color: rgba(45,212,191,0.85); font-size: 11px; letter-spacing: 0.02em; }
            .kugou-plugin__badge + .kugou-plugin__badge { margin-left: 4px; }
            .kugou-plugin__inline-group { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        `;

        const configSection = createElement('section', 'kugou-plugin__section');
        const configTitle = createElement('h3', null, '服务配置');
        const configDescription = createElement('p', 'kugou-plugin__section-desc', '配置 KuGouMusicApi 的访问入口、首选音质与搜索类别。连接成功后即可直接在下方检索并试听歌曲。');
        const configForm = createElement('div', 'kugou-plugin__config-grid kugou-plugin__form');

        const baseUrlItem = createElement('div', 'kugou-plugin__config-item');
        const baseUrlLabel = createElement('label', null, 'KuGouMusicApi 地址');
        const baseUrlInput = createElement('input');
        baseUrlInput.type = 'text';
        baseUrlInput.placeholder = '例如：http://127.0.0.1:3000';
        baseUrlInput.value = this.config.baseUrl || DEFAULT_CONFIG.baseUrl;
        baseUrlItem.append(baseUrlLabel, baseUrlInput);

        const qualityItem = createElement('div', 'kugou-plugin__config-item');
        const qualityLabel = createElement('label', null, '首选音质');
        const qualitySelect = createElement('select');
        [
            { value: 'auto', text: '自动' },
            { value: '128', text: '标准 128kbps' },
            { value: '320', text: '高品 320kbps' },
            { value: 'lossless', text: '无损 FLAC/APE' },
            { value: 'piano', text: '魔法 - 钢琴' },
            { value: 'acappella', text: '魔法 - 人声伴奏分离' },
            { value: 'subwoofer', text: '魔法 - 乐器增强' },
            { value: 'ancient', text: '魔法 - 民乐' },
            { value: 'dj', text: '魔法 - DJ' },
        ].forEach((option) => {
            const opt = createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            qualitySelect.append(opt);
        });
        qualitySelect.value = this.config.preferredQuality || DEFAULT_CONFIG.preferredQuality;
        qualityItem.append(qualityLabel, qualitySelect);

        const typeItem = createElement('div', 'kugou-plugin__config-item');
        const typeLabel = createElement('label', null, '默认搜索类型');
        const typeSelect = createElement('select');
        [
            { value: 'song', text: '单曲' },
            { value: 'album', text: '专辑' },
            { value: 'author', text: '歌手' },
            { value: 'special', text: '歌单' },
            { value: 'mv', text: 'MV' },
            { value: 'lyric', text: '歌词' },
        ].forEach((option) => {
            const opt = createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            typeSelect.append(opt);
        });
        typeSelect.value = this.config.searchType || DEFAULT_CONFIG.searchType;
        typeItem.append(typeLabel, typeSelect);

        const autoplayItem = createElement('div', 'kugou-plugin__config-item');
        const autoplayLabel = createElement('label', null, '自动播放试听链接');
        const autoplayToggle = createElement('input');
        autoplayToggle.type = 'checkbox';
        autoplayToggle.checked = Boolean(this.config.autoPlay);
        autoplayItem.append(autoplayLabel, autoplayToggle);

        const pingButton = createElement('button', 'kugou-plugin__button kugou-plugin__button--secondary', '测试连接');

        const formFooter = createElement('div', 'kugou-plugin__inline-group');
        formFooter.append(pingButton);

        configForm.append(baseUrlItem, qualityItem, typeItem, autoplayItem);
        configSection.append(configTitle, configDescription, configForm, formFooter);

        const searchSection = createElement('section', 'kugou-plugin__section');
        const searchTitle = createElement('h3', null, '酷狗搜索与试听');
        const searchDescription = createElement('p', 'kugou-plugin__section-desc', '输入关键词后即可列出匹配的曲目。点击操作按钮可获取试听链接、复制直链或加载歌词。');
        const searchForm = createElement('div', 'kugou-plugin__form');
        const searchInput = createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '输入歌曲 / 歌手 / 歌单关键词';
        const searchButton = createElement('button', 'kugou-plugin__button', '开始搜索');
        const statusNode = createElement('div', 'kugou-plugin__status');
        const resultsContainer = createElement('div', 'kugou-plugin__results');

        searchForm.append(searchInput, searchButton);
        searchSection.append(searchTitle, searchDescription, searchForm, statusNode, resultsContainer);

        const playerSection = createElement('section', 'kugou-plugin__section');
        const playerTitle = createElement('h3', null, '试听与歌词');
        const playerDescription = createElement('p', 'kugou-plugin__section-desc', '播放最新获取的直链音频，并在下方查看或复制当前歌曲的歌词文本。');
        const audio = createElement('audio', 'kugou-plugin__audio');
        audio.controls = true;
        const lyricContainer = createElement('pre', 'kugou-plugin__lyric');
        lyricContainer.textContent = '歌词会显示在这里。';
        playerSection.append(playerTitle, playerDescription, audio, lyricContainer);

        root.append(configSection, searchSection, playerSection);
        container.innerHTML = '';
        const previousStyles = {
            background: container.style.background,
            color: container.style.color,
            padding: container.style.padding,
            overflowY: container.style.overflowY,
        };
        this.hostContainerStyles = previousStyles;
        this.hostContainer = container;
        container.style.background = '#020617';
        container.style.color = '#e2e8f0';
        container.style.padding = '0';
        container.style.overflowY = 'auto';
        container.append(style, root);
        this.styleNode = style;

        const applyConfig = () => {
            const nextConfig = {
                baseUrl: baseUrlInput.value.trim() || DEFAULT_CONFIG.baseUrl,
                preferredQuality: qualitySelect.value || DEFAULT_CONFIG.preferredQuality,
                searchType: typeSelect.value || DEFAULT_CONFIG.searchType,
                autoPlay: Boolean(autoplayToggle.checked),
            };
            this.config = nextConfig;
            this.service.setConfig(nextConfig);
            this.saveConfig(nextConfig);
        };

        const handleSearch = async () => {
            applyConfig();
            const keyword = searchInput.value.trim();
            if (!keyword) {
                this.updateStatus('请输入关键词', 'warn');
                return;
            }
            this.updateStatus('正在请求酷狗服务器…', 'info');
            resultsContainer.innerHTML = '';
            try {
                const result = await this.service.searchSongs(keyword, { type: this.config.searchType });
                if (!result.items.length) {
                    this.updateStatus('未找到匹配的结果。', 'info');
                    return;
                }
                this.updateStatus(`共找到 ${result.items.length} 条结果，可点击“获取播放链接”试听。`, 'success');
                for (const song of result.items) {
                    const card = this.renderResultCard(song, audio, lyricContainer);
                    resultsContainer.append(card);
                }
            } catch (error) {
                console.error('[KuGouPlugin] 搜索失败', error);
                this.updateStatus(`搜索失败：${error?.message || error}`, 'error');
                this.context.utils.notice?.('酷狗搜索请求失败');
            }
        };

        const handlePing = async () => {
            applyConfig();
            this.updateStatus('正在检测服务可用性…', 'info');
            try {
                const response = await this.service.ping();
                const serverTime = response?.data?.now || response?.now || response?.time;
                this.updateStatus(`服务可用。服务器时间：${serverTime || '未知'}`, 'success');
                this.context.utils.notice?.('KuGouMusicApi 服务连接成功');
            } catch (error) {
                console.error('[KuGouPlugin] 服务检测失败', error);
                this.updateStatus(`无法连接服务：${error?.message || error}`, 'error');
                this.context.utils.notice?.('KuGouMusicApi 服务不可用');
            }
        };

        const searchClickHandler = (event) => {
            event.preventDefault();
            handleSearch();
        };
        const pingClickHandler = (event) => {
            event.preventDefault();
            handlePing();
        };
        const searchKeydownHandler = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
            }
        };

        searchButton.addEventListener('click', searchClickHandler);
        pingButton.addEventListener('click', pingClickHandler);
        searchInput.addEventListener('keydown', searchKeydownHandler);

        this.cleanupHandlers.push(() => searchButton.removeEventListener('click', searchClickHandler));
        this.cleanupHandlers.push(() => pingButton.removeEventListener('click', pingClickHandler));
        this.cleanupHandlers.push(() => searchInput.removeEventListener('keydown', searchKeydownHandler));

        this.root = root;
        this.searchInput = searchInput;
        this.searchButton = searchButton;
        this.resultsContainer = resultsContainer;
        this.statusNode = statusNode;
        this.audio = audio;
        this.lyricContainer = lyricContainer;
        this.qualitySelect = qualitySelect;
        this.typeSelect = typeSelect;
        this.baseUrlInput = baseUrlInput;
        this.autoPlayToggle = autoplayToggle;

        this.updateStatus('配置完成，可直接搜索歌曲。', 'info');
    }

    renderResultCard(songInfo, audio, lyricContainer) {
        const card = createElement('div', 'kugou-plugin__result');
        const header = createElement('div', 'kugou-plugin__result-header');
        const title = createElement('div', 'kugou-plugin__result-title', `${songInfo.name} - ${songInfo.artist}`);
        const meta = createElement('div', 'kugou-plugin__result-meta');
        const hashBadge = createElement('span', 'kugou-plugin__badge', `Hash: ${songInfo.hash?.slice(0, 10) || '未知'}`);
        const albumBadge = createElement('span', 'kugou-plugin__badge', songInfo.album ? `专辑：${songInfo.album}` : '未收录专辑');
        const durationBadge = songInfo.duration ? createElement('span', 'kugou-plugin__badge', `时长：${Math.round(Number(songInfo.duration) / 1000)}s`) : null;

        meta.append(hashBadge, albumBadge);
        if (durationBadge) meta.append(durationBadge);
        header.append(title, meta);

        const actions = createElement('div', 'kugou-plugin__result-actions');
        const fetchButton = createElement('button', 'kugou-plugin__button kugou-plugin__button--secondary', '获取播放链接');
        const playButton = createElement('button', 'kugou-plugin__button kugou-plugin__button--secondary', '复制直链');
        const lyricButton = createElement('button', 'kugou-plugin__button kugou-plugin__button--secondary', '获取歌词');
        const rawToggle = createElement('button', 'kugou-plugin__button kugou-plugin__button--secondary', '查看原始数据');

        const rawDetails = createElement('pre', 'kugou-plugin__lyric');
        rawDetails.style.display = 'none';
        rawDetails.textContent = JSON.stringify(songInfo.raw, null, 2);

        const copyToClipboard = async (text) => {
            if (!text) throw new Error('没有可复制的内容');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const temp = document.createElement('textarea');
                temp.value = text;
                temp.style.position = 'fixed';
                temp.style.opacity = '0';
                document.body.appendChild(temp);
                temp.focus();
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
            }
        };

        const handleFetchUrl = async () => {
            this.updateStatus('正在获取播放链接…', 'info');
            try {
                const { urls } = await this.service.getSongUrl(songInfo, this.config.preferredQuality);
                if (!urls.length) {
                    this.updateStatus('未获取到有效的播放链接。', 'warn');
                    return;
                }
                const best = urls.find((item) => item.url) || urls[0];
                audio.src = best.url;
                if (this.config.autoPlay) {
                    try { await audio.play(); } catch (_) {}
                }
                this.updateStatus(`已获取到音质 ${best.quality || '未知'} 的播放地址。`, 'success');
            } catch (error) {
                console.error('[KuGouPlugin] 获取播放链接失败', error);
                this.updateStatus(`获取播放链接失败：${error?.message || error}`, 'error');
            }
        };

        const handleCopyUrl = async () => {
            this.updateStatus('正在请求播放链接以便复制…', 'info');
            try {
                const { urls } = await this.service.getSongUrl(songInfo, this.config.preferredQuality);
                if (!urls.length) {
                    this.updateStatus('未获取到可复制的链接。', 'warn');
                    return;
                }
                const best = urls.find((item) => item.url) || urls[0];
                await copyToClipboard(best.url);
                this.updateStatus('已复制播放链接到剪贴板。', 'success');
                this.context.utils.notice?.('播放链接已复制');
            } catch (error) {
                console.error('[KuGouPlugin] 复制链接失败', error);
                this.updateStatus(`复制链接失败：${error?.message || error}`, 'error');
            }
        };

        const handleLyric = async () => {
            this.updateStatus('正在请求歌词…', 'info');
            try {
                const lyricResult = await this.service.getLyricByHash(songInfo.hash);
                const lyric = lyricResult.lyric || '未获取到歌词内容。';
                lyricContainer.textContent = lyric;
                this.updateStatus('歌词加载完成。', 'success');
            } catch (error) {
                console.error('[KuGouPlugin] 获取歌词失败', error);
                this.updateStatus(`获取歌词失败：${error?.message || error}`, 'error');
            }
        };

        const handleRawToggle = () => {
            const visible = rawDetails.style.display !== 'none';
            rawDetails.style.display = visible ? 'none' : 'block';
            rawToggle.textContent = visible ? '查看原始数据' : '隐藏原始数据';
        };

        fetchButton.addEventListener('click', handleFetchUrl);
        playButton.addEventListener('click', handleCopyUrl);
        lyricButton.addEventListener('click', handleLyric);
        rawToggle.addEventListener('click', handleRawToggle);

        this.cleanupHandlers.push(() => fetchButton.removeEventListener('click', handleFetchUrl));
        this.cleanupHandlers.push(() => playButton.removeEventListener('click', handleCopyUrl));
        this.cleanupHandlers.push(() => lyricButton.removeEventListener('click', handleLyric));
        this.cleanupHandlers.push(() => rawToggle.removeEventListener('click', handleRawToggle));

        actions.append(fetchButton, playButton, lyricButton, rawToggle);
        card.append(header, actions, rawDetails);
        return card;
    }

    updateStatus(message, type = 'info') {
        if (!this.statusNode) return;
        const colors = {
            info: 'rgba(96,165,250,0.95)',
            success: 'rgba(16,185,129,0.95)',
            warn: 'rgba(234,179,8,0.95)',
            error: 'rgba(248,113,113,0.95)',
        };
        this.statusNode.style.color = colors[type] || colors.info;
        this.statusNode.textContent = message || '';
    }

    unmount() {
        for (const handler of this.cleanupHandlers.splice(0)) {
            try { handler(); } catch (_) {}
        }
        if (this.styleNode?.parentNode) {
            this.styleNode.parentNode.removeChild(this.styleNode);
        }
        if (this.root?.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
        if (this.hostContainer) {
            const styles = this.hostContainerStyles || {};
            this.hostContainer.style.background = styles.background || '';
            this.hostContainer.style.color = styles.color || '';
            this.hostContainer.style.padding = styles.padding || '';
            this.hostContainer.style.overflowY = styles.overflowY || '';
        }
        this.styleNode = null;
        this.hostContainer = null;
        this.hostContainerStyles = null;
        this.root = null;
        this.searchInput = null;
        this.searchButton = null;
        this.resultsContainer = null;
        this.statusNode = null;
        this.audio = null;
        this.lyricContainer = null;
        this.qualitySelect = null;
        this.typeSelect = null;
        this.baseUrlInput = null;
        this.autoPlayToggle = null;
    }
}

const loadConfig = (pluginId) => {
    if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };
    const raw = window.localStorage?.getItem(`${STORAGE_PREFIX}${pluginId}:config`);
    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...parsed };
};

const saveConfig = (pluginId, config) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${pluginId}:config`, JSON.stringify(config));
    } catch (error) {
        console.warn('[KuGouPlugin] 保存配置失败', error);
    }
};

module.exports = {
    activate(context) {
        const pluginId = context?.metadata?.id || 'community.kugou-music';
        const initialConfig = loadConfig(pluginId);
        const service = new KugouService(initialConfig, context.utils || {});
        const page = new KugouSettingsPage(
            context,
            service,
            initialConfig,
            (nextConfig) => saveConfig(pluginId, nextConfig),
        );

        if (typeof window !== 'undefined') {
            const globalKey = '__hydrogen_kugou_service__';
            if (!window[globalKey]) window[globalKey] = service;
            context.onCleanup(() => {
                if (window[globalKey] === service) {
                    try { delete window[globalKey]; } catch (_) { window[globalKey] = undefined; }
                }
            });
        }

        const unregister = context.settings.register({
            id: `${pluginId}.settings`,
            title: '酷狗音乐 API',
            subtitle: '连接 KuGouMusicApi 服务，在应用内搜索并试听酷狗资源',
            mount: (container) => page.mount(container),
            unmount: () => page.unmount(),
        });

        context.onCleanup(() => {
            try { unregister?.(); } catch (_) {}
            page.unmount();
        });

        context.utils.notice?.('酷狗音乐插件已启用');
    },
    deactivate(context) {
        context.utils.notice?.('酷狗音乐插件已禁用');
    },
};
