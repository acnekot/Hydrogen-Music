<template>
    <div class="plugin-manager">
        <div v-if="!activePluginId" class="plugin-overview">
            <div class="option">
                <div class="option-name">插件系统</div>
                <div class="option-operation">
                    <div class="toggle" @click="handleToggleSystem">
                        <div class="toggle-off" :class="{ 'toggle-on-in': pluginStore.systemEnabled }">
                            {{ pluginStore.systemEnabled ? '已开启' : '已关闭' }}
                        </div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="pluginStore.systemEnabled"></div>
                        </Transition>
                    </div>
                </div>
            </div>

            <div class="option">
                <div class="option-name">插件目录</div>
                <div class="option-operation option-operation--file">
                    <div class="selected-folder" :title="pluginStore.pluginDirectory">
                        {{ pluginStore.pluginDirectory || '默认目录：应用根目录/plugins' }}
                    </div>
                    <div class="button" @click="chooseDirectory">选择</div>
                    <div class="button" @click="resetDirectory">重置</div>
                </div>
            </div>

            <div class="option">
                <div class="option-name">导入</div>
                <div class="option-operation option-operation--actions">
                    <div class="button" @click="importPlugin">导入插件</div>
                    <div class="button" @click="refresh">刷新</div>
                    <div class="button" @click="reloadPlayer">重载播放器</div>
                </div>
            </div>

            <div class="option option--category" v-for="category in categoryOptions" :key="category.key">
                <div class="option-name">{{ category.label }}</div>
                <div class="option-operation">
                    <div class="toggle" @click="toggleCategory(category.key)">
                        <div class="toggle-off" :class="{ 'toggle-on-in': pluginStore.categoriesEnabled[category.key] }">
                            {{ pluginStore.categoriesEnabled[category.key] ? '已开启' : '已关闭' }}
                        </div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="pluginStore.categoriesEnabled[category.key]"></div>
                        </Transition>
                    </div>
                </div>
            </div>

            <div class="plugin-table">
                <div class="plugin-table-header">
                    <div class="col-name">标题</div>
                    <div class="col-version">版本</div>
                    <div class="col-category">类别</div>
                    <div class="col-actions">操作</div>
                </div>
                <div v-if="pluginStore.plugins.length === 0" class="plugin-empty">暂无安装插件</div>
                <template v-else>
                    <div v-for="plugin in pluginStore.plugins" :key="plugin.id" class="plugin-row">
                        <div class="col-name">
                            <div class="plugin-title">{{ plugin.name }}</div>
                            <div class="plugin-description">{{ plugin.description || '暂无简介' }}</div>
                        </div>
                        <div class="col-version">{{ plugin.version }}</div>
                        <div class="col-category">
                            <template v-if="plugin.categories && plugin.categories.length">
                                <span v-for="category in plugin.categories" :key="category">
                                    {{ categoryLabels[category] || category }}
                                </span>
                            </template>
                            <span v-else>未分类</span>
                        </div>
                        <div class="col-actions">
                            <div class="button" @click="openSettings(plugin)">插件设置</div>
                            <div class="toggle" @click="togglePlugin(plugin.id)">
                                <div class="toggle-off" :class="{ 'toggle-on-in': pluginStore.enabledPlugins[plugin.id] }">
                                    {{ pluginStore.enabledPlugins[plugin.id] ? '已开启' : '已关闭' }}
                                </div>
                                <Transition name="toggle">
                                    <div class="toggle-on" v-show="pluginStore.enabledPlugins[plugin.id]"></div>
                                </Transition>
                            </div>
                            <div class="button option-add--remove" @click="removePlugin(plugin.id)">删除</div>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <div v-else class="plugin-settings">
            <div class="plugin-settings__header">
                <div class="button" @click="closeSettings">返回上一级</div>
                <div class="plugin-settings__title">{{ selectedPlugin?.name }}</div>
            </div>
            <div class="plugin-settings__body">
                <div class="plugin-settings__section">
                    <div class="section-label">插件名字</div>
                    <div class="section-content">{{ selectedPlugin?.name }}</div>
                </div>
                <div class="plugin-settings__section">
                    <div class="section-label">介绍</div>
                    <div class="section-content">{{ selectedPlugin?.description || '暂无简介' }}</div>
                </div>
                <div class="plugin-settings__section plugin-settings__features">
                    <div class="section-label">相关功能</div>
                    <div class="section-content">
                        <component
                            v-if="settingsComponent"
                            :is="settingsComponent"
                            :plugin-id="activePluginId"
                        ></component>
                        <p v-else class="section-placeholder">该插件未提供可配置的设置项。</p>
                    </div>
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
</script>

<style scoped lang="scss">
.plugin-manager {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.option--category {
    padding: 10px 0;
}

.option-name {
    font: 14px SourceHanSansCN-Bold;
    color: rgba(255, 255, 255, 0.85);
}

.option-operation {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.option-operation--file {
    flex: 1;
    justify-content: flex-end;
}

.option-operation--actions {
    justify-content: flex-end;
}

.selected-folder {
    min-width: 220px;
    max-width: 50vw;
    padding: 5px 10px;
    height: 34px;
    line-height: 24px;
    font: 13px SourceHanSansCN-Bold;
    color: black;
    background-color: rgba(255, 255, 255, 0.35);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    box-sizing: border-box;
}

.button {
    margin-right: 1px;
    padding: 5px 10px;
    min-width: 120px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.35);
    font: 13px SourceHanSansCN-Bold;
    color: black;
    box-sizing: border-box;
    transition: 0.2s;
    cursor: pointer;
}

.button:hover {
    opacity: 0.8;
    box-shadow: 0 0 0 1px black;
}

.option-add--remove {
    color: white;
    background-color: rgba(220, 53, 69, 0.8);
}

.option-add--remove:hover {
    box-shadow: 0 0 0 1px white;
}

.toggle {
    margin-right: 1px;
    height: 34px;
    width: 200px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
}

.toggle-on,
.toggle-off {
    padding: 5px 10px;
    width: 100%;
    height: 100%;
    font: 13px SourceHanSansCN-Bold;
    line-height: 24px;
    transition: 0.2s;
    box-sizing: border-box;
}

.toggle-off {
    background-color: rgba(255, 255, 255, 0.35);
    color: black;
}

.toggle-on {
    background-color: black;
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
}

.toggle-on-in {
    color: white;
    background-color: transparent;
}

.plugin-table {
    margin-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.plugin-table-header,
.plugin-row {
    display: grid;
    grid-template-columns: 2fr 120px 160px 260px;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.plugin-table-header {
    font: 13px SourceHanSansCN-Bold;
    color: rgba(255, 255, 255, 0.7);
}

.plugin-row .col-name {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.plugin-title {
    font: 15px SourceHanSansCN-Bold;
    color: rgba(255, 255, 255, 0.92);
}

.plugin-description {
    font: 12px SourceHanSansCN-Regular;
    color: rgba(255, 255, 255, 0.6);
}

.col-version {
    font: 13px SourceHanSansCN-Regular;
    color: rgba(255, 255, 255, 0.7);
}

.col-category {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font: 12px SourceHanSansCN-Regular;
    color: rgba(255, 255, 255, 0.75);
}

.col-category span {
    background-color: rgba(255, 255, 255, 0.15);
    padding: 2px 8px;
}

.col-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
}

.plugin-empty {
    padding: 18px 0;
    text-align: center;
    font: 13px SourceHanSansCN-Regular;
    color: rgba(255, 255, 255, 0.6);
}

.plugin-settings {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.plugin-settings__header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.plugin-settings__title {
    font: 16px SourceHanSansCN-Bold;
    color: rgba(255, 255, 255, 0.9);
}

.plugin-settings__body {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.plugin-settings__section {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.section-label {
    width: 100px;
    font: 14px SourceHanSansCN-Bold;
    color: rgba(255, 255, 255, 0.85);
    flex-shrink: 0;
}

.section-content {
    flex: 1;
    font: 13px SourceHanSansCN-Regular;
    color: rgba(255, 255, 255, 0.75);
}

.section-placeholder {
    margin: 0;
    font: 13px SourceHanSansCN-Regular;
    color: rgba(255, 255, 255, 0.5);
}

.toggle-enter-active,
.toggle-leave-active {
    transition: 0.2s;
}

.toggle-enter-from,
.toggle-leave-to {
    transform: translateX(-100%);
    opacity: 0;
}
</style>
