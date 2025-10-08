<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: [Number, String],
    default: 64,
  },
  accent: {
    type: String,
    default: '#ff4d4f',
  },
  secondary: {
    type: String,
    default: '#7c3aed',
  },
})

const dimension = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size
)

const gradientId = `app-logo-gradient-${Math.random().toString(36).slice(2, 9)}`
const gradientUrl = computed(() => `url(#${gradientId})`)
</script>

<template>
  <svg
    :width="dimension"
    :height="dimension"
    viewBox="0 0 64 64"
    role="img"
    aria-label="Hydrogen Music logo"
    class="app-logo"
  >
    <defs>
      <linearGradient
        :id="gradientId"
        x1="10"
        y1="8"
        x2="54"
        y2="56"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" :stop-color="props.accent" />
        <stop offset="1" :stop-color="props.secondary" />
      </linearGradient>
    </defs>
    <rect
      x="6"
      y="6"
      width="52"
      height="52"
      rx="14"
      ry="14"
      :fill="gradientUrl"
    />
    <path
      d="M36 16a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v21.52a7.5 7.5 0 1 0 4 6.48V22h6z"
      fill="rgba(255, 255, 255, 0.9)"
    />
    <path
      d="M34 42.65a5.5 5.5 0 1 1-1.5-3.8v-.02z"
      fill="rgba(255, 255, 255, 0.9)"
    />
  </svg>
</template>

<style scoped>
.app-logo {
  display: block;
}
</style>
