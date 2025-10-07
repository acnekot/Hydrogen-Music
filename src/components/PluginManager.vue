<template>
    <div class="plugin-manager">
        <div v-if="!activePluginId" class="plugin-main plugin-settings-root">
            <div class="plugin-section">
                <div class="plugin-option">
                    <div class="plugin-option-name">插件系统</div>
                    <div class="plugin-option-operation">
                        <div class="plugin-toggle" @click="handleToggleSystem">
                            <div class="plugin-toggle-inner" v-show="pluginStore.systemEnabled"></div>
                            <div
                                class="plugin-toggle-label"
                                :class="{ 'plugin-toggle-label--active': pluginStore.systemEnabled }"
                            >
                                {{ pluginStore.systemEnabled ? '已开启' : '已关闭' }}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="plugin-option">
                    <div class="plugin-option-name">插件目录</div>
                    <div class="plugin-option-operation plugin-option-operation--file">
                        <div class="plugin-info-text plugin-file-path" :title="pluginStore.pluginDirectory">
                            {{ pluginStore.pluginDirectory || '默认目录：应用根目录/plugins' }}
                        </div>
                        <div class="plugin-button" @click="chooseDirectory">选择</div>
                        <div class="plugin-button" @click="resetDirectory">重置</div>
                    </div>
                </div>

                <div class="plugin-option">
                    <div class="plugin-option-name">导入/管理</div>
                    <div class="plugin-option-operation">
                        <div class="plugin-button" @click="importPlugin">导入插件</div>
                        <div class="plugin-button" @click="refresh">刷新</div>
                        <div class="plugin-button" @click="reloadPlayer">重载播放器</div>
                    </div>
                </div>
            </div>

            <div class="plugin-section">
                <div class="plugin-section-title">功能大类</div>
                <div class="plugin-category-grid">
                    <div
                        v-for="category in categoryOptions"
                        :key="category.key"
                        class="plugin-option plugin-option--category"
                    >
                        <div class="plugin-option-name">{{ category.label }}</div>
                        <div class="plugin-option-operation">
                            <div
                                class="plugin-toggle plugin-toggle--small"
                                @click="toggleCategory(category.key)"
                            >
                                <div
                                    class="plugin-toggle-inner"
                                    v-show="pluginStore.categoriesEnabled[category.key]"
                                ></div>
                                <div
                                    class="plugin-toggle-label"
                                    :class="{ 'plugin-toggle-label--active': pluginStore.categoriesEnabled[category.key] }"
                                >
                                    {{ pluginStore.categoriesEnabled[category.key] ? '已开启' : '已关闭' }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="plugin-section">
                <div class="plugin-section-title">已安装插件</div>
                <div class="plugin-table">
                    <div class="plugin-table-row plugin-table-header">
                        <div class="plugin-table-col plugin-table-col--name">插件</div>
                        <div class="plugin-table-col plugin-table-col--version">版本</div>
                        <div class="plugin-table-col plugin-table-col--category">类别</div>
                        <div class="plugin-table-col plugin-table-col--actions">操作</div>
                    </div>
                    <div v-if="pluginStore.plugins.length === 0" class="plugin-table-empty">暂无安装插件</div>
                    <div
                        v-for="plugin in pluginStore.plugins"
                        :key="plugin.id"
                        class="plugin-table-row"
                    >
                        <div class="plugin-table-col plugin-table-col--name">
                            <div class="plugin-title">{{ plugin.name }}</div>
                            <div class="plugin-description">{{ plugin.description || '暂无简介' }}</div>
                        </div>
                        <div class="plugin-table-col plugin-table-col--version">{{ plugin.version }}</div>
                        <div class="plugin-table-col plugin-table-col--category">
                            {{ formatCategories(plugin.categories) }}
                        </div>
                        <div class="plugin-table-col plugin-table-col--actions">
                            <div class="plugin-actions">
                                <div class="plugin-button" @click="openSettings(plugin)">插件设置</div>
                                <div
                                    class="plugin-toggle plugin-toggle--small"
                                    @click="togglePlugin(plugin.id)"
                                >
                                    <div
                                        class="plugin-toggle-inner"
                                        v-show="pluginStore.enabledPlugins[plugin.id]"
                                    ></div>
                                    <div
                                        class="plugin-toggle-label"
                                        :class="{ 'plugin-toggle-label--active': pluginStore.enabledPlugins[plugin.id] }"
                                    >
                                        {{ pluginStore.enabledPlugins[plugin.id] ? '已开启' : '已关闭' }}
                                    </div>
                                </div>
                                <div class="plugin-button plugin-button--danger" @click="removePlugin(plugin.id)">删除</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="plugin-settings-panel plugin-settings-root">
            <div class="plugin-settings-header">
                <div class="plugin-button" @click="closeSettings">返回插件列表</div>
                <div class="plugin-settings-title">{{ selectedPlugin?.name }}</div>
            </div>

            <div class="plugin-section">
                <div class="plugin-option">
                    <div class="plugin-option-name">插件名字</div>
                    <div class="plugin-option-operation">
                        <div class="plugin-info-text">{{ selectedPlugin?.name }}</div>
                    </div>
                </div>
                <div class="plugin-option">
                    <div class="plugin-option-name">介绍</div>
                    <div class="plugin-option-operation plugin-option-operation--column">
                        <div class="plugin-info-text plugin-info-text--block">
                            {{ selectedPlugin?.description || '暂无简介' }}
                        </div>
                    </div>
                </div>
            </div>

            <div class="plugin-section">
                <div class="plugin-section-title">相关功能</div>
                <div class="plugin-settings-content">
                    <component
                        v-if="settingsComponent"
                        :is="settingsComponent"
                        :plugin-id="activePluginId"
                    ></component>
                    <div v-else class="plugin-info-text">该插件未提供可配置的设置项。</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, shallowRef, onMounted } from 'vue';
import { usePluginStore } from '../store/pluginStore';
import { dialogOpen, noticeOpen } from '../utils/dialog';

const pluginStore = usePluginStore();
const activePluginId = ref(null);
const settingsComponent = shallowRef(null);

const categoryOptions = [
    { key: 'api', label: '第三方 API' },
    { key: 'theme', label: '主题美化' },
    { key: 'sound', label: '声音音效' },
    { key: 'integration', label: '无缝衔接' },
];

const categoryLabels = {
    api: 'API',
    theme: '主题',
    sound: '音效',
    integration: '衔接',
};

const selectedPlugin = computed(() => pluginStore.plugins.find(item => item.id === activePluginId.value) || null);

onMounted(async () => {
    await pluginStore.initialize();
});

watch(activePluginId, async (id) => {
    if (!id) {
        settingsComponent.value = null;
        return;
    }
    settingsComponent.value = null;
    const component = await pluginStore.loadSettingsComponent(id);
    settingsComponent.value = component;
});

const handleToggleSystem = () => {
    if (!pluginStore.systemEnabled && !pluginStore.warningAcknowledged) {
        dialogOpen(
            '提示',
            '插件功能暂不完善，BUG满天飞，确定打开？',
            async (confirm) => {
                if (confirm) {
                    await pluginStore.setWarningAcknowledged();
                    await pluginStore.setSystemEnabled(true);
                }
            }
        );
        return;
    }
    pluginStore.setSystemEnabled(!pluginStore.systemEnabled);
};

const toggleCategory = (key) => {
    pluginStore.toggleCategory(key);
};

const togglePlugin = (id) => {
    if (pluginStore.enabledPlugins[id]) pluginStore.disablePlugin(id);
    else pluginStore.enablePlugin(id);
};

const openSettings = (plugin) => {
    activePluginId.value = plugin.id;
};

const closeSettings = () => {
    activePluginId.value = null;
};

const removePlugin = async (id) => {
    const result = await pluginStore.deletePlugin(id);
    if (!result?.success) {
        noticeOpen(result?.message || '删除插件失败', 2);
    }
};

const chooseDirectory = async () => {
    const dir = await pluginStore.choosePluginDirectory();
    if (dir) {
        noticeOpen('插件目录已更新', 2);
    }
};

const resetDirectory = async () => {
    await pluginStore.resetPluginDirectory();
    noticeOpen('已重置为默认目录', 2);
};

const importPlugin = async () => {
    if (typeof window === 'undefined' || !window.windowApi?.openFile) return;
    const dir = await window.windowApi.openFile();
    if (!dir) return;
    const result = await pluginStore.importPlugin(dir, { overwrite: true });
    if (result?.success) {
        noticeOpen('插件导入成功', 2);
    } else {
        noticeOpen(result?.message || '插件导入失败', 2);
    }
};

const refresh = async () => {
    await pluginStore.refreshPlugins();
    noticeOpen('插件列表已刷新', 2);
};

const reloadPlayer = async () => {
    const result = await pluginStore.reloadRenderer();
    if (result?.success) {
        noticeOpen('播放器即将重载', 2);
    } else {
        noticeOpen(result?.message || '重载失败', 2);
    }
};

const formatCategories = (categories) => {
    if (!Array.isArray(categories) || categories.length === 0) return '未分类';
    return categories.map(category => categoryLabels[category] || category).join(' / ');
};
</script>

<style scoped lang="scss">
@import '../styles/pluginCommon.scss';

.plugin-manager {
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.plugin-option-operation--file {
    flex-wrap: wrap;
}

.plugin-file-path {
    max-width: 420px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.plugin-category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
    padding: 16px;
    background-color: rgba(255, 255, 255, 0.2);
}

.plugin-option--category {
    margin-bottom: 0;
}

.plugin-table {
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(0, 0, 0, 0.2);
}

.plugin-table-row {
    display: grid;
    grid-template-columns: 2fr 120px 180px 320px;
    align-items: stretch;
    border-bottom: 1px solid rgba(0, 0, 0, 0.15);
}

.plugin-table-row:last-child {
    border-bottom: none;
}

.plugin-table-header {
    background-color: rgba(255, 255, 255, 0.35);
    padding: 12px 16px;
    font: 13px SourceHanSansCN-Bold;
    color: black;
}

.plugin-table-row:not(.plugin-table-header) {
    padding: 16px;
    background-color: rgba(255, 255, 255, 0.25);
}

.plugin-table-row:nth-child(2n + 1):not(.plugin-table-header) {
    background-color: rgba(255, 255, 255, 0.3);
}

.plugin-table-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font: 13px SourceHanSansCN-Bold;
    color: black;
}

.plugin-table-col--actions {
    justify-content: center;
}

.plugin-title {
    font-family: SourceHanSansCN-Bold;
    font-size: 15px;
    color: black;
}

.plugin-description {
    font: 12px SourceHanSansCN-Bold;
    color: rgba(0, 0, 0, 0.6);
}

.plugin-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.plugin-table-empty {
    padding: 24px 0;
    text-align: center;
    font: 13px SourceHanSansCN-Bold;
    color: rgba(0, 0, 0, 0.6);
}

.plugin-settings-header {
    display: flex;
    align-items: center;
    gap: 16px;
}

.plugin-settings-title {
    font-family: SourceHanSansCN-Bold;
    font-size: 20px;
    color: black;
}

.plugin-settings-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    background-color: rgba(255, 255, 255, 0.25);
}

.plugin-settings-content > * {
    width: 100%;
}

@media (max-width: 1200px) {
    .plugin-table-row {
        grid-template-columns: 2fr 120px 1fr;
    }

    .plugin-table-col--actions {
        grid-column: span 3;
    }
}
</style>
