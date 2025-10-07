<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import LoginContent from '../components/LoginContent.vue'
import LoginContentKugou from '../components/LoginContentKugou.vue'
import { useUserStore } from '../store/userStore'

const route = useRoute()
const userStore = useUserStore()

const provider = computed(() => {
  return (route.query.provider || userStore.loginProvider || 'netease')
})
</script>

<template>
  <component :is="provider === 'kugou' ? LoginContentKugou : LoginContent" />
</template>
