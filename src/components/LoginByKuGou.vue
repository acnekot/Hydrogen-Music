<script setup>
import { onActivated, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import DataCheckAnimaton from './DataCheckAnimaton.vue';
import { noticeOpen } from '../utils/dialog';
import { setKuGouAuth, clearKuGouAuth } from '../utils/authority';
import { useUserStore } from '../store/userStore';
import { kugouFetchUserProfile } from '../api/kugou';

const emits = defineEmits(['jumpTo', 'back']);

const loginAnimation = ref(false);
const loginStatus = ref('等待登录');
const dataCheckAnimaton = ref(null);

const userStore = useUserStore();
const { kugouUser } = storeToRefs(userStore);

const resetState = () => {
    loginAnimation.value = false;
    loginStatus.value = '等待登录';
};

onMounted(resetState);
onActivated(resetState);

const parseCookieString = cookies => {
    if (!cookies || typeof cookies !== 'string') return {};
    return cookies.split(';').reduce((acc, part) => {
        const [rawKey, ...rest] = part.trim().split('=');
        if (!rawKey) return acc;
        acc[rawKey.toLowerCase()] = rest.join('=');
        return acc;
    }, {});
};

const syncProfile = async () => {
    try {
        const resp = await kugouFetchUserProfile();
        const profile = resp?.data || resp?.info || resp?.profile || resp;
        if (profile && typeof profile === 'object') {
            userStore.updateKuGouUser(profile);
        }
    } catch (error) {
        console.warn('获取酷狗用户信息失败', error);
    }
};

const handleLoginSuccess = async cookies => {
    const parsed = parseCookieString(cookies);
    const token = parsed.token;
    const userid = parsed.userid || parsed.user_id || parsed.kguserid || parsed['kg_user_id'];

    if (!token || !userid) {
        throw new Error('未能获取登录凭证，请重试');
    }

    const authPayload = {
        token,
        userid,
        vip_token: parsed.vip_token || '',
        vip_type: Number(parsed.vip_type || parsed.viptype || 0),
        dfid: parsed.dfid || parsed.kg_dfid || parsed.kgdfid || '',
    };

    setKuGouAuth(authPayload);
    userStore.updateKuGouAuth(authPayload);
    await syncProfile();

    noticeOpen('酷狗账号登录成功', 1);
    loginStatus.value = '登录成功，正在跳转...';

    setTimeout(() => {
        resetState();
        emits('jumpTo', { provider: 'kugou' });
    }, 800);
};

const startEmbeddedLogin = async () => {
    if (loginAnimation.value) return;

    loginAnimation.value = true;
    loginStatus.value = '正在清除之前的登录状态...';

    try {
        if (window.electronAPI?.clearKugouSession) {
            await window.electronAPI.clearKugouSession();
        }

        loginStatus.value = '登录窗口已打开，请在弹出的界面完成登录';
        const result = await window.electronAPI?.openKugouLogin?.();

        if (result?.success) {
            loginStatus.value = '登录成功，正在校验凭证...';
            await handleLoginSuccess(result.cookies || '');
        } else {
            const message = result?.message || '登录已取消';
            noticeOpen(message, 2);
            loginError();
        }
    } catch (error) {
        console.error('酷狗登录失败:', error);
        loginStatus.value = '登录失败';
        noticeOpen(error?.message || '登录过程中出现错误，请重试', 2);
        loginError();
    }
};

const loginError = () => {
    dataCheckAnimaton.value?.errorAnimation?.();
    const timer = setTimeout(() => {
        resetState();
        clearTimeout(timer);
    }, 1200);
};

const logoutKugou = () => {
    if (window.electronAPI?.clearKugouSession) {
        window.electronAPI.clearKugouSession();
    }
    clearKuGouAuth();
    userStore.updateKuGouAuth(null);
    userStore.updateKuGouUser(null);
    noticeOpen('已退出酷狗账号', 1);
};

const emitBack = () => {
    emits('back');
};
</script>

<template>
    <div class="embedded-login-container">
        <template v-if="kugouUser">
            <div class="kugou-status">
                <div class="status-avatar" v-if="kugouUser?.headurl">
                    <img :src="kugouUser.headurl" alt="avatar" />
                </div>
                <div class="status-info">
                    <div class="status-name">{{ kugouUser?.nickname || kugouUser?.username || '酷狗用户' }}</div>
                    <div class="status-desc">当前账号已登录，可在酷狗端同步收藏</div>
                </div>
                <button class="status-action" @click="logoutKugou">退出登录</button>
            </div>
            <div class="back-link status-back" @click="emitBack">返回登录选项</div>
        </template>
        <template v-else>
            <div class="embedded-login">
                <div class="login-description">
                    <div class="description-content">
                        <div class="main-text">通过官方窗口登录酷狗</div>
                        <div class="sub-text">点击下方按钮会在内置窗口打开官方登录页进行账号授权</div>
                    </div>
                </div>

                <div class="login-status" v-if="loginAnimation">
                    <div class="status-text">{{ loginStatus }}</div>
                </div>

                <div class="animation">
                    <DataCheckAnimaton class="check-animation" ref="dataCheckAnimaton" v-if="loginAnimation" />
                </div>
            </div>

            <div class="embedded-operation">
                <div class="login-button" :class="{ loading: loginAnimation }" @click="startEmbeddedLogin">
                    <span v-if="!loginAnimation">打开登录窗口</span>
                    <span v-else>正在登录...</span>
                </div>
                <div class="back-link" @click="emitBack">返回登录选项</div>
            </div>
        </template>
    </div>
</template>

<style scoped lang="scss">
.embedded-login-container {
    margin-top: 4vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4vh;

    .embedded-login {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3vh;

        .login-description {
            display: flex;
            flex-direction: column;
            align-items: center;

            .description-content {
                text-align: center;

                .main-text {
                    font: 2.4vh SourceHanSansCN-Bold;
                    color: black;
                    margin-bottom: 1vh;
                }

                .sub-text {
                    font: 1.6vh SourceHanSansCN-Regular;
                    color: #666;
                    line-height: 1.5;
                }
            }
        }

        .login-status {
            display: flex;
            justify-content: center;

            .status-text {
                font: 1.6vh SourceHanSansCN-Regular;
                color: #007aff;
                padding: 1vh 2vh;
                background: rgba(0, 122, 255, 0.1);
                border-radius: 4px;
            }
        }

        .animation {
            display: flex;
            flex-direction: column;
            align-items: center;

            .check-animation {
                width: 19vh;
                height: 19vh;
                position: absolute;
                top: -2vh;
                transform: translateX(-10%);
            }
        }
    }

    .embedded-operation {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.2vh;

        .login-button {
            padding: 1.2vh 0;
            width: 32vh;
            text-align: center;
            border: 1px solid black;
            font: 16px SourceHanSansCN-Bold;
            color: black;
            position: relative;
            transition: all 0.2s ease;

            &:not(.loading):hover {
                cursor: pointer;
                background-color: black;
                color: white;

                &::before,
                &::after {
                    opacity: 1;
                }

                &::before {
                    left: -40px;
                }

                &::after {
                    right: -40px;
                }
            }

            &.loading {
                background-color: #f5f5f5;
                color: #999;
                cursor: not-allowed;
                border-color: #ddd;
            }

            &::before,
            &::after {
                content: '';
                width: 30px;
                height: 1px;
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                opacity: 0;
                transition: 0.1s;
            }

            &::before {
                background: linear-gradient(to left, black 20%, rgba(0, 0, 0, 0.05));
                left: -50px;
            }

            &::after {
                background: linear-gradient(to right, black 20%, rgba(0, 0, 0, 0.05));
                right: -50px;
            }
        }
    }
}

.kugou-status {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    border: 1px solid black;
    width: 45vh;

    .status-avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        overflow: hidden;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .status-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .status-name {
            font: 18px SourceHanSansCN-Bold;
        }

        .status-desc {
            font: 12px SourceHanSansCN-Bold;
            color: rgba(0, 0, 0, 0.6);
        }
    }

    .status-action {
        border: 1px solid black;
        background: none;
        color: black;
        font: 12px SourceHanSansCN-Bold;
        padding: 4px 12px;
        transition: 0.2s;

        &:hover {
            cursor: pointer;
            background: black;
            color: white;
        }
    }
}

.back-link {
    font: 14px SourceHanSansCN-Bold;
    color: #007aff;
    cursor: pointer;
    text-decoration: underline;
    transition: 0.2s;

    &:hover {
        color: #005bb5;
    }
}

.status-back {
    margin-top: 16px;
}
</style>
