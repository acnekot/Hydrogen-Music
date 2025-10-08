<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: [Number, String],
    default: 48,
  },
})

const dimension = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size
)

const gradientId = `netease-badge-gradient-${Math.random().toString(36).slice(2, 9)}`
const gradientUrl = computed(() => `url(#${gradientId})`)
</script>

<template>
  <svg
    :width="dimension"
    :height="dimension"
    viewBox="0 0 64 64"
    role="img"
    aria-label="NetEase Cloud Music"
    class="netease-badge"
  >
    <defs>
      <radialGradient :id="gradientId" cx="32" cy="32" r="28" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ff605a" />
        <stop offset="1" stop-color="#d81e06" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="28" :fill="gradientUrl" />
    <path
      d="M28 18c0-1.66 1.34-3 3-3h9c1.66 0 3 1.34 3 3v18.52c0 6.91-5.6 12.48-12.5 12.48-4.35 0-8.23-2.2-10.5-5.56-.58-.86-.36-2.04.5-2.62.86-.58 2.04-.36 2.62.5 1.47 2.18 3.96 3.56 6.88 3.56 4.54 0 8.23-3.68 8.23-8.21V22h-7.23v12.49c0 2.24-1.82 4.05-4.07 4.05S24.1 36.73 24.1 34.49s1.82-4.06 4.07-4.06c.71 0 1.39.18 1.98.5z"
      fill="#fff"
    />
    <path
      d="M25 44.5a7 7 0 0 0 12.6 4.2c.6-.83 1.76-1.02 2.59-.43.83.6 1.02 1.76.43 2.59A11 11 0 0 1 25 44.5z"
      fill="rgba(255, 255, 255, 0.85)"
    />
  </svg>
</template>

<style scoped>
.netease-badge {
  display: block;
}
</style>
