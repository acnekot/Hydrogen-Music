<script setup>
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useUserStore } from '../store/userStore'
  import { getAllProviders } from '../utils/provider'

  const router = useRouter()
  const userStore = useUserStore()
  const providers = getAllProviders()
  const activeProvider = computed(() => userStore.loginProvider || 'netease')

  const selectProvider = provider => {
    userStore.setLoginProvider(provider)
  }

  const modeSelect = (provider, mode = 4) => {
    selectProvider(provider)
    const query = { provider }
    if (provider === 'netease') {
      query.mode = mode
    }
    router.push({ path: '/login/account', query })
  }
</script>

<template>
  <div class="login-page">
    <div class="login-mode">
      <div
        v-for="provider in providers"
        :key="provider.id"
        class="mode-type"
        :class="{ 'mode-active': activeProvider === provider.id }"
        @click="modeSelect(provider.id)"
      >
        <div class="type-img" :style="{ backgroundColor: provider.accentColor }">
          <img :src="provider.icon()" :alt="provider.name" />
        </div>
        <div class="type-info">
          <span class="type-title">{{ provider.shortName }}</span>
          <span class="type-subtitle">{{ provider.loginDescription }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .login-page {
    height: calc(100% - 110px);
    .login-mode {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 24px;
      .mode-type {
        width: 250px;
        height: 100px;
        background-color: rgba(255, 255, 255, 0.35);
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        transition: 0.3s;
        position: relative;
        border-radius: 12px;
        &::before {
          content: '';
          width: 0;
          height: 100px;
          border: {
            top: 1px solid black;
            left: 1px solid black;
            bottom: 1px solid black;
          };
          position: absolute;
          left: 0;
          opacity: 0;
          transition: 0.3s ease;
          pointer-events: none;
          border-radius: 12px 0 0 12px;
        }
        &::after {
          content: '';
          width: 0;
          height: 100px;
          border: {
            top: 1px solid black;
            right: 1px solid black;
            bottom: 1px solid black;
          };
          position: absolute;
          right: 0;
          opacity: 0;
          transition: 0.3s ease;
          pointer-events: none;
          border-radius: 0 12px 12px 0;
        }
        &:hover,
        &.mode-active {
          cursor: pointer;
          width: 280px;
          &::before {
            opacity: 1;
            width: 140px;
          }
          &::after {
            opacity: 1;
            width: 140px;
          }
        }
        .type-img {
          margin-right: 15px;
          width: 50px;
          height: 50px;
          border-radius: 10px;
          background-color: rgba(226, 0, 0, 1);
          display: flex;
          justify-content: center;
          align-items: center;
          img {
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
            margin-top: 4px;
            font: 10px SourceHanSansCN-Bold;
            opacity: 0.7;
          }
        }
      }
    }
  }
</style>
