<template>
    <div class="plugin-panel" v-if="initialized">
        <header class="panel-header">
            <div class="title-block">
                <h2>插件系统</h2>
                <p>通过插件扩展主题、声音、歌词以及更多功能。</p>
            </div>
            <div class="toolbar">
                <label class="switch">
                    <input type="checkbox" :checked="pluginStore.pluginSystemEnabled" @change="handleToggleSystem" />
                    <span>启用插件</span>
                </label>
                <button @click="importPlugin">导入</button>
                <button @click="refreshPlugins">刷新</button>
                <button @click="reloadPlayer" :disabled="pluginStore.pendingSoftReload">重载播放器</button>
            </div>
        </header>

        <section class="directory">
            <div class="path">插件目录：<span>{{ pluginStore.pluginDirectory }}</span></div>
            <div class="dir-actions">
                <button @click="changeDirectory">修改目录</button>
                <button @click="openDirectory">打开目录</button>
            </div>
        </section>

        <section class="categories">
            <h3>功能分类</h3>
            <div class="category-grid">
                <label v-for="(enabled, key) in pluginStore.categoryEnabled" :key="key">
                    <input type="checkbox" :checked="enabled" @change="toggleCategory(key, $event.target.checked)" />
                    <span>{{ renderCategoryLabel(key) }}</span>
                </label>
            </div>
        </section>

        <section class="plugin-list">
            <div class="list-header">
                <span class="col-name">插件</span>
                <span class="col-version">版本</span>
                <span class="col-category">分类</span>
                <span class="col-actions">操作</span>
            </div>
            <div v-if="!pluginStore.plugins.length" class="empty">暂无安装插件</div>
            <div v-for="plugin in pluginStore.plugins" :key="plugin.id" class="plugin-item" :class="{ disabled: !pluginEnabled(plugin.id) }">
                <div class="col-name">
                    <div class="name">{{ plugin.name }}</div>
                    <div class="desc">{{ plugin.description }}</div>
                    <div v-if="pluginStore.pluginErrors.get(plugin.id)" class="error">插件异常：{{ pluginStore.pluginErrors.get(plugin.id).message }}</div>
                </div>
                <div class="col-version">{{ plugin.version }}</div>
                <div class="col-category">
                    <span v-for="cat in plugin.categories" :key="cat" class="tag">{{ renderCategoryLabel(cat) }}</span>
                </div>
                <div class="col-actions">
                    <button @click="openSettings(plugin)" :disabled="!hasSettings(plugin)">插件设置</button>
                    <label class="switch">
                        <input type="checkbox" :checked="pluginEnabled(plugin.id)" @change="togglePlugin(plugin, $event.target.checked)" />
                        <span>{{ pluginEnabled(plugin.id) ? '已启用' : '未启用' }}</span>
                    </label>
                    <button class="danger" @click="removePlugin(plugin)">删除</button>
                </div>
            </div>
        </section>

        <transition name="slide">
            <aside v-if="showSettings" class="settings-drawer">
                <header class="drawer-header">
                    <button class="back" @click="closeSettings">返回</button>
                    <div class="info">
                        <h3>{{ activePlugin?.name }}</h3>
                        <span>{{ activePlugin?.description }}</span>
                    </div>
                </header>
                <component
                    v-if="settingsComponent"
                    :is="settingsComponent"
                    :plugin="activePlugin"
                    :plugin-settings="pluginStore.getPluginSettings(activePlugin?.id || '')"
                ></component>
            </aside>
        </transition>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { usePluginStore } from '@/store/pluginStore';
import { pluginManager } from '@/plugins/pluginManager';
import { noticeOpen } from '@/utils/dialog';

const pluginStore = usePluginStore();
const initialized = computed(() => pluginStore.initialized);
const showSettings = ref(false);
const settingsComponent = ref(null);
const activePlugin = ref(null);

const pluginEnabled = pluginId => !!pluginStore.enabledPlugins.get(pluginId);
const hasSettings = plugin => pluginStore.settingsPanels.has(plugin.id);

const renderCategoryLabel = key => {
    const map = {
        thirdPartyApi: '第三方 API',
        theme: '主题',
        sound: '声音',
        integration: '无缝衔接',
        visual: '视觉',
        ui: '界面',
    };
    return map[key] || key;
};

onMounted(async () => {
    await pluginManager.initialize();
});

const handleToggleSystem = async event => {
    const enabled = event.target.checked;
    if (enabled && !pluginStore.firstConfirmationDismissed) {
        const confirmed = window.confirm('插件功能暂不完善，BUG 满天飞，确定打开？');
        if (!confirmed) {
            event.target.checked = false;
            return;
        }
        pluginStore.firstConfirmationDismissed = true;
    }
    await pluginManager.setPluginSystemEnabled(enabled);
};

const toggleCategory = async (key, value) => {
    await pluginManager.setCategoryEnabled(key, value);
};

const togglePlugin = async (plugin, value) => {
    try {
        await pluginManager.setPluginEnabled(plugin.id, value);
    } catch (err) {
        noticeOpen(err?.message || '插件切换失败', 2);
    }
};

const openSettings = async plugin => {
    if (!hasSettings(plugin)) {
        noticeOpen('插件未提供设置界面', 2);
        return;
    }
    try {
        const loader = pluginStore.settingsPanels.get(plugin.id);
        const module = await loader();
        settingsComponent.value = module.default || module;
        activePlugin.value = plugin;
        showSettings.value = true;
    } catch (err) {
        console.error('[Plugin] load settings failed', err);
        noticeOpen('加载插件设置失败', 2);
    }
};

const closeSettings = () => {
    showSettings.value = false;
    activePlugin.value = null;
    settingsComponent.value = null;
};

const importPlugin = async () => {
    const folder = await windowApi.plugins.chooseFolder();
    if (!folder) return;
    try {
        await pluginManager.importFrom(folder);
        noticeOpen('插件导入成功', 1);
    } catch (err) {
        noticeOpen(err?.message || '导入失败', 2);
    }
};

const refreshPlugins = async () => {
    await pluginManager.refresh();
};

const reloadPlayer = async () => {
    pluginManager.reload();
};

const changeDirectory = async () => {
    const dir = await windowApi.openFile();
    if (!dir) return;
    await pluginManager.setPluginDirectory(dir);
};

const openDirectory = async () => {
    const dir = pluginStore.pluginDirectory;
    if (!dir) return;
    windowApi.openLocalFolder(dir);
};

const removePlugin = async plugin => {
    const confirmed = window.confirm(`确定删除插件 “${plugin.name}” 吗？`);
    if (!confirmed) return;
    await pluginManager.remove(plugin.id);
};
</script>

<style scoped lang="scss">
.plugin-panel {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 18px 45px rgba(73, 120, 190, 0.08);
    position: relative;
}
.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    .title-block {
        h2 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        p {
            margin: 4px 0 0 0;
            color: rgba(0, 0, 0, 0.55);
        }
    }
    .toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        button {
            border: none;
            background: linear-gradient(135deg, #6bb7ff, #88d4ff);
            color: #fff;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            &:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 16px rgba(107, 183, 255, 0.2);
            }
            &:disabled {
                background: #c7d0dd;
                color: rgba(0, 0, 0, 0.4);
                cursor: not-allowed;
            }
        }
    }
}
.switch {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    input {
        width: 16px;
        height: 16px;
    }
}
.directory {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 12px;
    padding: 12px 16px;
    .path span {
        font-weight: 600;
        margin-left: 6px;
    }
    .dir-actions {
        display: flex;
        gap: 8px;
        button {
            border: none;
            background: #eef3ff;
            padding: 6px 12px;
            border-radius: 8px;
            cursor: pointer;
        }
    }
}
.categories {
    h3 {
        margin: 0 0 12px 0;
        font-size: 18px;
    }
    .category-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        label {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(0, 0, 0, 0.05);
            padding: 6px 12px;
            border-radius: 10px;
            input {
                width: 16px;
                height: 16px;
            }
        }
    }
}
.plugin-list {
    background: rgba(255, 255, 255, 0.86);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    .list-header {
        display: grid;
        grid-template-columns: 3fr 1fr 2fr 2fr;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.6);
    }
    .plugin-item {
        display: grid;
        grid-template-columns: 3fr 1fr 2fr 2fr;
        align-items: center;
        padding: 12px 0;
        border-top: 1px solid rgba(0, 0, 0, 0.05);
        &.disabled {
            opacity: 0.6;
        }
        .col-name {
            display: flex;
            flex-direction: column;
            gap: 4px;
            .name {
                font-weight: 600;
            }
            .desc {
                font-size: 13px;
                color: rgba(0, 0, 0, 0.55);
            }
            .error {
                font-size: 12px;
                color: #ff4757;
            }
        }
        .col-category {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            .tag {
                background: rgba(0, 0, 0, 0.08);
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 12px;
            }
        }
        .col-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            button {
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                background: #eaf1ff;
                cursor: pointer;
                &.danger {
                    background: #ffe1e1;
                    color: #d33c3c;
                }
            }
        }
    }
    .empty {
        text-align: center;
        padding: 20px 0;
        color: rgba(0, 0, 0, 0.5);
    }
}
.settings-drawer {
    position: absolute;
    top: 0;
    right: 0;
    width: 360px;
    height: 100%;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: -20px 0 40px rgba(46, 84, 140, 0.1);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    .drawer-header {
        display: flex;
        align-items: center;
        gap: 12px;
        .back {
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            background: #eef3ff;
            cursor: pointer;
        }
        .info {
            display: flex;
            flex-direction: column;
            h3 {
                margin: 0;
            }
            span {
                font-size: 13px;
                color: rgba(0, 0, 0, 0.55);
            }
        }
    }
}
.slide-enter-active,
.slide-leave-active {
    transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
    transform: translateX(100%);
}
</style>
