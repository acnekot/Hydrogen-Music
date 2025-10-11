<template>
    <div class="plugin-settings-view" :class="{ 'is-ready': isReady }">
        <div class="plugin-settings-header">
            <button class="back-button" type="button" @click="goBack">返回插件列表</button>
            <div class="plugin-settings-title">
                <h1>{{ activeTitle }}</h1>
                <p v-if="activeSubtitle">{{ activeSubtitle }}</p>
            </div>
        </div>
        <div class="plugin-settings-body">
            <div v-if="isMissing" class="plugin-settings-empty">
                <p>插件未启用或尚未提供设置页面。</p>
                <button class="back-link" type="button" @click="goBack">返回设置</button>
            </div>
            <div v-else ref="containerRef" class="plugin-settings-container"></div>
        </div>
    </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getPluginSettingsPage, pluginSettingsVersionSignal } from '../plugins/pluginManager'

const route = useRoute()
const router = useRouter()

const containerRef = ref(null)
const activePage = ref(null)
const mountedPage = ref(null)
const isMissing = ref(false)
const cleanupRef = ref(null)
const isReady = ref(false)

const pluginId = computed(() => {
    const id = route.params.pluginId
    return id ? String(id) : ''
})

const activeTitle = computed(() => activePage.value?.title || '插件设置')
const activeSubtitle = computed(() => activePage.value?.subtitle || '')

const unmountPage = () => {
    if (cleanupRef.value) {
        try {
            cleanupRef.value()
        } catch (error) {
            console.error('[PluginSettings] 卸载插件设置回调失败:', error)
        }
    }
    cleanupRef.value = null

    const page = mountedPage.value
    if (page && typeof page.unmount === 'function' && containerRef.value) {
        try {
            page.unmount(containerRef.value)
        } catch (error) {
            console.error('[PluginSettings] 执行插件自定义卸载失败:', error)
        }
    }
    mountedPage.value = null

    if (containerRef.value) {
        containerRef.value.innerHTML = ''
    }
}

const mountPage = async () => {
    const page = activePage.value
    if (!page || typeof page.mount !== 'function') return

    let container = containerRef.value
    if (!container) {
        await nextTick()
        container = containerRef.value
    }
    if (!container) return

    mountedPage.value = page
    container.innerHTML = ''
    await nextTick()

    try {
        const maybeCleanup = page.mount(container)
        cleanupRef.value = typeof maybeCleanup === 'function' ? maybeCleanup : null
    } catch (error) {
        console.error('[PluginSettings] 渲染插件设置页面失败:', error)
        cleanupRef.value = null
        if (container) {
            container.innerHTML = '<div class="plugin-settings-error">渲染插件设置页面失败。</div>'
        }
    }
}

const syncActivePage = () => {
    const id = pluginId.value
    if (!id) {
        if (activePage.value) {
            unmountPage()
            activePage.value = null
        }
        isMissing.value = true
        return
    }

    const page = getPluginSettingsPage(id)
    if (!page) {
        if (activePage.value) {
            unmountPage()
            activePage.value = null
        }
        isMissing.value = true
        return
    }

    isMissing.value = false
    if (activePage.value !== page) {
        unmountPage()
        activePage.value = page
        mountPage()
    } else if (!mountedPage.value && activePage.value) {
        mountPage()
    }
}

watch([pluginId, () => pluginSettingsVersionSignal.value], () => {
    syncActivePage()
}, { immediate: true, flush: 'post' })

onMounted(async () => {
    await nextTick()
    syncActivePage()
    requestAnimationFrame(() => {
        isReady.value = true
    })
})

onBeforeUnmount(() => {
    unmountPage()
})

const goBack = () => {
    router.push({ name: 'settings' })
}
</script>

<style scoped>
.plugin-settings-view {
    --plugin-settings-bg: var(--settings-shell-bg, var(--bg, #f4f6f8));
    --plugin-settings-surface: var(--settings-shell-surface, var(--panel, rgba(255, 255, 255, 0.92)));
    --plugin-settings-text: var(--settings-shell-text, var(--text, #111213));
    --plugin-settings-muted: var(--settings-shell-muted, var(--muted-text, rgba(17, 18, 19, 0.68)));
    --plugin-settings-border: var(--settings-shell-border, var(--border, rgba(0, 0, 0, 0.18)));
    --plugin-settings-button-bg: var(--settings-shell-button-bg, rgba(255, 255, 255, 0.88));
    --plugin-settings-button-hover-bg: var(--settings-shell-button-hover-bg, rgba(255, 255, 255, 1));
    --plugin-settings-shadow: var(--settings-shell-shadow, 0 22px 48px rgba(20, 32, 58, 0.18));
    --plugin-settings-empty-bg: var(--settings-shell-empty-bg, rgba(255, 255, 255, 0.78));
    --plugin-settings-empty-border: var(--settings-shell-empty-border, rgba(92, 122, 170, 0.32));
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 32px 40px;
    color: var(--plugin-settings-text);
    background: var(--plugin-settings-bg);
    overflow: auto;
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.35s ease, transform 0.35s ease;
}

.plugin-settings-view.is-ready {
    opacity: 1;
    transform: translateY(0);
}

.plugin-settings-header {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 24px;
}

.back-button {
    padding: 8px 16px;
    border-radius: 0;
    border: 1px solid var(--plugin-settings-border);
    background: var(--plugin-settings-button-bg);
    color: var(--plugin-settings-text);
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.back-button:hover {
    background: var(--plugin-settings-button-hover-bg);
}

.plugin-settings-title h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    color: var(--plugin-settings-text);
}

.plugin-settings-title p {
    margin: 6px 0 0;
    font-size: 14px;
    color: var(--plugin-settings-muted);
}

.plugin-settings-body {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.plugin-settings-container {
    flex: 1;
    border-radius: 0;
    background: var(--plugin-settings-surface);
    color: inherit;
    border: 1px solid var(--plugin-settings-border);
    box-shadow: var(--plugin-settings-shadow);
    overflow: auto;
}

.plugin-settings-empty {
    margin: auto;
    text-align: center;
    padding: 48px 32px;
    border-radius: 0;
    background: var(--plugin-settings-empty-bg);
    border: 1px dashed var(--plugin-settings-empty-border);
    box-shadow: var(--plugin-settings-shadow);
}

.plugin-settings-empty p {
    margin: 0 0 16px;
    font-size: 15px;
    color: var(--plugin-settings-muted);
}

.back-link {
    padding: 8px 20px;
    border-radius: 0;
    border: 1px solid var(--plugin-settings-border);
    background: var(--plugin-settings-button-bg);
    color: var(--plugin-settings-text);
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.back-link:hover {
    background: var(--plugin-settings-button-hover-bg);
}

.plugin-settings-error {
    padding: 48px 32px;
    text-align: center;
    color: rgba(196, 64, 64, 0.9);
}

:global(.dark) .plugin-settings-view {
    --plugin-settings-bg: var(--settings-shell-bg, var(--bg, #21262b));
    --plugin-settings-surface: var(--settings-shell-surface, var(--panel, rgba(52, 58, 68, 0.92)));
    --plugin-settings-text: var(--settings-shell-text, var(--text, #f1f3f5));
    --plugin-settings-muted: var(--settings-shell-muted, rgba(241, 243, 245, 0.72));
    --plugin-settings-border: var(--settings-shell-border, var(--border, rgba(255, 255, 255, 0.24)));
    --plugin-settings-button-bg: var(--settings-shell-button-bg, rgba(255, 255, 255, 0.12));
    --plugin-settings-button-hover-bg: var(--settings-shell-button-hover-bg, rgba(255, 255, 255, 0.18));
    --plugin-settings-shadow: var(--settings-shell-shadow, 0 18px 42px rgba(0, 0, 0, 0.55));
    --plugin-settings-empty-bg: var(--settings-shell-empty-bg, rgba(255, 255, 255, 0.08));
    --plugin-settings-empty-border: var(--settings-shell-empty-border, rgba(255, 255, 255, 0.22));
}
</style>
