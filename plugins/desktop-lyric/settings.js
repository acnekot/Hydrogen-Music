import { defineComponent, ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlayerStore } from '../../src/store/playerStore.js';
import {
    toggleDesktopLyric,
    openDesktopLyric,
    closeDesktopLyric,
    getDesktopLyricState,
    isDesktopLyricAvailable,
} from './runtime.js';

export default defineComponent({
    name: 'DesktopLyricSettingsPanel',
    setup() {
        const playerStore = usePlayerStore();
        const { isDesktopLyricOpen } = storeToRefs(playerStore);
        const operating = ref(false);
        const status = ref(getDesktopLyricState());
        const available = computed(() => isDesktopLyricAvailable());

        watch(
            isDesktopLyricOpen,
            value => {
                status.value = !!value;
            },
            { immediate: true }
        );

        const runWithState = async action => {
            if (!available.value || operating.value) return;
            operating.value = true;
            try {
                await action();
            } finally {
                status.value = getDesktopLyricState();
                operating.value = false;
            }
        };

        const handleToggle = () => runWithState(() => toggleDesktopLyric());
        const handleOpen = () => runWithState(() => openDesktopLyric());
        const handleClose = () => runWithState(() => closeDesktopLyric());

        return {
            available,
            status,
            operating,
            handleToggle,
            handleOpen,
            handleClose,
        };
    },
    template: `
        <div class="plugin-settings-sections">
            <div class="option">
                <div class="option-name">桌面歌词状态</div>
                <div class="option-operation option-operation--actions">
                    <div class="toggle" :class="{ disabled: !available || operating }" @click="handleToggle">
                        <div class="toggle-off" :class="{ 'toggle-on-in': status }">{{ status ? '已开启' : '已关闭' }}</div>
                        <Transition name="toggle">
                            <div class="toggle-on" v-show="status"></div>
                        </Transition>
                    </div>
                </div>
            </div>
            <div class="option option--list">
                <div class="option-name">相关功能</div>
                <div class="option-operation option-operation--block">
                    <p class="option-desc">
                        桌面歌词按钮位于播放器底部控制条，可在播放时随时开关。本插件还提供以下快捷操作：
                    </p>
                    <div class="option-operation--actions">
                        <button class="option-add" :disabled="!available || operating || status" @click="handleOpen">
                            打开桌面歌词
                        </button>
                        <button class="option-add option-add--remove" :disabled="!available || operating || !status" @click="handleClose">
                            关闭桌面歌词
                        </button>
                    </div>
                    <p class="option-desc">如需重置窗口位置，可在关闭后重新打开。</p>
                </div>
            </div>
        </div>
    `,
});
