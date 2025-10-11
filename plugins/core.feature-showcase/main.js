const mountShowcasePage = (container, context, store) => {
    container.innerHTML = '';
    const nodes = [];
    const subscriptions = [];

    const style = document.createElement('style');
    style.textContent = `
.hm-showcase-settings {
    position: relative;
    isolation: isolate;
    font-family: "Source Han Sans", "Microsoft Yahei", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--plugin-settings-text, var(--text, #111213));
    background: transparent;
    min-height: 100%;
    padding: 32px 36px 44px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 24px;
    line-height: 1.6;
    color-scheme: var(--plugin-settings-color-scheme, light);
}
.hm-showcase-settings::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 28px;
    background: var(--plugin-settings-bg, var(--settings-shell-bg, #f4f6f8));
    opacity: 0.94;
    filter: saturate(1.05);
    z-index: -1;
    pointer-events: none;
}
.dark .hm-showcase-settings {
    color-scheme: dark;
}
.dark .hm-showcase-settings::before {
    background: var(--plugin-settings-bg, var(--settings-shell-bg, #181c23));
    opacity: 0.9;
    filter: saturate(1.12) brightness(0.92);
}
.hm-showcase-card {
    background: var(--plugin-settings-surface, var(--panel, rgba(255, 255, 255, 0.92)));
    border: 1px solid var(--plugin-settings-border, var(--border, rgba(0, 0, 0, 0.18)));
    box-shadow: var(--plugin-settings-shadow, 0 22px 48px rgba(20, 32, 58, 0.18));
    border-radius: 20px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    backdrop-filter: blur(18px);
}
.hm-showcase-card h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}
.hm-showcase-meta {
    margin: 0;
    font-size: 14px;
    opacity: 0.78;
}
.hm-showcase-title {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
}
.hm-showcase-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.hm-showcase-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    background: var(--plugin-settings-button-bg, rgba(255, 255, 255, 0.82));
    border: 1px solid var(--plugin-settings-border, var(--border, rgba(0, 0, 0, 0.18)));
}
.hm-showcase-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}
.hm-showcase-button {
    padding: 8px 18px;
    border-radius: 12px;
    border: 1px solid var(--plugin-settings-border, var(--border, rgba(0, 0, 0, 0.18)));
    background: var(--plugin-settings-button-bg, rgba(255, 255, 255, 0.88));
    color: inherit;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.hm-showcase-button:hover,
.hm-showcase-button:focus-visible {
    background: var(--plugin-settings-button-hover-bg, rgba(255, 255, 255, 1));
    border-color: var(--plugin-settings-accent, #4c6edb);
    transform: translateY(-1px);
}
.hm-showcase-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
}
.hm-showcase-list li {
    display: flex;
    gap: 8px;
    font-size: 14px;
}
.hm-showcase-list span {
    opacity: 0.7;
    min-width: 88px;
}
.hm-showcase-guide {
    max-height: 180px;
    padding: 12px;
    border-radius: 12px;
    border: 1px dashed var(--plugin-settings-border, var(--border, rgba(0, 0, 0, 0.18)));
    background: var(--plugin-settings-surface, var(--panel, rgba(255, 255, 255, 0.92)));
    overflow: auto;
    white-space: pre-wrap;
    font-size: 13px;
}
@media (max-width: 720px) {
    .hm-showcase-settings {
        padding: 24px 24px 32px;
    }
    .hm-showcase-title {
        font-size: 20px;
    }
}
.dark .hm-showcase-card {
    background: var(--plugin-settings-surface, var(--panel, rgba(52, 58, 68, 0.92)));
    border-color: var(--plugin-settings-border, var(--border, rgba(255, 255, 255, 0.22)));
    box-shadow: var(--plugin-settings-shadow, 0 18px 42px rgba(0, 0, 0, 0.55));
}
.dark .hm-showcase-button {
    background: var(--plugin-settings-button-bg, rgba(255, 255, 255, 0.12));
}
.dark .hm-showcase-button:hover,
.dark .hm-showcase-button:focus-visible {
    background: var(--plugin-settings-button-hover-bg, rgba(255, 255, 255, 0.18));
}
`;
    container.appendChild(style);
    nodes.push(style);

    const root = document.createElement('div');
    root.className = 'hm-showcase-settings';
    root.innerHTML = `
        <div class="hm-showcase-card">
            <h2>插件信息</h2>
            <ul class="hm-showcase-list">
                <li><span>标识</span><strong data-field="meta-id">-</strong></li>
                <li><span>名称</span><strong data-field="meta-name">-</strong></li>
                <li><span>版本</span><strong data-field="meta-version">-</strong></li>
                <li><span>作者</span><strong data-field="meta-author">-</strong></li>
                <li><span>描述</span><strong data-field="meta-desc">-</strong></li>
            </ul>
        </div>
        <div class="hm-showcase-card">
            <h2>播放状态预览</h2>
            <p class="hm-showcase-title" data-field="now-playing">暂无播放</p>
            <p class="hm-showcase-meta" data-field="now-meta">点击播放音乐以查看示例数据</p>
            <div class="hm-showcase-badges">
                <span class="hm-showcase-badge" data-field="badge-playing">-</span>
                <span class="hm-showcase-badge" data-field="badge-visualizer">-</span>
                <span class="hm-showcase-badge" data-field="badge-background">-</span>
            </div>
            <div class="hm-showcase-actions">
                <button type="button" class="hm-showcase-button" data-action="toggle-visualizer">切换歌词可视化</button>
                <button type="button" class="hm-showcase-button" data-action="toggle-background">切换自定义背景</button>
                <button type="button" class="hm-showcase-button" data-action="show-notice">通知示例</button>
            </div>
        </div>
        <div class="hm-showcase-card">
            <h2>插件能力指南</h2>
            <p class="hm-showcase-meta">下方内容来源于插件自身的 guide.md 文件。</p>
            <pre class="hm-showcase-guide" data-field="guide">正在加载文档...</pre>
        </div>
    `;
    container.appendChild(root);
    nodes.push(root);

    const q = selector => root.querySelector(selector);
    const nowPlayingEl = q('[data-field="now-playing"]');
    const nowMetaEl = q('[data-field="now-meta"]');
    const playingBadge = q('[data-field="badge-playing"]');
    const visualizerBadge = q('[data-field="badge-visualizer"]');
    const backgroundBadge = q('[data-field="badge-background"]');
    const guideEl = q('[data-field="guide"]');

    const meta = context?.metadata || {};
    const setText = (element, value) => {
        if (element) element.textContent = value;
    };

    setText(q('[data-field="meta-id"]'), meta.id || '-');
    setText(q('[data-field="meta-name"]'), meta.name || '-');
    setText(q('[data-field="meta-version"]'), meta.version || '-');
    setText(q('[data-field="meta-author"]'), meta.author || '-');
    setText(q('[data-field="meta-desc"]'), meta.description || '');

    const resolveSongTitle = song => {
        if (!song) return '';
        if (typeof song.name === 'string') return song.name;
        if (song.song && typeof song.song.name === 'string') return song.song.name;
        return '';
    };

    const resolveArtists = song => {
        if (!song) return '';
        const artists = song.ar || song.artists || song.song?.ar || [];
        if (Array.isArray(artists) && artists.length) {
            return artists
                .map(artist => (typeof artist === 'string' ? artist : artist?.name))
                .filter(Boolean)
                .join(' / ');
        }
        if (typeof song.artist === 'string') return song.artist;
        return '';
    };

    const resolveAlbum = song => {
        if (!song) return '';
        if (song.al && typeof song.al.name === 'string') return song.al.name;
        if (song.album && typeof song.album.name === 'string') return song.album.name;
        if (song.song && song.song.al && typeof song.song.al.name === 'string') return song.song.al.name;
        return '';
    };

    const updatePlaybackInfo = () => {
        if (!store) {
            setText(nowPlayingEl, '未能访问播放器状态');
            setText(nowMetaEl, '插件未能获取 playerStore');
            setText(playingBadge, '状态未知');
            setText(visualizerBadge, '歌词可视化：未知');
            setText(backgroundBadge, '自定义背景：未知');
            return;
        }
        const list = Array.isArray(store.songList) ? store.songList : [];
        const index = Number.isInteger(store.currentIndex) ? store.currentIndex : Number(store.currentIndex || 0);
        const song = list && index >= 0 && index < list.length ? list[index] : null;
        const title = resolveSongTitle(song);
        const artists = resolveArtists(song);
        const album = resolveAlbum(song);

        if (title) {
            setText(nowPlayingEl, title);
            const pieces = [artists || '未知歌手'];
            if (album) pieces.push(album);
            setText(nowMetaEl, pieces.join(' · '));
        } else {
            setText(nowPlayingEl, '当前未在播放');
            setText(nowMetaEl, '播放音乐后即可看到实时信息。');
        }

        setText(playingBadge, store.playing ? '正在播放' : '已暂停');
        const visualizerActive = store.lyricVisualizer && store.lyricVisualizerPluginActive;
        setText(visualizerBadge, `歌词可视化：${visualizerActive ? '开启' : '关闭'}`);
        setText(backgroundBadge, `自定义背景：${store.customBackgroundEnabled ? '开启' : '关闭'}`);
    };

    updatePlaybackInfo();

    if (store?.$subscribe) {
        const unsubscribe = store.$subscribe(() => updatePlaybackInfo());
        subscriptions.push(() => unsubscribe());
    }

    const bindAction = (selector, handler) => {
        const element = q(selector);
        if (!element) return;
        const wrapped = event => {
            event.preventDefault();
            handler();
        };
        element.addEventListener('click', wrapped);
        subscriptions.push(() => element.removeEventListener('click', wrapped));
    };

    bindAction('[data-action="toggle-visualizer"]', () => {
        if (!store) return;
        const next = !store.lyricVisualizer;
        store.lyricVisualizer = next;
        updatePlaybackInfo();
        context.utils?.notice?.(next ? '已开启歌词可视化' : '已关闭歌词可视化', 2);
    });

    bindAction('[data-action="toggle-background"]', () => {
        if (!store) return;
        store.customBackgroundEnabled = !store.customBackgroundEnabled;
        updatePlaybackInfo();
        context.utils?.notice?.(store.customBackgroundEnabled ? '已启用自定义背景' : '已关闭自定义背景', 2);
    });

    bindAction('[data-action="show-notice"]', () => {
        context.utils?.notice?.('功能展示插件：通知示例', 2.5);
    });

    const loadGuide = async () => {
        if (!guideEl || !context?.plugin?.readText) return;
        try {
            const content = await context.plugin.readText('guide.md');
            guideEl.textContent = content.trim();
        } catch (error) {
            guideEl.textContent = `读取指南失败：${error?.message || error}`;
        }
    };

    loadGuide();

    return () => {
        while (subscriptions.length) {
            const dispose = subscriptions.pop();
            try {
                dispose?.();
            } catch (error) {
                console.error('[FeatureShowcasePlugin] 清理监听器失败:', error);
            }
        }
        nodes.forEach(node => {
            if (node && node.parentNode === container) {
                container.removeChild(node);
            }
        });
        container.innerHTML = '';
    };
};

module.exports = {
    activate(context) {
        const store = context?.stores?.player || null;
        const unregister = context.settings?.register?.({
            id: 'core.feature-showcase.settings',
            title: '插件功能展示',
            subtitle: '演示通知、Pinia 与设置页注入等常见能力',
            mount(container) {
                return mountShowcasePage(container, context, store);
            },
        });

        if (typeof unregister === 'function') {
            context.onCleanup(unregister);
        }

        context.utils?.notice?.('功能展示插件已启用', 2.5);
    },
};
