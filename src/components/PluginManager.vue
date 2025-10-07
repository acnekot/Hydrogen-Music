<template>
    <div class="plugin-manager">
        <div class="plugin-main" v-if="!activePluginId">
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
                    <div class="option-file-path" :title="pluginStore.pluginDirectory">
                        {{ pluginStore.pluginDirectory || '默认目录：应用根目录/plugins' }}
                    </div>
                    <button class="btn" @click="chooseDirectory">选择</button>
                    <button class="btn" @click="resetDirectory">重置</button>
                </div>
            </div>

            <div class="option">
                <div class="option-name">导入/管理</div>
                <div class="option-operation option-operation--actions">
                    <button class="btn" @click="importPlugin">导入插件</button>
                    <button class="btn" @click="refresh">刷新</button>
                    <button class="btn" @click="reloadPlayer">重载播放器</button>
                </div>
            </div>

            <div class="category-grid">
                <div class="category-item" v-for="category in categoryOptions" :key="category.key">
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
            </div>

            <div class="plugin-list">
                <div class="plugin-list-header">
                    <span>插件</span>
                    <span>版本</span>
                    <span>类别</span>
                    <span>操作</span>
                </div>
                <div v-if="pluginStore.plugins.length === 0" class="plugin-empty">暂无安装插件</div>
                <div v-for="plugin in pluginStore.plugins" :key="plugin.id" class="plugin-row">
                    <div class="plugin-meta">
                        <div class="plugin-title">{{ plugin.name }}</div>
                        <div class="plugin-description">{{ plugin.description || '暂无简介' }}</div>
                    </div>
                    <div class="plugin-version">{{ plugin.version }}</div>
                    <div class="plugin-categories">
                        <span v-for="category in plugin.categories" :key="category">{{ categoryLabels[category] || category }}</span>
                    </div>
                    <div class="plugin-actions">
                        <button class="btn" @click="openSettings(plugin)">插件设置</button>
                        <div class="toggle" @click="togglePlugin(plugin.id)">
                            <div class="toggle-off" :class="{ 'toggle-on-in': pluginStore.enabledPlugins[plugin.id] }">
                                {{ pluginStore.enabledPlugins[plugin.id] ? '已开启' : '已关闭' }}
                            </div>
                            <Transition name="toggle">
                                <div class="toggle-on" v-show="pluginStore.enabledPlugins[plugin.id]"></div>
                            </Transition>
                        </div>
                        <button class="btn btn--danger" @click="removePlugin(plugin.id)">删除</button>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="plugin-settings-panel">
            <div class="panel-header">
                <button class="back" @click="closeSettings">返回插件列表</button>
                <div class="panel-title">{{ selectedPlugin?.name }}</div>
            </div>
            <div class="panel-body">
                <section class="panel-section">
                    <h4>插件名字</h4>
                    <p>{{ selectedPlugin?.name }}</p>
                </section>
                <section class="panel-section">
                    <h4>介绍</h4>
                    <p>{{ selectedPlugin?.description || '暂无简介' }}</p>
                </section>
                <section class="panel-section">
                    <h4>相关功能</h4>
                    <component
                        v-if="settingsComponent"
                        :is="settingsComponent"
                        :plugin-id="activePluginId"
                    ></component>
                    <p v-else class="panel-placeholder">该插件未提供可配置的设置项。</p>
                </section>
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
    gap: 24px;
}

.option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.option:last-child {
    border-bottom: none;
}

.option-name {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.85);
}

.option-operation {
    display: flex;
    align-items: center;
    gap: 12px;
}

.option-operation--file {
    flex: 1;
    justify-content: flex-end;
    gap: 12px;
}

.option-file-path {
    flex: 1;
    max-width: 320px;
    text-align: right;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.65);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.option-operation--actions {
    gap: 10px;
}

.toggle {
    position: relative;
    width: 86px;
    height: 28px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    padding: 0 6px;
    cursor: pointer;
    user-select: none;
}

.toggle-off {
    flex: 1;
    text-align: center;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.65);
    transition: color 0.2s ease;
}

.toggle-on-in {
    color: #0ad5ff;
}

.toggle-on {
    position: absolute;
    left: 4px;
    top: 4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4ad5ff, #1a7bff);
}

.btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.85);
    border-radius: 6px;
    padding: 6px 16px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn:hover {
    border-color: #4ad5ff;
    color: #4ad5ff;
}

.btn--danger {
    border-color: rgba(255, 96, 96, 0.6);
    color: rgba(255, 152, 152, 0.9);
}

.btn--danger:hover {
    border-color: #ff5a5a;
    color: #ff7b7b;
}

.category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.category-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.plugin-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
}

.plugin-list-header,
.plugin-row {
    display: grid;
    grid-template-columns: 2fr 120px 160px 220px;
    align-items: center;
    gap: 18px;
}

.plugin-list-header {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.plugin-row {
    padding: 14px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.plugin-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.plugin-title {
    font-size: 15px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
}

.plugin-description {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
}

.plugin-version {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
}

.plugin-categories {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.plugin-categories span {
    background: rgba(255, 255, 255, 0.08);
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
}

.plugin-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: flex-end;
}

.plugin-empty {
    text-align: center;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    padding: 24px 0;
}

.plugin-settings-panel {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.panel-header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.back {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.85);
    border-radius: 6px;
    padding: 6px 16px;
    cursor: pointer;
}

.panel-title {
    font-size: 18px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
}

.panel-body {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.panel-section h4 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
}

.panel-section p {
    margin: 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
}

.panel-placeholder {
    margin: 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
}
</style>
