<script setup>
import { computed } from 'vue';
import { usePlayerStore } from '../../../store/playerStore';

const props = defineProps({
  toggleDesktopLyric: {
    type: Function,
    required: true,
  },
});

const playerStore = usePlayerStore();
const isDesktopLyricOpen = computed(() => playerStore.isDesktopLyricOpen);

const handleToggle = () => {
  props.toggleDesktopLyric();
};
</script>

<template>
  <svg
    @click="handleToggle"
    :class="{ active: isDesktopLyricOpen }"
    class="icon desktop-lyric-btn"
    viewBox="0 0 1024 1024"
    xmlns="http://www.w3.org/2000/svg"
    width="200"
    height="200"
  >
    <path
      d="M896 128H128c-70.4 0-128 57.6-128 128v512c0 70.4 57.6 128 128 128h768c70.4 0 128-57.6 128-128V256c0-70.4-57.6-128-128-128zM128 192h768c35.2 0 64 28.8 64 64v85.333333H64V256c0-35.2 28.8-64 64-64z m768 640H128c-35.2 0-64-28.8-64-64V405.333333h896V768c0 35.2-28.8 64-64 64z"
    ></path>
    <path d="M256 576h512v64H256z m0 128h384v64H256z"></path>
  </svg>
</template>

<style scoped>
.desktop-lyric-btn {
  opacity: 0.5;
  transition: all 0.2s ease;
}

.desktop-lyric-btn path {
  fill: #8a8a8a;
}

.desktop-lyric-btn.active {
  opacity: 1;
}

.desktop-lyric-btn.active path {
  fill: #000000;
}

.desktop-lyric-btn:hover {
  opacity: 0.8;
  transform: scale(1.05);
}

.desktop-lyric-btn:active {
  transform: scale(0.95);
}
</style>
