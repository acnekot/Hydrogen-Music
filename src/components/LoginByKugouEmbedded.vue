<script setup>
  import { ref, onMounted, onActivated } from 'vue'
  import DataCheckAnimaton from './DataCheckAnimaton.vue';
  import { noticeOpen } from '../utils/dialog';
  import { loginHandle } from '../utils/handle'

  const emits = defineEmits(['jumpTo'])
  const loginAnimation = ref(false)
  const dataCheckAnimaton = ref(null)
  const loginStatus = ref('等待登录')

  const resetState = () => {
    loginAnimation.value = false
    loginStatus.value = '等待登录'
  }

  onMounted(() => {
    resetState()
  })

  onActivated(() => {
    resetState()
  })

  async function startEmbeddedLogin() {
    if (loginAnimation.value) return

    loginAnimation.value = true
    loginStatus.value = '正在准备酷狗登录环境...'

    try {
      if(window.electronAPI?.clearKugouSession) {
        await window.electronAPI.clearKugouSession()
      }

      loginStatus.value = '登录窗口已打开，请在酷狗官网中完成登录'
      const result = await window.electronAPI?.openKugouLogin?.({ clearSession: true })

      if (result?.success) {
        loginStatus.value = '登录成功，正在获取账号信息...'

        if (!result.cookies || result.cookies.length === 0) {
          throw new Error('未获取到有效的登录信息，请重试')
        }

        const loginResult = {
          code: 200,
          cookie: result.cookies,
          message: result.message || '登录成功'
        }

        loginHandle(loginResult, 'kugou')

        loginStatus.value = '登录完成，正在跳转...'

        setTimeout(() => {
          resetState()
          emits('jumpTo')
        }, 1000)
      } else {
        loginStatus.value = '登录未完成'
        if (result?.message === '用户取消登录') {
          noticeOpen('已取消酷狗登录', 2)
        } else {
          noticeOpen(result?.message || '登录失败，请稍后重试', 2)
        }
        loginError()
      }
    } catch (error) {
      console.error('酷狗内嵌登录失败:', error)
      loginStatus.value = '登录失败'
      noticeOpen(error?.message || '登录窗口打开失败，请检查网络连接', 2)
      loginError()
    }
  }

  const loginError = () => {
    dataCheckAnimaton.value?.errorAnimation()
    const errorTimer = setTimeout(() => {
      loginAnimation.value = false
      loginStatus.value = '等待登录'
      clearTimeout(errorTimer)
    }, 1500);
  }
</script>

<template>
  <div class="embedded-login-container">
    <div class="embedded-login">
      <div class="login-description">
        <div class="description-content">
          <div class="main-text">酷狗账号登录</div>
          <div class="sub-text">点击下方按钮，在弹出的酷狗官网页面中完成登录流程</div>
        </div>
      </div>

      <div class="login-status" v-if="loginAnimation">
        <div class="status-text">{{ loginStatus }}</div>
      </div>

      <div class="animation">
        <DataCheckAnimaton class="check-animation" ref="dataCheckAnimaton" v-if="loginAnimation"></DataCheckAnimaton>
      </div>
    </div>

    <div class="embedded-operation">
      <div class="login-button" @click="startEmbeddedLogin()" :class="{'loading': loginAnimation}">
        <span v-if="!loginAnimation">打开酷狗官网登录</span>
        <span v-else>登录中...</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .embedded-login-container{
    margin-top: 4vh;
    .embedded-login{
      position: relative;
      .login-description{
        margin-bottom: 3vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        .description-content{
          text-align: center;
          .main-text{
            font: 2.4vh SourceHanSansCN-Bold;
            color: black;
            margin-bottom: 1vh;
          }
          .sub-text{
            font: 1.6vh SourceHanSansCN-Regular;
            color: #666;
            margin-bottom: 2vh;
            line-height: 1.5;
          }
        }
      }

      .login-status{
        display: flex;
        justify-content: center;
        margin-bottom: 2vh;
        .status-text{
          font: 1.6vh SourceHanSansCN-Regular;
          color: #007AFF;
          padding: 1vh 2vh;
          background: rgba(0, 122, 255, 0.1);
          border-radius: 4px;
        }
      }

      .animation{
        display: flex;
        flex-direction: column;
        align-items: center;
        .check-animation{
          width: 19vh;
          height: 19vh;
          position: absolute;
          top: -2vh;
          transform: translateX(-10%);
        }
      }
    }

    .embedded-operation{
      margin-top: 4vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      .login-button{
        padding: 1.2vh 0;
        width: 32vh;
        text-align: center;
        border: 1px solid #007aff;
        font: 16px SourceHanSansCN-Bold;
        color: #007aff;
        position: relative;
        transition: all 0.2s ease;
        border-radius: 6px;

        &:not(.loading):hover{
          cursor: pointer;
          background-color: #007aff;
          color: white;
        }

        &.loading{
          cursor: wait;
          opacity: 0.7;
        }
      }
    }
  }
</style>
