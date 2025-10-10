<script setup>
import { storeToRefs } from 'pinia';
import { usePlayerStore } from '../../../store/playerStore';
import { toggleDesktopLyric } from './service';

const playerStore = usePlayerStore();
const { isDesktopLyricOpen } = storeToRefs(playerStore);
</script>

<template>
  <svg
    @click="toggleDesktopLyric"
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
  width: 32px;
  height: 32px;
  cursor: pointer;
  color: #000;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.desktop-lyric-btn:hover {
  opacity: 1;
}

.desktop-lyric-btn path {
  fill: currentColor;
}

.desktop-lyric-btn.active {
  opacity: 1;
}

.dark .desktop-lyric-btn {
  color: #fff;
}
</style>
