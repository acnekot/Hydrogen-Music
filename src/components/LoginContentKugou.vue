<script setup>
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import LoginByEmbedded from './LoginByEmbedded.vue'
  import { getProviderMeta } from '../utils/provider'

  const router = useRouter()
  const providerMeta = computed(() => getProviderMeta('kugou'))
  const jumpPage = ref(false)

  const jumpTo = () => {
    jumpPage.value = true
    setTimeout(() => {
      router.push('/mymusic')
      jumpPage.value = false
    }, 800)
  }
</script>

<template>
  <div class="login-content" :class="{ jumpPage }">
    <div class="login-container">
      <div class="login-header" :style="{ '--accent-color': providerMeta.accentColor }">
        <div class="login-icon">
          <img :src="providerMeta.icon()" :alt="providerMeta.name" />
        </div>
        <span class="login-title">{{ providerMeta.loginTitle }}</span>
        <span class="login-subtitle">{{ providerMeta.loginDescription }}</span>
      </div>

      <LoginByEmbedded class="embedded-container" provider="kugou" @jumpTo="jumpTo" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-content {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  &.jumpPage {
    opacity: 0.8;
  }

  .login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 420px;
  }

  .login-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    .login-icon {
      margin-bottom: 1.5vh;
      width: 6.5vh;
      height: 6.5vh;
      background-color: var(--accent-color, #1C6CFF);
      border-radius: 12px;
      display: flex;
      justify-content: center;
      align-items: center;
      img {
        width: 100%;
        height: 100%;
      }
    }
    .login-title {
      font: 2.7vh SourceHanSansCN-Bold;
      color: black;
    }
    .login-subtitle {
      margin-top: 1vh;
      font: 1.4vh SourceHanSansCN-Regular;
      color: #666;
    }
  }

  .embedded-container {
    width: 100%;
  }
}
</style>
