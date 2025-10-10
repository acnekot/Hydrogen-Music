<template>
    <div class="plugin-settings-view">
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
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getPluginSettingsPage, pluginSettingsVersionSignal } from '../plugins/pluginManager'

const route = useRoute()
const router = useRouter()

const containerRef = ref(null)
const activePage = ref(null)
const mountedPage = ref(null)
const isMissing = ref(false)
const cleanupRef = ref(null)

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
    if (!page || typeof page.mount !== 'function' || !containerRef.value) return

    mountedPage.value = page
    containerRef.value.innerHTML = ''
    await nextTick()

    try {
        const maybeCleanup = page.mount(containerRef.value)
        cleanupRef.value = typeof maybeCleanup === 'function' ? maybeCleanup : null
    } catch (error) {
        console.error('[PluginSettings] 渲染插件设置页面失败:', error)
        cleanupRef.value = null
        if (containerRef.value) {
            containerRef.value.innerHTML = '<div class="plugin-settings-error">渲染插件设置页面失败。</div>'
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
}, { immediate: true })

onBeforeUnmount(() => {
    unmountPage()
})

const goBack = () => {
    router.push({ name: 'settings' })
}
</script>

<style scoped>
.plugin-settings-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 32px 40px;
    color: var(--text-color, #1a1f2b);
    background: linear-gradient(180deg, rgba(242, 246, 255, 0.65), rgba(224, 232, 246, 0.9));
    overflow: auto;
}

.plugin-settings-header {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 24px;
}

.back-button {
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid rgba(92, 122, 170, 0.35);
    background: rgba(255, 255, 255, 0.85);
    color: rgba(28, 36, 50, 0.85);
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s ease;
}

.back-button:hover {
    background: rgba(255, 255, 255, 1);
}

.plugin-settings-title h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    color: rgba(28, 36, 50, 0.92);
}

.plugin-settings-title p {
    margin: 6px 0 0;
    font-size: 14px;
    color: rgba(28, 36, 50, 0.65);
}

.plugin-settings-body {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.plugin-settings-container {
    flex: 1;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(92, 122, 170, 0.28);
    box-shadow: 0 22px 48px rgba(20, 32, 58, 0.18);
    overflow: auto;
}

.plugin-settings-empty {
    margin: auto;
    text-align: center;
    padding: 48px 32px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.78);
    border: 1px dashed rgba(92, 122, 170, 0.4);
    box-shadow: 0 18px 42px rgba(20, 32, 58, 0.12);
}

.plugin-settings-empty p {
    margin: 0 0 16px;
    font-size: 15px;
    color: rgba(28, 36, 50, 0.72);
}

.back-link {
    padding: 8px 20px;
    border-radius: 6px;
    border: 1px solid rgba(92, 122, 170, 0.35);
    background: rgba(255, 255, 255, 0.92);
    color: rgba(28, 36, 50, 0.82);
    cursor: pointer;
    transition: background 0.2s ease;
}

.back-link:hover {
    background: rgba(255, 255, 255, 1);
}

.plugin-settings-error {
    padding: 48px 32px;
    text-align: center;
    color: rgba(196, 64, 64, 0.9);
}
</style>
