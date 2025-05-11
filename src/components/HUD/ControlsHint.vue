<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useGameStore } from "../../stores/gameStore";

const gameStore = useGameStore();
const { gameState } = storeToRefs(gameStore);

// Determine if game is in active play state
const isPlaying = computed(() => {
  return gameState.value === "flying" || gameState.value === "pre-launch";
});
</script>

<template>
  <div
    v-if="isPlaying"
    class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[rgba(23,23,23,0.7)] backdrop-blur-md border border-white/15 rounded-xl p-3 flex gap-6 shadow-xl transition-all duration-300 ease-in-out hover:bg-[rgba(30,30,30,0.8)] hover:border-white/25"
  >
    <div class="text-sm flex items-center gap-2 text-white/90">
      <div class="flex items-center">
        <kbd
          class="bg-[rgba(60,60,60,0.8)] border border-white/30 rounded px-2 py-1 text-xs font-mono shadow-inner mr-1 text-white"
          >←</kbd
        >
        <kbd
          class="bg-[rgba(60,60,60,0.8)] border border-white/30 rounded px-2 py-1 text-xs font-mono shadow-inner text-white"
          >→</kbd
        >
      </div>
      <span class="font-medium">Tilt</span>
    </div>
    <div class="text-sm flex items-center gap-2 text-white/90">
      <kbd
        class="bg-[rgba(60,60,60,0.8)] border border-white/30 rounded px-2 py-1 text-xs font-mono shadow-inner text-white"
        >Space</kbd
      >
      <span class="font-medium">Thrust</span>
    </div>
    <div class="text-sm flex items-center gap-2 text-white/90">
      <kbd
        class="bg-[rgba(60,60,60,0.8)] border border-white/30 rounded px-2 py-1 text-xs font-mono shadow-inner text-white"
        >R</kbd
      >
      <span class="font-medium">Reset</span>
    </div>
  </div>
</template>
