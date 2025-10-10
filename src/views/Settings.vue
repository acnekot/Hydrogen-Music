<script setup>
import { computed, ref, onActivated, watch, reactive } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { logout } from '../api/user';
import { noticeOpen, dialogOpen } from '../utils/dialog';
import { initSettings } from '../utils/initApp';
import { getVipInfo } from '../api/user';
import { isLogin } from '../utils/authority';
import { useUserStore } from '../store/userStore';
import { usePlayerStore } from '../store/playerStore';
import Selector from '../components/Selector.vue';
import UpdateDialog from '../components/UpdateDialog.vue';
import { setTheme, getSavedTheme } from '../utils/theme';
import { reloadPluginSystem, pluginSettingsVersionSignal, hasPluginSettingsPage } from '../plugins/pluginManager';

const router = useRouter();
const userStore = useUserStore();
const playerStore = usePlayerStore();

const vipInfo = ref(null);
const musicLevel = ref('standard');
const musicLevelOptions = ref([
    {
        label: '标准',
        value: 'standard',
    },
    {
        label: '较高',
        value: 'higher',
    },
    {
        label: '极高',
        value: 'exhigh',
    },
    {
        label: '无损',
        value: 'lossless',
    },
    {
        label: 'Hi-Res',
        value: 'hires',
    },
]);
const lyricSize = ref(20);
const tlyricSize = ref(13);
const rlyricSize = ref(12);
const lyricInterlude = ref(13);
const globalShortcuts = ref(false);
const quitApp = ref('minimize');
const quitAppOptions = ref([
    {
        label: '最小化至托盘',
        value: 'minimize',
    },
    {
        label: '直接退出',
        value: 'quit',
    },
]);
const theme = ref('system');
const themeOptions = ref([
    { label: '跟随系统', value: 'system' },
    { label: '浅色', value: 'light' },
    { label: '深色', value: 'dark' },
]);
const downloadFolder = ref(null);
const videoFolder = ref(null);
const localFolder = ref([]);
const shortcutsList = ref(null);
const selectedShortcut = ref(null);
const newShortcut = ref([]);
const shortcutCharacter = ['=', '-', '~', '@', '#', '$', '[', ']', ';', "'", ',', '.', '/', '!'];

// 更新相关状态
const showUpdateDialog = ref(false);
const newVersion = ref('');

const plugins = ref([]);
const pluginLoading = ref(false);
const pluginImporting = ref(false);
const appReloading = ref(false);
const pluginProcessing = reactive({});
const pluginApiAvailable = computed(() => typeof windowApi !== 'undefined' && typeof windowApi.listPlugins === 'function');
const pluginDirectoryApiAvailable = computed(
    () =>
        typeof windowApi !== 'undefined' &&
        typeof windowApi.getPluginDirectory === 'function' &&
        typeof windowApi.setPluginDirectory === 'function' &&
        typeof windowApi.choosePluginDirectory === 'function'
);
const pluginList = computed(() =>
    [...plugins.value].sort((a, b) => (b.importTime || 0) - (a.importTime || 0))
);
const pluginDirectory = ref('');
const pluginDirectoryDefault = ref('');
const pluginDirectoryLoading = ref(false);
const pluginDirectoryDisplay = computed(() => pluginDirectory.value || pluginDirectoryDefault.value || '未配置');
const isPluginDirectoryCustomized = computed(() => {
    const current = pluginDirectory.value?.trim?.() || '';
    const fallback = pluginDirectoryDefault.value?.trim?.() || '';
    if (!fallback) return Boolean(current);
    if (!current) return false;
    return current !== fallback;
});
const canResetPluginDirectory = computed(
    () =>
        pluginDirectoryApiAvailable.value &&
        Boolean(pluginDirectoryDefault.value) &&
        isPluginDirectoryCustomized.value
);
const pluginSettingsVersion = pluginSettingsVersionSignal;

if (isLogin()) {
    getVipInfo().then(result => {
        vipInfo.value = result.data;
    });
}
onActivated(() => {
    windowApi.getSettings().then(settings => {
        if (!settings) return;
        musicLevel.value = settings.music.level;
        lyricSize.value = settings.music.lyricSize;
        tlyricSize.value = settings.music.tlyricSize;
        rlyricSize.value = settings.music.rlyricSize;
        lyricInterlude.value = settings.music.lyricInterlude;
        videoFolder.value = settings.local.videoFolder;
        downloadFolder.value = settings.local.downloadFolder;
        localFolder.value = settings.local.localFolder;
        shortcutsList.value = settings.shortcuts;
        globalShortcuts.value = settings.other.globalShortcuts;
        quitApp.value = settings.other.quitApp;
    });

    // Initialize theme selection
    try {
        theme.value = getSavedTheme();
    } catch (_) {
        theme.value = 'system';
    }
    
    // 设置更新事件监听器
    setupUpdateListeners();

    if (pluginApiAvailable.value) {
        loadPlugins();
    } else {
        plugins.value = [];
    }
    if (pluginDirectoryApiAvailable.value) {
        loadPluginDirectory();
    } else {
        pluginDirectory.value = '';
    }
});

// 设置更新监听器
const setupUpdateListeners = () => {
    // 监听手动更新检查结果（不显示大窗弹出）
    windowApi.manualUpdateAvailable((version) => {
        newVersion.value = version;
        // 手动检查时直接在UpdateDialog中显示结果，不触发大窗弹出
    });
};

const setPluginProcessing = (id, state) => {
    if (!id) return;
    if (state) {
        pluginProcessing[id] = true;
    } else {
        delete pluginProcessing[id];
    }
};

const isPluginBusy = (id) => Boolean(id && pluginProcessing[id]);

const loadPlugins = async (showError = true) => {
    if (!pluginApiAvailable.value) {
        plugins.value = [];
        pluginLoading.value = false;
        return;
    }
    pluginLoading.value = true;
    try {
        const result = await windowApi.listPlugins();
        if (result?.success && Array.isArray(result.plugins)) {
            plugins.value = result.plugins;
        } else {
            plugins.value = [];
            if (showError) noticeOpen(result?.message || '加载插件列表失败', 2);
        }
    } catch (error) {
        console.error('加载插件列表失败:', error);
        plugins.value = [];
        if (showError) noticeOpen('加载插件列表失败', 2);
    } finally {
        pluginLoading.value = false;
    }
};

const loadPluginDirectory = async (showError = false) => {
    if (!pluginDirectoryApiAvailable.value) {
        pluginDirectory.value = '';
        pluginDirectoryDefault.value = '';
        pluginDirectoryLoading.value = false;
        return;
    }
    pluginDirectoryLoading.value = true;
    try {
        const result = await windowApi.getPluginDirectory();
        if (result?.success) {
            pluginDirectory.value = result.directory || '';
            pluginDirectoryDefault.value = result.defaultDirectory || '';
        } else {
            pluginDirectory.value = '';
            if (showError) noticeOpen(result?.message || '加载插件目录失败', 2);
        }
    } catch (error) {
        console.error('加载插件目录失败:', error);
        pluginDirectory.value = '';
        if (showError) noticeOpen('加载插件目录失败', 2);
    } finally {
        pluginDirectoryLoading.value = false;
    }
};

const askMoveExistingPlugins = () =>
    new Promise((resolve) => {
        dialogOpen('移动插件', '是否将现有插件移动到新的目录？', (confirm) => {
            resolve(Boolean(confirm));
        });
    });

const changePluginDirectory = async () => {
    if (!pluginDirectoryApiAvailable.value) {
        noticeOpen('当前环境不支持修改插件目录', 2);
        return;
    }
    if (pluginDirectoryLoading.value) return;
    try {
        const current = pluginDirectory.value || pluginDirectoryDefault.value || '';
        const targetPath = await windowApi.choosePluginDirectory?.(current);
        if (!targetPath) return;

        const moveExisting = await askMoveExistingPlugins();
        pluginDirectoryLoading.value = true;
        const result = await windowApi.setPluginDirectory(targetPath, moveExisting);
        if (!result?.success) {
            noticeOpen(result?.message || '更新插件目录失败', 2);
            return;
        }
        pluginDirectory.value = result.directory || targetPath;
        pluginDirectoryDefault.value = result.defaultDirectory || pluginDirectoryDefault.value;
        await loadPlugins(false);
        await reloadPluginSystem();
        noticeOpen(result.moved ? '已移动现有插件并更新插件目录' : '插件目录已更新', 2);
    } catch (error) {
        console.error('更新插件目录失败:', error);
        noticeOpen('更新插件目录失败', 2);
    } finally {
        pluginDirectoryLoading.value = false;
    }
};

const resetPluginDirectory = async () => {
    if (!pluginDirectoryApiAvailable.value) {
        noticeOpen('当前环境不支持修改插件目录', 2);
        return;
    }
    if (!pluginDirectoryDefault.value) {
        noticeOpen('未检测到默认插件目录', 2);
        return;
    }
    if (pluginDirectoryLoading.value || !isPluginDirectoryCustomized.value) return;
    try {
        const moveExisting = await askMoveExistingPlugins();
        pluginDirectoryLoading.value = true;
        const result = await windowApi.setPluginDirectory(pluginDirectoryDefault.value, moveExisting);
        if (!result?.success) {
            noticeOpen(result?.message || '重置插件目录失败', 2);
            return;
        }
        pluginDirectory.value = result.directory || pluginDirectoryDefault.value;
        pluginDirectoryDefault.value = result.defaultDirectory || pluginDirectoryDefault.value;
        await loadPlugins(false);
        await reloadPluginSystem();
        noticeOpen(result.moved ? '已重置插件目录并移动现有插件' : '插件目录已重置', 2);
    } catch (error) {
        console.error('重置插件目录失败:', error);
        noticeOpen('重置插件目录失败', 2);
    } finally {
        pluginDirectoryLoading.value = false;
    }
};

const handleRefreshPlugins = async () => {
    if (!pluginApiAvailable.value) {
        noticeOpen('当前环境不支持插件管理', 2);
        return;
    }
    await loadPlugins();
};

const handleReloadApplication = async () => {
    if (appReloading.value) return;
    appReloading.value = true;
    try {
        if (typeof windowApi?.reloadApp === 'function') {
            const result = await windowApi.reloadApp();
            if (!result?.success) {
                throw new Error(result?.message || '重载失败');
            }
        } else {
            window.location.reload();
        }
    } catch (error) {
        console.error('重载应用失败:', error);
        noticeOpen('重载应用失败', 2);
        appReloading.value = false;
    }
};

const handleImportPlugin = async () => {
    if (!pluginApiAvailable.value) {
        noticeOpen('当前环境不支持插件管理', 2);
        return;
    }
    if (typeof windowApi.choosePluginSource !== 'function' || typeof windowApi.importPlugin !== 'function') {
        noticeOpen('当前环境不支持导入插件', 2);
        return;
    }
    if (pluginImporting.value) return;
    try {
        const sourcePath = await windowApi.choosePluginSource?.();
        if (!sourcePath) return;
        pluginImporting.value = true;
        const result = await windowApi.importPlugin(sourcePath);
        if (!result?.success) {
            noticeOpen(result?.message || '导入插件失败', 2);
            await loadPlugins(false);
            return;
        }
        noticeOpen(`已导入插件 ${result.plugin.name}`, 2);
        await loadPlugins(false);
        await reloadPluginSystem();
    } catch (error) {
        console.error('导入插件失败:', error);
        noticeOpen('导入插件失败', 2);
    } finally {
        pluginImporting.value = false;
    }
};

const togglePluginState = async (plugin) => {
    if (!pluginApiAvailable.value || !plugin?.id) return;
    if (isPluginBusy(plugin.id)) return;
    setPluginProcessing(plugin.id, true);
    try {
        if (typeof windowApi.setPluginEnabled !== 'function') {
            noticeOpen('当前环境不支持更新插件状态', 2);
            return;
        }
        const result = await windowApi.setPluginEnabled(plugin.id, !plugin.enabled);
        if (!result?.success) {
            noticeOpen(result?.message || '更新插件状态失败', 2);
            return;
        }
        noticeOpen(`${!plugin.enabled ? '已启用' : '已禁用'}插件 ${plugin.name}`, 2);
        await loadPlugins(false);
        await reloadPluginSystem();
    } catch (error) {
        console.error('更新插件状态失败:', error);
        noticeOpen('更新插件状态失败', 2);
    } finally {
        setPluginProcessing(plugin.id, false);
    }
};

const requestDeletePlugin = (plugin) => {
    if (!pluginApiAvailable.value || !plugin?.id) return;
    if (plugin.builtin) {
        noticeOpen('内置插件无法删除', 2);
        return;
    }
    dialogOpen('删除插件', `确定删除插件“${plugin.name}”吗？`, async (confirm) => {
        if (!confirm) return;
        setPluginProcessing(plugin.id, true);
        try {
            if (typeof windowApi.deletePlugin !== 'function') {
                noticeOpen('当前环境不支持删除插件', 2);
                return;
            }
            const result = await windowApi.deletePlugin(plugin.id);
            if (!result?.success) {
                noticeOpen(result?.message || '删除插件失败', 2);
                return;
            }
            noticeOpen(`已删除插件 ${plugin.name}`, 2);
            await loadPlugins(false);
            await reloadPluginSystem();
        } catch (error) {
            console.error('删除插件失败:', error);
            noticeOpen('删除插件失败', 2);
        } finally {
            setPluginProcessing(plugin.id, false);
        }
    });
};

const formatPluginTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
        return new Date(timestamp).toLocaleString();
    } catch (_) {
        return '';
    }
};

const pluginHasSettings = (pluginId) => {
    pluginSettingsVersion.value;
    return hasPluginSettingsPage(pluginId);
};

const openPluginSettings = (plugin) => {
    if (!plugin || !plugin.id) return;
    router.push({ name: 'pluginSettings', params: { pluginId: plugin.id } });
};

const setAppSettings = () => {
    let settings = {
        music: {
            level: musicLevel.value,
            lyricSize: lyricSize.value,
            tlyricSize: tlyricSize.value,
            rlyricSize: rlyricSize.value,
            lyricInterlude: lyricInterlude.value,
        },
        local: {
            videoFolder: videoFolder.value,
            downloadFolder: downloadFolder.value,
            localFolder: localFolder.value,
        },
        shortcuts: shortcutsList.value,
        other: {
            globalShortcuts: globalShortcuts.value,
            quitApp: quitApp.value,
        },
    };
    windowApi.setSettings(JSON.stringify(settings));
};

const clampNumber = (value, min, max, fallback = min) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    if (numeric < min) return min;
    if (numeric > max) return max;
    return numeric;
};

const lyricVisualizerDefaults = Object.freeze({
    height: 220,
    frequencyMin: 20,
    frequencyMax: 8000,
    transitionDelay: 0.75,
    barCount: 48,
    barWidth: 55,
    color: 'black',
    opacity: 100,
    style: 'bars',
    radialSize: 100,
    radialOffsetX: 0,
    radialOffsetY: 0,
    radialCoreSize: 62,
});

const customBackgroundDefaults = Object.freeze({
    mode: 'cover',
    blur: 0,
    brightness: 100,
    applyToChrome: true,
    applyToPlayer: true,
});

const toDisplayNumber = (value, fractionDigits = 0) => {
    if (!Number.isFinite(value)) return '';
    if (fractionDigits <= 0) return String(Math.round(value));
    return Number(value)
        .toFixed(fractionDigits)
        .replace(/\.0+$/, '')
        .replace(/(\.\d*?)0+$/, '$1');
};

const formatOptionLabel = (value, unit, defaultValue, fractionDigits = 0) => {
    const numberText = toDisplayNumber(value, fractionDigits);
    return `${numberText}${unit}${value === defaultValue ? '（默认）' : ''}`;
};

const addChoiceValue = (listRef, value) => {
    if (!Number.isFinite(value)) return;
    if (!listRef.value.includes(value)) {
        listRef.value = [...listRef.value, value].sort((a, b) => a - b);
    }
};

const removeChoiceValue = (listRef, value) => {
    if (!Number.isFinite(value)) return;
    listRef.value = listRef.value.filter(item => item !== value);
};

const createCustomActionState = (inputRef, sanitizeFn, valuesRef) =>
    computed(() => {
        const raw = String(inputRef.value ?? '').trim();
        if (!raw) {
            return { mode: 'add', value: null, exists: false };
        }
        const safe = sanitizeFn(raw);
        if (!Number.isFinite(safe)) {
            return { mode: 'add', value: null, exists: false };
        }
        const exists = valuesRef.value.includes(safe);
        return { mode: exists ? 'remove' : 'add', value: safe, exists };
    });

const sanitizeHeight = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.height;
    return Math.max(1, Math.round(numeric));
};

const sanitizeFrequencyMin = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.frequencyMin;
    return clampNumber(Math.round(numeric), 20, 20000, lyricVisualizerDefaults.frequencyMin);
};

const sanitizeFrequencyMax = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.frequencyMax;
    return clampNumber(Math.round(numeric), 20, 20000, lyricVisualizerDefaults.frequencyMax);
};

const sanitizeFrequencyRange = (min, max) => {
    let safeMin = sanitizeFrequencyMin(min);
    let safeMax = sanitizeFrequencyMax(max);
    if (safeMin >= safeMax) {
        if (safeMin >= 19990) {
            safeMin = 19990;
            safeMax = 20000;
        } else {
            safeMax = Math.min(20000, safeMin + 10);
        }
    }
    if (safeMax - safeMin < 10) {
        if (safeMin >= 19990) {
            safeMin = 19990;
            safeMax = 20000;
        } else {
            safeMax = Math.min(20000, safeMin + 10);
        }
    }
    return { min: safeMin, max: safeMax };
};

const sanitizeBarCount = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.barCount;
    return Math.max(1, Math.round(numeric));
};

const sanitizeBarWidth = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.barWidth;
    return Math.max(1, Math.round(numeric));
};

const sanitizeVisualizerStyle = value => {
    if (value === 'radial') return 'radial';
    return lyricVisualizerDefaults.style;
};

const sanitizeOpacity = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.opacity;
    return clampNumber(Math.round(numeric), 0, 100, lyricVisualizerDefaults.opacity);
};

const sanitizeTransitionDelay = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.transitionDelay;
    return Math.round(clampNumber(numeric, 0, 0.95, lyricVisualizerDefaults.transitionDelay) * 100) / 100;
};

const sanitizeRadialSize = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.radialSize;
    return clampNumber(Math.round(numeric), 10, 400, lyricVisualizerDefaults.radialSize);
};

const sanitizeRadialOffset = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return clampNumber(Math.round(numeric), -100, 100, 0);
};

const sanitizeRadialCoreSize = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return lyricVisualizerDefaults.radialCoreSize;
    return clampNumber(Math.round(numeric), 10, 95, lyricVisualizerDefaults.radialCoreSize);
};

const sanitizeBackgroundBlur = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return customBackgroundDefaults.blur;
    return Math.max(0, Math.round(numeric));
};

const sanitizeBackgroundBrightness = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return customBackgroundDefaults.brightness;
    return Math.max(0, Math.round(numeric));
};

const lyricVisualizerHeightBaseValues = Object.freeze([160, 180, 200, 220, 260, 320]);
const lyricVisualizerBarCountBaseValues = Object.freeze([24, 32, 48, 64, 96]);
const lyricVisualizerBarWidthBaseValues = Object.freeze([35, 45, 55, 65, 75]);
const lyricVisualizerFrequencyMinBaseValues = Object.freeze([20, 40, 80, 120, 200]);
const lyricVisualizerFrequencyMaxBaseValues = Object.freeze([4000, 6000, 8000, 12000, 16000]);
const lyricVisualizerTransitionDelayBaseValues = Object.freeze([0, 0.25, 0.5, 0.75, 0.9]);
const lyricVisualizerOpacityBaseValues = Object.freeze([20, 40, 60, 80, 100]);
const lyricVisualizerRadialSizeBaseValues = Object.freeze([60, 80, 100, 120, 160]);
const lyricVisualizerRadialOffsetBaseValues = Object.freeze([-50, -25, 0, 25, 50]);
const lyricVisualizerRadialCoreSizeBaseValues = Object.freeze([40, 52, 62, 72, 84]);
const customBackgroundBlurBaseValues = Object.freeze([0, 5, 10, 15, 20]);
const customBackgroundBrightnessBaseValues = Object.freeze([50, 75, 100, 125, 150]);

const lyricVisualizerHeightValues = ref([...lyricVisualizerHeightBaseValues]);
const lyricVisualizerBarCountValues = ref([...lyricVisualizerBarCountBaseValues]);
const lyricVisualizerBarWidthValues = ref([...lyricVisualizerBarWidthBaseValues]);
const lyricVisualizerFrequencyMinValues = ref([...lyricVisualizerFrequencyMinBaseValues]);
const lyricVisualizerFrequencyMaxValues = ref([...lyricVisualizerFrequencyMaxBaseValues]);
const lyricVisualizerTransitionDelayValues = ref([...lyricVisualizerTransitionDelayBaseValues]);
const lyricVisualizerOpacityValues = ref([...lyricVisualizerOpacityBaseValues]);
const lyricVisualizerRadialSizeValues = ref([...lyricVisualizerRadialSizeBaseValues]);
const lyricVisualizerRadialOffsetXValues = ref([...lyricVisualizerRadialOffsetBaseValues]);
const lyricVisualizerRadialOffsetYValues = ref([...lyricVisualizerRadialOffsetBaseValues]);
const lyricVisualizerRadialCoreSizeValues = ref([...lyricVisualizerRadialCoreSizeBaseValues]);
const lyricVisualizerStyleOptions = [
    { label: '柱状条形（默认）', value: 'bars' },
    { label: '辐射圆环', value: 'radial' },
];

const customBackgroundModeOptions = [
    { label: '拉伸填充', value: 'stretch' },
    { label: '等比裁剪填充（默认）', value: 'cover' },
    { label: '等比适应', value: 'contain' },
    { label: '原始尺寸居中', value: 'center' },
];
const customBackgroundApplyScopeOptions = [
    { label: '关闭', value: false },
    { label: '开启（默认）', value: true },
];
const customBackgroundBlurValues = ref([...customBackgroundBlurBaseValues]);
const customBackgroundBrightnessValues = ref([...customBackgroundBrightnessBaseValues]);

const lyricVisualizerHeightOptions = computed(() =>
    lyricVisualizerHeightValues.value.map(value => ({
        label: formatOptionLabel(value, 'px', lyricVisualizerDefaults.height),
        value,
    }))
);
const lyricVisualizerBarCountOptions = computed(() =>
    lyricVisualizerBarCountValues.value.map(value => ({
        label: formatOptionLabel(value, ' 个', lyricVisualizerDefaults.barCount),
        value,
    }))
);
const lyricVisualizerBarWidthOptions = computed(() =>
    lyricVisualizerBarWidthValues.value.map(value => ({
        label: formatOptionLabel(value, '', lyricVisualizerDefaults.barWidth),
        value,
    }))
);
const lyricVisualizerFrequencyMinOptions = computed(() =>
    lyricVisualizerFrequencyMinValues.value.map(value => ({
        label: formatOptionLabel(value, 'Hz', lyricVisualizerDefaults.frequencyMin),
        value,
    }))
);
const lyricVisualizerFrequencyMaxOptions = computed(() =>
    lyricVisualizerFrequencyMaxValues.value.map(value => ({
        label: formatOptionLabel(value, 'Hz', lyricVisualizerDefaults.frequencyMax),
        value,
    }))
);
const lyricVisualizerTransitionDelayOptions = computed(() =>
    lyricVisualizerTransitionDelayValues.value.map(value => ({
        label: formatOptionLabel(value, ' 秒', lyricVisualizerDefaults.transitionDelay, 2),
        value,
    }))
);

const lyricVisualizerOpacityOptions = computed(() =>
    lyricVisualizerOpacityValues.value.map(value => ({
        label: formatOptionLabel(value, '%', lyricVisualizerDefaults.opacity),
        value,
    }))
);

const lyricVisualizerRadialSizeOptions = computed(() =>
    lyricVisualizerRadialSizeValues.value.map(value => ({
        label: formatOptionLabel(value, '%', lyricVisualizerDefaults.radialSize),
        value,
    }))
);

const lyricVisualizerRadialOffsetXOptions = computed(() =>
    lyricVisualizerRadialOffsetXValues.value.map(value => ({
        label: formatOptionLabel(value, '%', lyricVisualizerDefaults.radialOffsetX),
        value,
    }))
);

const lyricVisualizerRadialOffsetYOptions = computed(() =>
    lyricVisualizerRadialOffsetYValues.value.map(value => ({
        label: formatOptionLabel(value, '%', lyricVisualizerDefaults.radialOffsetY),
        value,
    }))
);
const lyricVisualizerRadialCoreSizeOptions = computed(() =>
    lyricVisualizerRadialCoreSizeValues.value.map(value => ({
        label: formatOptionLabel(value, '%', lyricVisualizerDefaults.radialCoreSize),
        value,
    }))
);

const customBackgroundBlurOptions = computed(() =>
    customBackgroundBlurValues.value.map(value => ({
        label: formatOptionLabel(value, 'px', customBackgroundDefaults.blur),
        value,
    }))
);

const customBackgroundBrightnessOptions = computed(() =>
    customBackgroundBrightnessValues.value.map(value => ({
        label: formatOptionLabel(value, '%', customBackgroundDefaults.brightness),
        value,
    }))
);

const lyricVisualizerHeightCustom = ref('');
const lyricVisualizerBarCountCustom = ref('');
const lyricVisualizerBarWidthCustom = ref('');
const lyricVisualizerFrequencyMinCustom = ref('');
const lyricVisualizerFrequencyMaxCustom = ref('');
const lyricVisualizerTransitionDelayCustom = ref('');
const lyricVisualizerOpacityCustom = ref('');
const lyricVisualizerRadialSizeCustom = ref('');
const lyricVisualizerRadialOffsetXCustom = ref('');
const lyricVisualizerRadialOffsetYCustom = ref('');
const lyricVisualizerRadialCoreSizeCustom = ref('');
const customBackgroundBlurCustom = ref('');
const customBackgroundBrightnessCustom = ref('');

const lyricVisualizerHeightAction = createCustomActionState(
    lyricVisualizerHeightCustom,
    sanitizeHeight,
    lyricVisualizerHeightValues
);
const lyricVisualizerBarCountAction = createCustomActionState(
    lyricVisualizerBarCountCustom,
    sanitizeBarCount,
    lyricVisualizerBarCountValues
);
const lyricVisualizerBarWidthAction = createCustomActionState(
    lyricVisualizerBarWidthCustom,
    sanitizeBarWidth,
    lyricVisualizerBarWidthValues
);
const lyricVisualizerTransitionDelayAction = createCustomActionState(
    lyricVisualizerTransitionDelayCustom,
    sanitizeTransitionDelay,
    lyricVisualizerTransitionDelayValues
);
const lyricVisualizerOpacityAction = createCustomActionState(
    lyricVisualizerOpacityCustom,
    sanitizeOpacity,
    lyricVisualizerOpacityValues
);
const lyricVisualizerRadialSizeAction = createCustomActionState(
    lyricVisualizerRadialSizeCustom,
    sanitizeRadialSize,
    lyricVisualizerRadialSizeValues
);
const lyricVisualizerRadialOffsetXAction = createCustomActionState(
    lyricVisualizerRadialOffsetXCustom,
    sanitizeRadialOffset,
    lyricVisualizerRadialOffsetXValues
);
const lyricVisualizerRadialOffsetYAction = createCustomActionState(
    lyricVisualizerRadialOffsetYCustom,
    sanitizeRadialOffset,
    lyricVisualizerRadialOffsetYValues
);
const lyricVisualizerRadialCoreSizeAction = createCustomActionState(
    lyricVisualizerRadialCoreSizeCustom,
    sanitizeRadialCoreSize,
    lyricVisualizerRadialCoreSizeValues
);
const customBackgroundBlurAction = createCustomActionState(
    customBackgroundBlurCustom,
    sanitizeBackgroundBlur,
    customBackgroundBlurValues
);
const customBackgroundBrightnessAction = createCustomActionState(
    customBackgroundBrightnessCustom,
    sanitizeBackgroundBrightness,
    customBackgroundBrightnessValues
);

const lyricVisualizerFrequencyMinAction = computed(() => {
    const raw = String(lyricVisualizerFrequencyMinCustom.value ?? '').trim();
    if (!raw) return { mode: 'add', value: null, exists: false, pairedMax: null };
    const { min, max } = sanitizeFrequencyRange(raw, playerStore.lyricVisualizerFrequencyMax);
    if (!Number.isFinite(min)) return { mode: 'add', value: null, exists: false, pairedMax: null };
    const exists = lyricVisualizerFrequencyMinValues.value.includes(min);
    return { mode: exists ? 'remove' : 'add', value: min, exists, pairedMax: max };
});

const lyricVisualizerFrequencyMaxAction = computed(() => {
    const raw = String(lyricVisualizerFrequencyMaxCustom.value ?? '').trim();
    if (!raw) return { mode: 'add', value: null, exists: false, pairedMin: null };
    const { min, max } = sanitizeFrequencyRange(playerStore.lyricVisualizerFrequencyMin, raw);
    if (!Number.isFinite(max)) return { mode: 'add', value: null, exists: false, pairedMin: null };
    const exists = lyricVisualizerFrequencyMaxValues.value.includes(max);
    return { mode: exists ? 'remove' : 'add', value: max, exists, pairedMin: min };
});

const addLyricVisualizerHeightOption = () => {
    const { mode, value } = lyricVisualizerHeightAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(lyricVisualizerHeightValues, value);
        if (playerStore.lyricVisualizerHeight === value) {
            playerStore.lyricVisualizerHeight = lyricVisualizerDefaults.height;
        }
    } else {
        addChoiceValue(lyricVisualizerHeightValues, value);
        playerStore.lyricVisualizerHeight = value;
    }
    lyricVisualizerHeightCustom.value = '';
};

const addLyricVisualizerBarCountOption = () => {
    const { mode, value } = lyricVisualizerBarCountAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(lyricVisualizerBarCountValues, value);
        if (playerStore.lyricVisualizerBarCount === value) {
            playerStore.lyricVisualizerBarCount = lyricVisualizerDefaults.barCount;
        }
    } else {
        addChoiceValue(lyricVisualizerBarCountValues, value);
        playerStore.lyricVisualizerBarCount = value;
    }
    lyricVisualizerBarCountCustom.value = '';
};

const addLyricVisualizerBarWidthOption = () => {
    const { mode, value } = lyricVisualizerBarWidthAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(lyricVisualizerBarWidthValues, value);
        if (playerStore.lyricVisualizerBarWidth === value) {
            playerStore.lyricVisualizerBarWidth = lyricVisualizerDefaults.barWidth;
        }
    } else {
        addChoiceValue(lyricVisualizerBarWidthValues, value);
        playerStore.lyricVisualizerBarWidth = value;
    }
    lyricVisualizerBarWidthCustom.value = '';
};

const addLyricVisualizerFrequencyMinOption = () => {
    const { mode, value, pairedMax } = lyricVisualizerFrequencyMinAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(lyricVisualizerFrequencyMinValues, value);
        if (playerStore.lyricVisualizerFrequencyMin === value) {
            playerStore.lyricVisualizerFrequencyMin = lyricVisualizerDefaults.frequencyMin;
            playerStore.lyricVisualizerFrequencyMax = lyricVisualizerDefaults.frequencyMax;
        }
    } else {
        addChoiceValue(lyricVisualizerFrequencyMinValues, value);
        if (Number.isFinite(pairedMax)) {
            addChoiceValue(lyricVisualizerFrequencyMaxValues, pairedMax);
            playerStore.lyricVisualizerFrequencyMax = pairedMax;
        }
        playerStore.lyricVisualizerFrequencyMin = value;
    }
    lyricVisualizerFrequencyMinCustom.value = '';
};

const addLyricVisualizerFrequencyMaxOption = () => {
    const { mode, value, pairedMin } = lyricVisualizerFrequencyMaxAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(lyricVisualizerFrequencyMaxValues, value);
        if (playerStore.lyricVisualizerFrequencyMax === value) {
            playerStore.lyricVisualizerFrequencyMin = lyricVisualizerDefaults.frequencyMin;
            playerStore.lyricVisualizerFrequencyMax = lyricVisualizerDefaults.frequencyMax;
        }
    } else {
        addChoiceValue(lyricVisualizerFrequencyMaxValues, value);
        if (Number.isFinite(pairedMin)) {
            addChoiceValue(lyricVisualizerFrequencyMinValues, pairedMin);
            playerStore.lyricVisualizerFrequencyMin = pairedMin;
        }
        playerStore.lyricVisualizerFrequencyMax = value;
    }
    lyricVisualizerFrequencyMaxCustom.value = '';
};

const addLyricVisualizerTransitionDelayOption = () => {
    const { mode, value } = lyricVisualizerTransitionDelayAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(lyricVisualizerTransitionDelayValues, value);
        if (playerStore.lyricVisualizerTransitionDelay === value) {
            playerStore.lyricVisualizerTransitionDelay = lyricVisualizerDefaults.transitionDelay;
        }
    } else {
        addChoiceValue(lyricVisualizerTransitionDelayValues, value);
        playerStore.lyricVisualizerTransitionDelay = value;
    }
    lyricVisualizerTransitionDelayCustom.value = '';
};

const addLyricVisualizerOpacityOption = () => {
    const { mode, value } = lyricVisualizerOpacityAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(lyricVisualizerOpacityValues, value);
        if (playerStore.lyricVisualizerOpacity === value) {
            playerStore.lyricVisualizerOpacity = lyricVisualizerDefaults.opacity;
        }
    } else {
        addChoiceValue(lyricVisualizerOpacityValues, value);
        playerStore.lyricVisualizerOpacity = value;
    }
    lyricVisualizerOpacityCustom.value = '';
};

const addLyricVisualizerRadialSizeOption = () => {
    const { mode, value } = lyricVisualizerRadialSizeAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(lyricVisualizerRadialSizeValues, value);
        if (playerStore.lyricVisualizerRadialSize === value) {
            playerStore.lyricVisualizerRadialSize = lyricVisualizerDefaults.radialSize;
        }
    } else {
        addChoiceValue(lyricVisualizerRadialSizeValues, value);
        playerStore.lyricVisualizerRadialSize = value;
    }
    lyricVisualizerRadialSizeCustom.value = '';
};

const addLyricVisualizerRadialOffsetXOption = () => {
    const { mode, value } = lyricVisualizerRadialOffsetXAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(lyricVisualizerRadialOffsetXValues, value);
        if (playerStore.lyricVisualizerRadialOffsetX === value) {
            playerStore.lyricVisualizerRadialOffsetX = lyricVisualizerDefaults.radialOffsetX;
        }
    } else {
        addChoiceValue(lyricVisualizerRadialOffsetXValues, value);
        playerStore.lyricVisualizerRadialOffsetX = value;
    }
    lyricVisualizerRadialOffsetXCustom.value = '';
};

const addLyricVisualizerRadialOffsetYOption = () => {
    const { mode, value } = lyricVisualizerRadialOffsetYAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(lyricVisualizerRadialOffsetYValues, value);
        if (playerStore.lyricVisualizerRadialOffsetY === value) {
            playerStore.lyricVisualizerRadialOffsetY = lyricVisualizerDefaults.radialOffsetY;
        }
    } else {
        addChoiceValue(lyricVisualizerRadialOffsetYValues, value);
        playerStore.lyricVisualizerRadialOffsetY = value;
    }
    lyricVisualizerRadialOffsetYCustom.value = '';
};

const addLyricVisualizerRadialCoreSizeOption = () => {
    const { mode, value } = lyricVisualizerRadialCoreSizeAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(lyricVisualizerRadialCoreSizeValues, value);
        if (playerStore.lyricVisualizerRadialCoreSize === value) {
            playerStore.lyricVisualizerRadialCoreSize = lyricVisualizerDefaults.radialCoreSize;
        }
    } else {
        addChoiceValue(lyricVisualizerRadialCoreSizeValues, value);
        playerStore.lyricVisualizerRadialCoreSize = value;
    }
    lyricVisualizerRadialCoreSizeCustom.value = '';
};

const resetLyricVisualizerStyle = () => {
    playerStore.lyricVisualizerStyle = lyricVisualizerDefaults.style;
};

const addCustomBackgroundBlurOption = () => {
    const { mode, value } = customBackgroundBlurAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(customBackgroundBlurValues, value);
        if (playerStore.customBackgroundBlur === value) {
            playerStore.customBackgroundBlur = customBackgroundDefaults.blur;
        }
    } else {
        addChoiceValue(customBackgroundBlurValues, value);
        playerStore.customBackgroundBlur = value;
    }
    customBackgroundBlurCustom.value = '';
};

const addCustomBackgroundBrightnessOption = () => {
    const { mode, value } = customBackgroundBrightnessAction.value;
    if (value === null) return;
    if (mode === 'remove') {
        removeChoiceValue(customBackgroundBrightnessValues, value);
        if (playerStore.customBackgroundBrightness === value) {
            playerStore.customBackgroundBrightness = customBackgroundDefaults.brightness;
        }
    } else {
        addChoiceValue(customBackgroundBrightnessValues, value);
        playerStore.customBackgroundBrightness = value;
    }
    customBackgroundBrightnessCustom.value = '';
};

watch(
    () => playerStore.lyricVisualizerHeight,
    value => {
        const safe = sanitizeHeight(value);
        if (value !== safe) playerStore.lyricVisualizerHeight = safe;
        addChoiceValue(lyricVisualizerHeightValues, safe);
    },
    { immediate: true }
);

watch(
    [() => playerStore.lyricVisualizerFrequencyMin, () => playerStore.lyricVisualizerFrequencyMax],
    ([min, max]) => {
        const { min: safeMin, max: safeMax } = sanitizeFrequencyRange(min, max);
        if (min !== safeMin) playerStore.lyricVisualizerFrequencyMin = safeMin;
        if (max !== safeMax) playerStore.lyricVisualizerFrequencyMax = safeMax;
        addChoiceValue(lyricVisualizerFrequencyMinValues, safeMin);
        addChoiceValue(lyricVisualizerFrequencyMaxValues, safeMax);
    },
    { immediate: true }
);

watch(
    () => playerStore.lyricVisualizerBarCount,
    value => {
        const safe = sanitizeBarCount(value);
        if (value !== safe) playerStore.lyricVisualizerBarCount = safe;
        addChoiceValue(lyricVisualizerBarCountValues, safe);
    },
    { immediate: true }
);

watch(
    () => playerStore.lyricVisualizerBarWidth,
    value => {
        const safe = sanitizeBarWidth(value);
        if (value !== safe) playerStore.lyricVisualizerBarWidth = safe;
        addChoiceValue(lyricVisualizerBarWidthValues, safe);
    },
    { immediate: true }
);

watch(
    () => playerStore.lyricVisualizerStyle,
    value => {
        const safe = sanitizeVisualizerStyle(value);
        if (value !== safe) playerStore.lyricVisualizerStyle = safe;
    },
    { immediate: true }
);

watch(
    () => playerStore.lyricVisualizerTransitionDelay,
    value => {
        const safe = sanitizeTransitionDelay(value);
        if (value !== safe) playerStore.lyricVisualizerTransitionDelay = safe;
        addChoiceValue(lyricVisualizerTransitionDelayValues, safe);
    },
    { immediate: true }
);

watch(
    () => playerStore.lyricVisualizerOpacity,
    value => {
        const safe = sanitizeOpacity(value);
        if (value !== safe) playerStore.lyricVisualizerOpacity = safe;
        addChoiceValue(lyricVisualizerOpacityValues, safe);
    },
    { immediate: true }
);

watch(
    () => playerStore.lyricVisualizerRadialSize,
    value => {
        const safe = sanitizeRadialSize(value);
        if (value !== safe) playerStore.lyricVisualizerRadialSize = safe;
        addChoiceValue(lyricVisualizerRadialSizeValues, safe);
    },
    { immediate: true }
);

watch(
    () => playerStore.lyricVisualizerRadialOffsetX,
    value => {
        const safe = sanitizeRadialOffset(value);
        if (value !== safe) playerStore.lyricVisualizerRadialOffsetX = safe;
        addChoiceValue(lyricVisualizerRadialOffsetXValues, safe);
    },
    { immediate: true }
);

watch(
    () => playerStore.lyricVisualizerRadialOffsetY,
    value => {
        const safe = sanitizeRadialOffset(value);
        if (value !== safe) playerStore.lyricVisualizerRadialOffsetY = safe;
        addChoiceValue(lyricVisualizerRadialOffsetYValues, safe);
    },
    { immediate: true }
);

watch(
    () => playerStore.lyricVisualizerRadialCoreSize,
    value => {
        const safe = sanitizeRadialCoreSize(value);
        if (value !== safe) playerStore.lyricVisualizerRadialCoreSize = safe;
        addChoiceValue(lyricVisualizerRadialCoreSizeValues, safe);
    },
    { immediate: true }
);

watch(
    () => playerStore.lyricVisualizerColor,
    value => {
        if (value !== 'black' && value !== 'white') {
            playerStore.lyricVisualizerColor = lyricVisualizerDefaults.color;
        }
    },
    { immediate: true }
);

watch(
    () => playerStore.customBackgroundBlur,
    value => {
        const safe = sanitizeBackgroundBlur(value);
        if (value !== safe) playerStore.customBackgroundBlur = safe;
        addChoiceValue(customBackgroundBlurValues, safe);
    },
    { immediate: true }
);

watch(
    () => playerStore.customBackgroundBrightness,
    value => {
        const safe = sanitizeBackgroundBrightness(value);
        if (value !== safe) playerStore.customBackgroundBrightness = safe;
        addChoiceValue(customBackgroundBrightnessValues, safe);
    },
    { immediate: true }
);

watch(
    () => playerStore.customBackgroundMode,
    value => {
        if (!customBackgroundModeOptions.some(option => option.value === value)) {
            playerStore.customBackgroundMode = customBackgroundDefaults.mode;
        }
    },
    { immediate: true }
);

watch(
    () => playerStore.customBackgroundApplyToPlayer,
    value => {
        if (typeof value !== 'boolean') {
            playerStore.customBackgroundApplyToPlayer = customBackgroundDefaults.applyToPlayer;
        }
    },
    { immediate: true }
);

watch(
    () => playerStore.customBackgroundApplyToChrome,
    value => {
        if (typeof value !== 'boolean') {
            playerStore.customBackgroundApplyToChrome = customBackgroundDefaults.applyToChrome;
        }
    },
    { immediate: true }
);

const resetLyricVisualizerHeight = () => {
    playerStore.lyricVisualizerHeight = lyricVisualizerDefaults.height;
};

const resetLyricVisualizerBarCount = () => {
    playerStore.lyricVisualizerBarCount = lyricVisualizerDefaults.barCount;
};

const resetLyricVisualizerBarWidth = () => {
    playerStore.lyricVisualizerBarWidth = lyricVisualizerDefaults.barWidth;
};

const resetLyricVisualizerFrequencyMin = () => {
    playerStore.lyricVisualizerFrequencyMin = lyricVisualizerDefaults.frequencyMin;
};

const resetLyricVisualizerFrequencyMax = () => {
    playerStore.lyricVisualizerFrequencyMax = lyricVisualizerDefaults.frequencyMax;
};

const resetLyricVisualizerTransitionDelay = () => {
    playerStore.lyricVisualizerTransitionDelay = lyricVisualizerDefaults.transitionDelay;
};

const resetLyricVisualizerOpacity = () => {
    playerStore.lyricVisualizerOpacity = lyricVisualizerDefaults.opacity;
};

const resetLyricVisualizerRadialSize = () => {
    playerStore.lyricVisualizerRadialSize = lyricVisualizerDefaults.radialSize;
};

const resetLyricVisualizerRadialOffsetX = () => {
    playerStore.lyricVisualizerRadialOffsetX = lyricVisualizerDefaults.radialOffsetX;
};

const resetLyricVisualizerRadialOffsetY = () => {
    playerStore.lyricVisualizerRadialOffsetY = lyricVisualizerDefaults.radialOffsetY;
};

const resetLyricVisualizerRadialCoreSize = () => {
    playerStore.lyricVisualizerRadialCoreSize = lyricVisualizerDefaults.radialCoreSize;
};

const resetCustomBackgroundBlur = () => {
    playerStore.customBackgroundBlur = customBackgroundDefaults.blur;
};

const resetCustomBackgroundBrightness = () => {
    playerStore.customBackgroundBrightness = customBackgroundDefaults.brightness;
};

const resetCustomBackgroundApplyToChrome = () => {
    playerStore.customBackgroundApplyToChrome = customBackgroundDefaults.applyToChrome;
};

const lyricVisualizerColorOptions = [
    { label: '黑色（默认）', value: 'black' },
    { label: '白色', value: 'white' },
];

// apply theme immediately when user changes
watch(theme, (val) => setTheme(val));

onBeforeRouteLeave((to, from, next) => {
    setAppSettings();
    initSettings();
    next();
    noticeOpen('设置已保存', 2);
});

const routerChange = () => {
    router.back();
};

const selectFolder = type => {
    if (type == 'download') {
        windowApi.openFile().then(path => {
            downloadFolder.value = path;
        });
    } else if (type == 'local') {
        windowApi.openFile().then(path => {
            if (path && localFolder.value.indexOf(path) == -1) localFolder.value.push(path);
        });
    } else if (type == 'video') {
        windowApi.openFile().then(path => {
            videoFolder.value = path;
        });
    }
};
const deleteLocalFolder = index => {
    localFolder.value.splice(index, 1);
};

const formatShortcutName = name => {
    return name
        .replaceAll('+', ' + ')
        .replace('Up', '↑')
        .replace('Down', '↓')
        .replace('Right', '→')
        .replace('Left', '←')
        .replace('Space', '空格')
        .replace('Numpad', '')
        .replace('num', '')
        .replace('CommandOrControl', 'Ctrl')
        .replace('Control', 'Ctrl');
};
const changeShortcut = (id, type) => {
    selectedShortcut.value = {
        id: id,
        type: type,
    };
    windowApi.unregisterShortcuts();
};
/**
 * author: yesplaymusic
 */
const updateShortcut = () => {
    let shortcut = [];
    newShortcut.value.map(e => {
        if (e.keyCode >= 65 && e.keyCode <= 90) {
            shortcut.push(e.code.replace('Key', ''));
        } else if (['Control', 'Shift', 'Alt'].includes(e.key)) {
            shortcut.push(e.key);
        } else if (e.keyCode >= 48 && e.keyCode <= 57) {
            shortcut.push(e.code.replace('Digit', ''));
        } else if (e.keyCode >= 96 && e.keyCode <= 105) {
            shortcut.push(e.code.replace('Numpad', 'num'));
        } else if (e.keyCode >= 112 && e.keyCode <= 123) {
            shortcut.push(e.code);
        } else if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            shortcut.push(e.code.replace('Arrow', ''));
        } else if (shortcutCharacter.includes(e.key)) {
            shortcut.push(e.key);
        }
    });
    const sortTable = {
        Control: 1,
        Shift: 2,
        Alt: 3,
    };
    shortcut = shortcut.sort((a, b) => {
        if (!sortTable[a] || !sortTable[b]) return 0;
        if (sortTable[a] - sortTable[b] <= -1) {
            return -1;
        } else if (sortTable[a] - sortTable[b] >= 1) {
            return 1;
        } else {
            return 0;
        }
    });
    shortcut = shortcut.join('+');
    return shortcut;
};
const inputShortcut = k => {
    if (!selectedShortcut.value) return;
    if (newShortcut.value.find(nk => nk.keyCode === k.keyCode)) return;
    else newShortcut.value.push(k);
    if (
        (k.keyCode >= 65 && k.keyCode <= 90) ||
        (k.keyCode >= 48 && k.keyCode <= 57) ||
        (k.keyCode >= 96 && k.keyCode <= 105) ||
        (k.keyCode >= 112 && k.keyCode <= 123) ||
        ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(k.key) ||
        shortcutCharacter.includes(k.key)
    ) {
        if (selectedShortcut.value.type) shortcutsList.value.find(sc => sc.id == selectedShortcut.value.id).globalShortcut = updateShortcut();
        else shortcutsList.value.find(sc => sc.id == selectedShortcut.value.id).shortcut = updateShortcut();
        newShortcut.value = [];
    }
};
const setDefaultShortcuts = () => {
    shortcutsList.value = [
        { id: 'play', name: '播放/暂停', shortcut: 'CommandOrControl+P', globalShortcut: 'CommandOrControl+Alt+P' },
        { id: 'last', name: '上一首', shortcut: 'CommandOrControl+Left', globalShortcut: 'CommandOrControl+Alt+Left' },
        { id: 'next', name: '下一首', shortcut: 'CommandOrControl+Right', globalShortcut: 'CommandOrControl+Alt+Right' },
        { id: 'volumeUp', name: '增加音量', shortcut: 'CommandOrControl+Up', globalShortcut: 'CommandOrControl+Alt+Up' },
        { id: 'volumeDown', name: '减少音量', shortcut: 'CommandOrControl+Down', globalShortcut: 'CommandOrControl+Alt+Down' },
        { id: 'processForward', name: '快进(3s)', shortcut: 'CommandOrControl+]', globalShortcut: 'CommandOrControl+Alt+]' },
        { id: 'processBack', name: '后退(3s)', shortcut: 'CommandOrControl+[', globalShortcut: 'CommandOrControl+Alt+[' },
    ];
};
const clearMusicVideo = () => {
    windowApi.clearUnusedVideo().then(result => {
        if (result == 'noSavePath') {
            noticeOpen('请先在设置中设置音乐视频缓存目录', 2);
            return;
        } else if (result) noticeOpen('清除完毕', 3);
        else noticeOpen('删除失败', 3);
    });
};
const setMusicVideo = () => {
    if (!playerStore.musicVideo) dialogOpen('确定开启', '开启后此功能会消耗一定性能且可能造成卡顿，确定开启吗？', openMusicVideo);
    else openMusicVideo(true);
};
const openMusicVideo = flag => {
    if (flag) playerStore.musicVideo = !playerStore.musicVideo;
};
const setLyricBlur = () => {
    if (!playerStore.lyricBlur) dialogOpen('确定开启', '开启后此功能会消耗一定性能且可能造成卡顿，确定开启吗？', openLyricBlur);
    else openLyricBlur(true);
};
const openLyricBlur = flag => {
    if (flag) playerStore.lyricBlur = !playerStore.lyricBlur;
};
const setLyricVisualizer = () => {
    if (!playerStore.lyricVisualizer)
        dialogOpen('确定开启', '开启后此功能会消耗一定性能且可能造成卡顿，确定开启吗？', openLyricVisualizer);
    else openLyricVisualizer(true);
};
const openLyricVisualizer = flag => {
    if (flag) playerStore.lyricVisualizer = !playerStore.lyricVisualizer;
};

const toggleCustomBackground = () => {
    playerStore.customBackgroundEnabled = !playerStore.customBackgroundEnabled;
};

const toggleCustomBackgroundApplyToPlayer = () => {
    playerStore.customBackgroundApplyToPlayer = !playerStore.customBackgroundApplyToPlayer;
};

const chooseCustomBackgroundImage = () => {
    windowApi.openImageFile().then(path => {
        if (path) {
            playerStore.customBackgroundImage = path;
        }
    });
};

const clearCustomBackgroundImage = () => {
    playerStore.customBackgroundImage = '';
};
const userLogout = async () => {
    if (isLogin()) {
        logout().then(async result => {
            if (result.code == 200) {
                window.localStorage.clear();
                userStore.user = null;
                userStore.biliUser = null;

                // 清理登录session，确保下次一键登录能正常工作
                try {
                    await window.electronAPI?.clearLoginSession?.();
                    console.log('登录session已清理');
                } catch (error) {
                    console.error('清理登录session失败:', error);
                }

                router.push('/');
                noticeOpen('已退出账号', 2);
            } else noticeOpen('退出登录失败', 2);
        });
    } else noticeOpen('您已退出账号', 2);
};
const save = () => {
    selectedShortcut.value = null;
    setAppSettings();
    initSettings();
    noticeOpen('设置已保存', 2);
};
const toGithub = () => {
    windowApi.toRegister('https://github.com/ldx123000/Hydrogen-Music');
};
const toGithub2 = () => {
    windowApi.toRegister('https://github.com/acnekot/Hydrogen-Music');
};

// 检查更新功能
const checkForUpdates = () => {
    showUpdateDialog.value = true;
    windowApi.checkForUpdate();
};

// 更新对话框事件处理
const handleUpdateDownload = () => {
    windowApi.downloadUpdate();
};

const handleUpdateInstall = () => {
    windowApi.installUpdate();
};

const handleUpdateCancel = () => {
    windowApi.cancelUpdate();
};

const handleUpdateRetry = () => {
    windowApi.checkForUpdate();
};

const closeUpdateDialog = () => {
    showUpdateDialog.value = false;
};

// 清空当前账号的“私人漫游”近期去重队列
const getFmRecentKey = () => {
    const uid = userStore?.user?.userId || 'guest';
    return `hm.fm.recentPlayedQueue:${uid}`;
};
const clearFmRecent = () => {
    try {
        localStorage.removeItem(getFmRecentKey());
        // 通知个人FM组件刷新其内存中的近期队列
        window.dispatchEvent(new CustomEvent('fmClearRecent', { detail: { userId: userStore?.user?.userId || 'guest' } }));
        noticeOpen('已清空当前账号的私人漫游缓存', 2);
    } catch (e) {
        console.error('清空私人漫游缓存失败:', e);
        noticeOpen('清空失败', 2);
    }
};
</script>

<template>
    <div class="settings-page" @click="selectedShortcut = null">
        <div class="view-control">
            <svg t="1669039513804" @click="routerChange()" class="router-last" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1053" width="200" height="200">
                <path d="M716.608 1010.112L218.88 512.384 717.376 13.888l45.248 45.248-453.248 453.248 452.48 452.48z" p-id="1054"></path>
            </svg>
            <span class="setting-title">
                设置(离开页面以保存设置或
                <span class="save" @click="save()">点击</span>
                保存)
            </span>
        </div>
        <div class="settings-container">
            <h1 class="settings-title">设置</h1>
            <div class="settings-user-info" v-if="isLogin()">
                <div class="user">
                    <div class="user-head">
                        <img :src="userStore.user.avatarUrl + '?param=300y300'" alt="" />
                    </div>
                    <div class="user-info">
                        <div class="user-name">{{ userStore.user.nickname }}</div>
                        <div class="user-vip" v-if="vipInfo && userStore.user.vipType != 0">
                            <img :src="vipInfo.redVipDynamicIconUrl" alt="" />
                        </div>
                    </div>
                </div>
                <div class="logout" @click="userLogout()">
                    <span>退出</span>
                </div>
            </div>
            <div class="settings">
                <div class="settings-item">
                    <h2 class="item-title">音乐</h2>
                    <div class="line"></div>
                    <div class="item-options">
                        <div class="option">
                            <div class="option-name">音质选择</div>
                            <div class="option-operation">
                                <Selector v-model="musicLevel" :options="musicLevelOptions"></Selector>
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">开启歌词模糊</div>
                            <div class="option-operation">
                                <div class="toggle" @click="setLyricBlur()">
                                    <div class="toggle-off" :class="{ 'toggle-on-in': playerStore.lyricBlur }">{{ playerStore.lyricBlur ? '已开启' : '已关闭' }}</div>
                                    <Transition name="toggle">
                                        <div class="toggle-on" v-show="playerStore.lyricBlur"></div>
                                    </Transition>
                                </div>
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">开启自定义背景</div>
                            <div class="option-operation">
                                <div class="toggle" @click="toggleCustomBackground()">
                                    <div class="toggle-off" :class="{ 'toggle-on-in': playerStore.customBackgroundEnabled }">
                                        {{ playerStore.customBackgroundEnabled ? '已开启' : '已关闭' }}
                                    </div>
                                    <Transition name="toggle">
                                        <div class="toggle-on" v-show="playerStore.customBackgroundEnabled"></div>
                                    </Transition>
                                </div>
                            </div>
                        </div>
                        <div class="option" v-if="playerStore.customBackgroundEnabled">
                            <div class="option-name">背景图片</div>
                            <div class="option-operation option-operation--file">
                                <div class="option-file-path" :title="playerStore.customBackgroundImage">
                                    {{ playerStore.customBackgroundImage ? playerStore.customBackgroundImage : '未选择' }}
                                </div>
                                <div class="option-add" @click="chooseCustomBackgroundImage">选择</div>
                                <div class="option-reset" v-if="playerStore.customBackgroundImage" @click="clearCustomBackgroundImage">清除</div>
                            </div>
                        </div>
                        <div class="option" v-if="playerStore.customBackgroundEnabled">
                            <div class="option-name">背景显示模式</div>
                            <div class="option-operation option-operation--selector">
                                <div class="selector-wrapper">
                                    <Selector v-model="playerStore.customBackgroundMode" :options="customBackgroundModeOptions" />
                                </div>
                            </div>
                        </div>
                        <div class="option" v-if="playerStore.customBackgroundEnabled">
                            <div class="option-name">背景模糊</div>
                            <div class="option-operation option-operation--selector">
                                <div class="selector-wrapper">
                                    <Selector v-model="playerStore.customBackgroundBlur" :options="customBackgroundBlurOptions" />
                                </div>
                                <div class="option-add-group">
                                    <input
                                        type="number"
                                        min="0"
                                        v-model="customBackgroundBlurCustom"
                                        @keyup.enter="addCustomBackgroundBlurOption"
                                    />
                                    <div
                                        class="option-add"
                                        :class="{ 'option-add--remove': customBackgroundBlurAction.mode === 'remove' }"
                                        @click="addCustomBackgroundBlurOption"
                                    >
                                        {{ customBackgroundBlurAction.mode === 'remove' ? '删除' : '添加' }}
                                    </div>
                                </div>
                                <div class="option-reset" @click="resetCustomBackgroundBlur">重置</div>
                            </div>
                        </div>
                        <div class="option" v-if="playerStore.customBackgroundEnabled">
                            <div class="option-name">背景亮度</div>
                            <div class="option-operation option-operation--selector">
                                <div class="selector-wrapper">
                                    <Selector
                                        v-model="playerStore.customBackgroundBrightness"
                                        :options="customBackgroundBrightnessOptions"
                                    />
                                </div>
                                <div class="option-add-group">
                                    <input
                                        type="number"
                                        min="0"
                                        v-model="customBackgroundBrightnessCustom"
                                        @keyup.enter="addCustomBackgroundBrightnessOption"
                                    />
                                    <div
                                        class="option-add"
                                        :class="{ 'option-add--remove': customBackgroundBrightnessAction.mode === 'remove' }"
                                        @click="addCustomBackgroundBrightnessOption"
                                    >
                                        {{ customBackgroundBrightnessAction.mode === 'remove' ? '删除' : '添加' }}
                                    </div>
                                </div>
                                <div class="option-reset" @click="resetCustomBackgroundBrightness">重置</div>
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">歌词字体大小</div>
                            <div class="option-operation">
                                <input v-model="lyricSize" name="lyricSize" />
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">歌词翻译字体大小</div>
                            <div class="option-operation">
                                <input v-model="tlyricSize" name="tlyricSize" />
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">罗马歌词字体大小</div>
                            <div class="option-operation">
                                <input v-model="rlyricSize" name="rlyricSize" />
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">歌词间奏等待时间(单位：秒)</div>
                            <div class="option-operation">
                                <input v-model="lyricInterlude" name="lyricInterlude" />
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">开启音乐视频功能</div>
                            <div class="option-operation">
                                <div class="toggle" @click="setMusicVideo()">
                                    <div class="toggle-off" :class="{ 'toggle-on-in': playerStore.musicVideo }">{{ playerStore.musicVideo ? '已开启' : '已关闭' }}</div>
                                    <Transition name="toggle">
                                        <div class="toggle-on" v-show="playerStore.musicVideo"></div>
                                    </Transition>
                                </div>
                            </div>
                        </div>
                        <div class="option" v-if="playerStore.musicVideo">
                            <div class="option-name">删除所有未被使用的音乐视频</div>
                            <div class="option-operation">
                                <div class="button" @click="clearMusicVideo()">清除</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="settings-item">
                    <h2 class="item-title">本地</h2>
                    <div class="line"></div>
                    <div class="item-options">
                        <div class="option" v-if="playerStore.musicVideo">
                            <div class="option-name">音乐视频缓存</div>
                            <div class="select-download-folder">
                                <div class="selected-folder" :title="downloadFolder">{{ videoFolder ? videoFolder : '待选择' }}</div>
                                <div class="select-option" @click="selectFolder('video')">选择</div>
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">下载目录</div>
                            <div class="select-download-folder">
                                <div class="selected-folder" :title="downloadFolder">{{ downloadFolder ? downloadFolder : '待选择' }}</div>
                                <div class="select-option" @click="selectFolder('download')">选择</div>
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">本地目录</div>
                            <div class="local-folder">
                                <div class="selected-local-folder-item">
                                    <div class="selected-folder" :title="item" @contextmenu="deleteLocalFolder(index)" v-for="(item, index) in localFolder">{{ item ? item : '请添加' }}</div>
                                    <div class="tip">您可以同时添加多个目录,右键移除您不需要的目录。数据量过大时需要一定扫描时间,请稍等。</div>
                                </div>
                                <div class="add-option" @click="selectFolder('local')">添加</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="settings-item">
                    <h2 class="item-title">插件</h2>
                    <div class="line"></div>
                    <div class="item-options item-options--plugins">
                        <div class="plugin-directory" v-if="pluginDirectoryApiAvailable">
                            <div class="plugin-directory-info">
                                <div class="plugin-directory-label">插件目录</div>
                                <div class="plugin-directory-path" :title="pluginDirectoryDisplay">
                                    {{ pluginDirectoryDisplay }}
                                </div>
                            </div>
                            <div class="plugin-directory-actions">
                                <div
                                    class="plugin-button plugin-button--outline"
                                    :class="{ 'plugin-button--disabled': pluginDirectoryLoading }"
                                    @click="changePluginDirectory"
                                >
                                    {{ pluginDirectoryLoading ? '处理中…' : '更改目录' }}
                                </div>
                                <div
                                    v-if="canResetPluginDirectory"
                                    class="plugin-button plugin-button--outline"
                                    :class="{ 'plugin-button--disabled': pluginDirectoryLoading }"
                                    @click="resetPluginDirectory"
                                >
                                    重置
                                </div>
                            </div>
                        </div>
                        <div class="plugin-toolbar">
                            <div class="plugin-toolbar-left">
                                <div
                                    class="plugin-button"
                                    :class="{ 'plugin-button--loading': pluginImporting, 'plugin-button--disabled': !pluginApiAvailable }"
                                    @click="handleImportPlugin"
                                >
                                    {{ pluginImporting ? '导入中…' : '导入插件' }}
                                </div>
                                <div
                                    class="plugin-button plugin-button--outline"
                                    :class="{ 'plugin-button--disabled': pluginLoading || !pluginApiAvailable }"
                                    @click="handleRefreshPlugins"
                                >
                                    刷新列表
                                </div>
                                <div
                                    class="plugin-button plugin-button--outline"
                                    :class="{ 'plugin-button--disabled': appReloading || !pluginApiAvailable }"
                                    @click="handleReloadApplication"
                                >
                                    {{ appReloading ? '重载中…' : '重载' }}
                                </div>
                            </div>
                            <div class="plugin-toolbar-right" v-if="pluginLoading">
                                正在加载插件…
                            </div>
                        </div>
                        <div class="plugin-empty" v-if="!pluginApiAvailable">
                            当前运行环境不支持插件管理。
                        </div>
                        <div class="plugin-empty" v-else-if="!pluginLoading && pluginList.length === 0">
                            暂无已导入的插件。
                        </div>
                        <div class="plugin-list" v-else>
                            <div class="plugin-card" v-for="plugin in pluginList" :key="plugin.id">
                                <div class="plugin-card-header">
                                    <div class="plugin-card-title" :title="plugin.name">{{ plugin.name }}</div>
                                    <div class="plugin-card-header-meta">
                                        <span class="plugin-card-badge" v-if="plugin.builtin">内置</span>
                                        <div class="plugin-card-version" v-if="plugin.version">v{{ plugin.version }}</div>
                                    </div>
                                </div>
                                <div class="plugin-card-meta">
                                    <span class="plugin-card-author" v-if="plugin.author" :title="plugin.author">
                                        {{ plugin.author }}
                                    </span>
                                    <span class="plugin-card-id" :title="plugin.id">{{ plugin.id }}</span>
                                </div>
                                <div class="plugin-card-description" :title="plugin.description">
                                    {{ plugin.description || '开发者尚未提供描述。' }}
                                </div>
                                <div class="plugin-card-footer">
                                    <div class="plugin-card-time" v-if="plugin.importTime">
                                        导入时间：{{ formatPluginTimestamp(plugin.importTime) }}
                                    </div>
                                    <div class="plugin-card-actions">
                                        <div
                                            class="plugin-button plugin-button--outline"
                                            :class="{ 'plugin-button--disabled': !pluginApiAvailable || isPluginBusy(plugin.id) }"
                                            @click="togglePluginState(plugin)"
                                        >
                                            {{ plugin.enabled ? '禁用' : '启用' }}
                                        </div>
                                        <div
                                            class="plugin-button plugin-button--outline"
                                            v-if="plugin.enabled && pluginHasSettings(plugin.id)"
                                            :class="{ 'plugin-button--disabled': !pluginApiAvailable || isPluginBusy(plugin.id) }"
                                            @click="openPluginSettings(plugin)"
                                        >
                                            设置
                                        </div>
                                        <div
                                            v-if="!plugin.builtin"
                                            class="plugin-button plugin-button--danger"
                                            :class="{ 'plugin-button--disabled': !pluginApiAvailable || isPluginBusy(plugin.id) }"
                                            @click="requestDeletePlugin(plugin)"
                                        >
                                            删除
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="settings-item">
                    <h2 class="item-title">快捷键</h2>
                    <div class="line"></div>
                    <div class="item-options" tabindex="0" @keydown="inputShortcut($event)">
                        <div class="option">
                            <div class="option-name">开启全局快捷键</div>
                            <div class="option-operation">
                                <div class="toggle" @click="globalShortcuts = !globalShortcuts">
                                    <div class="toggle-off" :class="{ 'toggle-on-in': globalShortcuts }">{{ globalShortcuts ? '已开启' : '已关闭' }}</div>
                                    <Transition name="toggle">
                                        <div class="toggle-on" v-show="globalShortcuts"></div>
                                    </Transition>
                                </div>
                            </div>
                        </div>
                        <div class="shortcuts-title">
                            <div class="title-function">功能说明</div>
                            <div class="title-shortcuts">快捷键</div>
                            <div class="title-globalShortcuts" :class="{ 'forbid-shortcuts': !globalShortcuts }">全局快捷键</div>
                        </div>
                        <div class="shortcuts" v-for="(item, index) in shortcutsList">
                            <div class="shortcut-name">{{ item.name }}</div>
                            <div
                                class="shortcut"
                                :class="{ 'shortcut-selected': selectedShortcut && selectedShortcut.id == item.id && !selectedShortcut.type }"
                                @click.stop="changeShortcut(item.id, false)"
                            >
                                {{ formatShortcutName(item.shortcut) }}
                            </div>
                            <div
                                class="globalShortcut"
                                :class="{ 'shortcut-selected': selectedShortcut && selectedShortcut.id == item.id && selectedShortcut.type, 'forbid-shortcuts': !globalShortcuts }"
                                @click.stop="changeShortcut(item.id, true)"
                            >
                                {{ formatShortcutName(item.globalShortcut) }}
                            </div>
                        </div>
                        <div class="default-shortcuts" @click="setDefaultShortcuts()">恢复默认快捷键</div>
                    </div>
                </div>
                <div class="settings-item">
                    <h2 class="item-title">其他</h2>
                    <div class="line"></div>
                    <div class="item-options">
                        <div class="option">
                            <div class="option-name">主题</div>
                            <div class="option-operation">
                                <Selector v-model="theme" :options="themeOptions"></Selector>
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">开启首页页面</div>
                            <div class="option-operation">
                                <div class="toggle" @click="userStore.homePage = !userStore.homePage">
                                    <div class="toggle-off" :class="{ 'toggle-on-in': userStore.homePage }">{{ userStore.homePage ? '已开启' : '已关闭' }}</div>
                                    <Transition name="toggle">
                                        <div class="toggle-on" v-show="userStore.homePage"></div>
                                    </Transition>
                                </div>
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">开启云盘页面</div>
                            <div class="option-operation">
                                <div class="toggle" @click="userStore.cloudDiskPage = !userStore.cloudDiskPage">
                                    <div class="toggle-off" :class="{ 'toggle-on-in': userStore.cloudDiskPage }">{{ userStore.cloudDiskPage ? '已开启' : '已关闭' }}</div>
                                    <Transition name="toggle">
                                        <div class="toggle-on" v-show="userStore.cloudDiskPage"></div>
                                    </Transition>
                                </div>
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">开启私人漫游页面</div>
                            <div class="option-operation">
                                <div class="toggle" @click="userStore.personalFMPage = !userStore.personalFMPage">
                                    <div class="toggle-off" :class="{ 'toggle-on-in': userStore.personalFMPage }">{{ userStore.personalFMPage ? '已开启' : '已关闭' }}</div>
                                    <Transition name="toggle">
                                        <div class="toggle-on" v-show="userStore.personalFMPage"></div>
                                    </Transition>
                                </div>
                            </div>
                        </div>
                        <div class="option" v-if="userStore.personalFMPage">
                            <div class="option-name">清空漫游缓存</div>
                            <div class="option-operation">
                                <div class="button" @click="clearFmRecent">清空</div>
                            </div>
                        </div>
                        <div class="option">
                            <div class="option-name">退出应用时</div>
                            <div class="option-operation">
                                <Selector v-model="quitApp" :options="quitAppOptions"></Selector>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="app-version">
                <div class="app-icon">
                    <img src="../assets/icon/icon.ico" alt="" />
                </div>
                <div class="version">V0.5.6 AC.1</div>
                <div class="update-check">
                    <button class="check-update-btn" @click="checkForUpdates">检查更新</button>
                </div>
                <div class="app-author" @click="toGithub2()">Made by acnekot</div>      
                <div class="app-author" @click="toGithub()">Fix by ldx123000 | Modified from Hydrogen Music</div>          
            </div>
        </div>
        
        <!-- 更新对话框 -->
        <UpdateDialog 
            :visible="showUpdateDialog"
            :new-version="newVersion"
            @close="closeUpdateDialog"
            @download="handleUpdateDownload"
            @install="handleUpdateInstall"
            @cancel="handleUpdateCancel"
            @retry="handleUpdateRetry"
        />
    </div>
</template>

<style scoped lang="scss">
.settings-page {
    width: 100%;
    height: 100%;
    .view-control {
        margin-bottom: 15px;
        margin-left: -8px;
        height: 32px;
        display: flex;
        flex-direction: row;
        align-items: center;
        svg {
            padding: 8px;
            width: 32px;
            height: 32px;
            float: left;
            transition: 0.2s;
            &:hover {
                cursor: pointer;
                opacity: 0.7;
            }
            &:active {
                transform: scale(0.9);
            }
        }
        .router-last {
            margin-right: 5px;
        }
        .setting-title {
            font: 17px SourceHanSansCN-Bold;
            color: black;
            .save {
                font-size: 15px;
                padding: 6px;
                background-color: rgba(255, 255, 255, 0.35);
                transition: 0.1s;
                &:hover {
                    cursor: pointer;
                    opacity: 0.8;
                }
                &:active {
                    opacity: 0.5;
                }
            }
        }
    }
    .settings-container {
        margin: 0 auto;
        padding-bottom: 140px;
        width: 80%;
        height: calc(100% - 47px);
        overflow: auto;
        &::-webkit-scrollbar {
            display: none;
        }
        .settings-title {
            font-family: SourceHanSansCN-Bold;
            color: black;
            text-align: left;
        }
        .settings-user-info {
            padding: 10px 40px;
            width: 100%;
            height: 100px;
            background-color: rgba(255, 255, 255, 0.35);
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            .user {
                display: flex;
                flex-direction: row;
                align-items: center;
                .user-head {
                    margin-right: 15px;
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    overflow: hidden;
                    img {
                        width: 100%;
                        height: 100%;
                    }
                }
                .user-info {
                    .user-name {
                        font: 20px Source Han Sans;
                        font-weight: bold;
                        color: black;
                    }
                    .user-vip {
                        width: 40px;
                        img {
                            width: 100%;
                        }
                    }
                }
            }
            .logout {
                font: 14px SourceHanSansCN-Bold;
                font-weight: bold;
                color: black;
                transition: 0.2s;
                &:hover {
                    cursor: pointer;
                }
                &:active {
                    transform: scale(0.95);
                }
            }
        }
        .settings {
            width: 100%;
            .settings-item {
                margin-top: 45px;
                width: 100%;
                .item-title {
                    margin: 0;
                    font: 24px SourceHanSansCN-Bold;
                    color: black;
                    font-family: SourceHanSansCN-Bold;
                    color: black;
                    text-align: left;
                }
                .line {
                    margin-top: 8px;
                    margin-bottom: 25px;
                    width: 100%;
                    height: 0.5px;
                    background-color: rgba(0, 0, 0, 0.2);
                }
                .item-options {
                    outline: none;
                    &.item-options--plugins {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        .plugin-directory {
                            display: flex;
                            flex-wrap: wrap;
                            align-items: center;
                            justify-content: space-between;
                            gap: 12px;
                            padding: 16px;
                            background-color: rgba(255, 255, 255, 0.3);
                            border-radius: 0;
                            .plugin-directory-info {
                                display: flex;
                                flex-direction: column;
                                gap: 6px;
                                min-width: 0;
                                .plugin-directory-label {
                                    font: 14px SourceHanSansCN-Bold;
                                    color: rgba(0, 0, 0, 0.8);
                                }
                                .plugin-directory-path {
                                    font: 13px SourceHanSansCN-Regular;
                                    color: rgba(0, 0, 0, 0.85);
                                    word-break: break-all;
                                }
                            }
                            .plugin-directory-actions {
                                display: flex;
                                flex-wrap: wrap;
                                gap: 12px;
                            }
                        }
                        .plugin-toolbar {
                            display: flex;
                            flex-wrap: wrap;
                            align-items: center;
                            justify-content: space-between;
                            gap: 12px;
                            .plugin-toolbar-left {
                                display: flex;
                                flex-wrap: wrap;
                                gap: 12px;
                            }
                            .plugin-toolbar-right {
                                font: 13px SourceHanSansCN-Bold;
                                color: rgba(0, 0, 0, 0.65);
                            }
                        }
                        .plugin-empty {
                            padding: 18px;
                            font: 14px SourceHanSansCN-Regular;
                            color: rgba(0, 0, 0, 0.65);
                            background-color: rgba(255, 255, 255, 0.3);
                            border-radius: 0;
                        }
                        .plugin-list {
                            display: grid;
                            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                            gap: 16px;
                        }
                        .plugin-card {
                            display: flex;
                            flex-direction: column;
                            gap: 12px;
                            padding: 16px;
                            background-color: rgba(255, 255, 255, 0.35);
                            border-radius: 0;
                            transition: 0.2s;
                            &:hover {
                                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
                            }
                            .plugin-card-header {
                                display: flex;
                                align-items: baseline;
                                justify-content: space-between;
                                gap: 8px;
                                .plugin-card-title {
                                    font: 16px SourceHanSansCN-Bold;
                                    color: black;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                    white-space: nowrap;
                                }
                                .plugin-card-header-meta {
                                    display: flex;
                                    align-items: center;
                                    gap: 6px;
                                }
                                .plugin-card-badge {
                                    padding: 2px 6px;
                                    font: 11px SourceHanSansCN-Bold;
                                    color: rgba(0, 0, 0, 0.7);
                                    border: 1px solid rgba(0, 0, 0, 0.2);
                                    background: rgba(255, 255, 255, 0.6);
                                }
                                .plugin-card-version {
                                    font: 12px SourceHanSansCN-Bold;
                                    color: rgba(0, 0, 0, 0.65);
                                }
                            }
                            .plugin-card-meta {
                                display: flex;
                                gap: 10px;
                                font: 12px SourceHanSansCN-Regular;
                                color: rgba(0, 0, 0, 0.65);
                                .plugin-card-author,
                                .plugin-card-id {
                                    max-width: 100%;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                    white-space: nowrap;
                                }
                            }
                            .plugin-card-description {
                                min-height: 44px;
                                font: 13px SourceHanSansCN-Regular;
                                color: rgba(0, 0, 0, 0.75);
                                line-height: 1.5;
                                word-break: break-word;
                            }
                            .plugin-card-footer {
                                display: flex;
                                flex-direction: column;
                                gap: 10px;
                                .plugin-card-time {
                                    font: 12px SourceHanSansCN-Regular;
                                    color: rgba(0, 0, 0, 0.55);
                                }
                                .plugin-card-actions {
                                    display: flex;
                                    flex-wrap: wrap;
                                    gap: 10px;
                                }
                            }
                        }
                        .plugin-button {
                            min-width: 120px;
                            padding: 6px 16px;
                            border-radius: 0;
                            font: 13px SourceHanSansCN-Bold;
                            color: black;
                            background-color: rgba(255, 255, 255, 0.5);
                            text-align: center;
                            transition: 0.2s;
                            user-select: none;
                            &:hover {
                                cursor: pointer;
                                opacity: 0.85;
                            }
                        }
                        .plugin-button--outline {
                            background-color: transparent;
                            border: 1px solid rgba(0, 0, 0, 0.12);
                        }
                        .plugin-button--danger {
                            background-color: rgba(220, 53, 69, 0.85);
                            color: white;
                        }
                        .plugin-button--disabled,
                        .plugin-button--loading {
                            opacity: 0.6;
                            pointer-events: none;
                        }
                    }
                    .option {
                        margin-bottom: 32px;
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                        .option-name {
                            font-family: SourceHanSansCN-Bold;
                            font-size: 16px;
                            color: black;
                            text-align: left;
                        }
                        input,
                        .selector {
                            margin-right: 1px;
                            width: 200px;
                            height: 34px;
                            padding: 5px 1px;
                            background-color: transparent;
                            color: black;
                            border: none;
                            outline: none;
                            appearance: none;
                            font: 13px SourceHanSansCN-Bold;
                            text-align: center;
                            transition: 0.2s;
                            &:hover {
                                cursor: pointer;
                                opacity: 0.8;
                                box-shadow: none;
                            }
                        }
                        select {
                            padding: 8px 10px;
                        }
                        option {
                            background-color: rgba(255, 255, 255, 0.35);
                            border: none;
                            outline: none;
                        }
                        .toggle {
                            margin-right: 1px;
                            height: 34px;
                            width: 200px;
                            position: relative;
                            overflow: hidden;
                            &:hover {
                                cursor: pointer;
                            }
                            .toggle-on,
                            .toggle-off {
                                padding: 5px 10px;
                                width: 100%;
                                height: 100%;
                                font: 13px SourceHanSansCN-Bold;
                                transition: 0.2s;
                                line-height: 24px;
                            }
                            .toggle-off {
                                background-color: rgba(255, 255, 255, 0.35);
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
                        }
                        .option-operation {
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            gap: 12px;
                            flex-wrap: wrap;
                            > input {
                                width: 200px;
                                height: 34px;
                                padding: 5px 10px;
                                font: 13px SourceHanSansCN-Bold;
                                color: black;
                                background-color: rgba(255, 255, 255, 0.35);
                                border: none;
                                outline: none;
                                transition: 0.2s;
                                box-sizing: border-box;
                            }
                            > input:focus {
                                box-shadow: 0 0 0 1px black;
                            }
                        }
                        .option-operation--selector {
                            row-gap: 12px;
                        }
                        .option-operation--range {
                            flex-direction: column;
                            align-items: stretch;
                            gap: 12px;
                            .option-group {
                                display: flex;
                                flex-wrap: wrap;
                                align-items: center;
                                gap: 12px;
                                width: 100%;
                                .selector-wrapper {
                                    width: 200px;
                                }
                                .option-add-group {
                                    margin-left: auto;
                                }
                                .option-reset {
                                    margin-left: auto;
                                }
                            }
                        }
                        .option-operation--file {
                            gap: 12px;
                            flex-wrap: wrap;
                            .option-file-path {
                                width: 320px;
                                max-width: 100%;
                                height: 34px;
                                padding: 5px 10px;
                                background-color: rgba(255, 255, 255, 0.35);
                                font: 13px SourceHanSansCN-Bold;
                                color: black;
                                display: flex;
                                align-items: center;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                                box-sizing: border-box;
                            }
                        }
                        .selector-wrapper {
                            width: 200px;
                            .selector {
                                width: 100%;
                            }
                        }
                        .option-add-group {
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            gap: 8px;
                            flex-shrink: 0;
                            width: 200px;
                            input {
                                flex: 1;
                                min-width: 0;
                                height: 34px;
                                padding: 5px 10px;
                                font: 13px SourceHanSansCN-Bold;
                                color: black;
                                background-color: rgba(255, 255, 255, 0.35);
                                border: none;
                                outline: none;
                                transition: 0.2s;
                                box-sizing: border-box;
                            }
                            input:focus {
                                box-shadow: 0 0 0 1px black;
                            }
                        }
                        .option-group-label {
                            font: 13px SourceHanSansCN-Bold;
                        }
                        .option-reset,
                        .option-add {
                            padding: 5px 12px;
                            font: 13px SourceHanSansCN-Bold;
                            color: black;
                            background-color: rgba(255, 255, 255, 0.35);
                            transition: 0.2s;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 34px;
                            box-sizing: border-box;
                            flex-shrink: 0;
                            &:hover {
                                cursor: pointer;
                                opacity: 0.8;
                                box-shadow: 0 0 0 1px black;
                            }
                        }
                        .option-add--remove {
                            color: white;
                            background-color: rgba(220, 53, 69, 0.8);
                        }
                        .option-add--remove:hover {
                            box-shadow: 0 0 0 1px white;
                        }
                        .button {
                            margin-right: 1px;
                            padding: 5px 10px;
                            width: 200px;
                            background-color: rgba(255, 255, 255, 0.35);
                            font: 13px SourceHanSansCN-Bold;
                            &:hover {
                                cursor: pointer;
                                opacity: 0.8;
                                box-shadow: 0 0 0 1px black;
                            }
                        }
                        .select-download-folder {
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            .selected-folder {
                                width: 50vw;
                                height: 30px;
                                background-color: rgba(255, 255, 255, 0.35);
                                font: 13px SourceHanSansCN-Bold;
                                color: black;
                                line-height: 30px;
                                overflow: hidden;
                            }
                            .select-option {
                                margin-right: 2px;
                                margin-left: 15px;
                                padding: 5px 15px;
                                font: 13px SourceHanSansCN-Bold;
                                color: black;
                                background-color: rgba(255, 255, 255, 0.35);
                                transition: 0.2s;
                                &:hover {
                                    cursor: pointer;
                                    opacity: 0.8;
                                    box-shadow: 0 0 0 1px black;
                                }
                            }
                        }
                        .local-folder {
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            .selected-local-folder-item {
                                display: flex;
                                flex-direction: column;
                                .selected-folder {
                                    margin-bottom: 10px;
                                    width: 50vw;
                                    height: 30px;
                                    background-color: rgba(255, 255, 255, 0.35);
                                    font: 13px SourceHanSansCN-Bold;
                                    color: black;
                                    line-height: 30px;
                                    overflow: hidden;
                                }
                                .tip {
                                    font: 10px SourceHanSansCN-Bold;
                                    color: black;
                                    text-align: left;
                                }
                            }
                            .add-option {
                                margin-right: 2px;
                                margin-left: 15px;
                                padding: 5px 15px;
                                font: 13px SourceHanSansCN-Bold;
                                color: black;
                                background-color: rgba(255, 255, 255, 0.35);
                                transition: 0.2s;
                                &:hover {
                                    cursor: pointer;
                                    opacity: 0.8;
                                    box-shadow: 0 0 0 1px black;
                                }
                            }
                        }
                    }
                    .forbid-shortcuts {
                        opacity: 0.5;
                        pointer-events: none;
                    }
                    .shortcuts-title {
                        font: 14px SourceHanSansCN-Bold;
                        color: black;
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        text-align: left;
                        div {
                            margin-right: 15px;
                            padding: 0 6px;
                        }
                        .title-function {
                            min-width: 130px;
                        }
                        .title-shortcuts,
                        .title-globalShortcuts {
                            min-width: 200px;
                        }
                    }
                    .shortcuts {
                        font: 14px SourceHanSansCN-Bold;
                        color: black;
                        display: flex;
                        flex-direction: row;
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        text-align: left;
                        div {
                            margin-top: 15px;
                            margin-right: 15px;
                            padding: 6px;
                            background-color: rgba(255, 255, 255, 0.35);
                        }
                        .shortcut-name {
                            min-width: 130px;
                            background-color: transparent;
                        }
                        .shortcut,
                        .globalShortcut {
                            min-width: 200px;
                            &:hover {
                                cursor: pointer;
                            }
                        }
                        .shortcut-selected {
                            box-shadow: 0 0 0 1px black;
                        }
                    }
                    .default-shortcuts {
                        margin-top: 15px;
                        margin-left: 1px;
                        width: 120px;
                        padding: 6px;
                        background-color: rgba(255, 255, 255, 0.35);
                        font: 14px SourceHanSansCN-Bold;
                        transition: 0.2s;
                        color: black;
                        &:hover {
                            cursor: pointer;
                            box-shadow: 0 0 0 1px black;
                        }
                    }
                }
            }
        }
        .app-version {
            display: flex;
            flex-direction: column;
            align-items: center;
            .app-icon {
                margin-bottom: 10px;
                width: 65px;
                height: 65px;
                img {
                    width: 100%;
                    height: 100%;
                }
            }
            .version {
                font: 14px Geometos;
                color: black;
            }
            .update-check {
                margin: 8px 0;
                
                .check-update-btn {
                    padding: 5px 15px;
                    background-color: rgba(255, 255, 255, 0.35);
                    color: black;
                    border: none;
                    border-radius: 0;
                    outline: none;
                    font: 13px SourceHanSansCN-Bold;
                    cursor: pointer;
                    transition: 0.2s;
                    
                    &:hover {
                        opacity: 0.8;
                        box-shadow: 0 0 0 1px black;
                    }
                    
                    &:focus {
                        outline: none;
                        border-radius: 0;
                        box-shadow: 0 0 0 1px black;
                    }
                    
                    &:active {
                        outline: none;
                        border-radius: 0;
                        box-shadow: 0 0 0 1px black;
                    }
                }
            }
            .app-author {
                margin-top: 10px;
                font: 14px Bender-Bold;
                color: black;
                &:hover {
                    cursor: pointer;
                    text-decoration: underline;
                }
            }
        }
    }
}
.toggle-enter-active,
.toggle-leave-active {
    transition: 0.1s;
}
.toggle-enter-from,
.toggle-leave-to {
    transform: translateX(-100%);
}
</style>
