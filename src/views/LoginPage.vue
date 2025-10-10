<script setup>
import { useRouter } from 'vue-router';
import NeteaseBadge from '../components/NeteaseBadge.vue'

const router = useRouter();

const modeSelect = mode => {
    if (mode === 'netease') {
        router.push({ path: '/login/account', query: { mode: 4 } });
    }
};
</script>

<template>
    <div class="login-page">
        <div class="login-mode">
            <div class="mode-type" @click="modeSelect('netease')">
                <div class="type-img">
                    <NeteaseBadge size="100%" />
                </div>
                <div class="type-info">
                    <span class="type-title">网易云音乐</span>
                    <span class="type-subtitle">以网易云账号登录</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.login-page {
    height: calc(100% - 110px);
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-mode {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;

    .mode-type {
        width: 252px;
        height: 96px;
        background-color: rgba(255, 255, 255, 0.35);
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        transition: 0.25s;
        position: relative;
        cursor: pointer;

        &::before,
        &::after {
            content: '';
            width: 0;
            height: 100%;
            border: 1px solid black;
            opacity: 0;
            transition: 0.25s ease;
            position: absolute;
            top: 0;
            pointer-events: none;
        }

        &::before {
            left: 0;
            border-right: none;
        }

        &::after {
            right: 0;
            border-left: none;
        }

        &:hover {
            width: 272px;

            &::before,
            &::after {
                opacity: 1;
                width: 50%;
            }
        }

        .type-img {
            margin-right: 16px;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            :deep(svg) {
                width: 100%;
                height: 100%;
            }
        }

        .type-info {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            color: black;

            .type-title {
                font: 20px SourceHanSansCN-Bold;
            }

            .type-subtitle {
                font: 10px SourceHanSansCN-Bold;
                color: rgba(0, 0, 0, 0.62);
            }
        }
    }
}
</style>
