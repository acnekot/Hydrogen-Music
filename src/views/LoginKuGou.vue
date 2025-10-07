<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const handleSuccess = () => {
    router.push('/mymusic');
};

const goBack = () => {
    router.push('/login');
};
</script>

<template>
    <div class="login-content">
        <div class="login-container">
            <div class="login-back" @click="goBack">
                <span class="back-icon">←</span>
                <span class="back-text">返回登录选项</span>
            </div>
            <div class="login-header">
                <div class="login-icon kugou-icon">
                    <span>KG</span>
                </div>
                <span class="login-title">登录酷狗账号</span>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.login-content {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    .login-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: calc(100% - 120px);
        align-items: center;
        gap: 2vh;

        .login-back {
            align-self: flex-start;
            display: flex;
            align-items: center;
            gap: 6px;
            font: 12px SourceHanSansCN-Bold;
            color: rgb(111, 111, 111);
            transition: 0.2s;

            &:hover {
                cursor: pointer;
                color: black;
            }
        }

        .login-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5vh;

            .login-icon {
                width: 6.5vh;
                height: 6.5vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font: 2.3vh SourceHanSansCN-Bold;
            }

            .kugou-icon {
                background: radial-gradient(circle at 32% 30%, #64b3ff, #0d5dff);
            }

            .login-title {
                font: 2.7vh SourceHanSansCN-Bold;
                color: black;
            }
        }
    }
}
</style>
