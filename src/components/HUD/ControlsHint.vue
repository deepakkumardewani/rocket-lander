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
    class="bg-[rgba(23,23,23,0.6)] backdrop-blur-md border border-white/10 rounded-lg p-2.5 flex justify-around shadow-lg"
  >
    <div class="text-sm flex items-center gap-1">
      <kbd
        class="bg-[rgba(45,45,45,0.7)] border border-white/20 rounded px-1.5 py-0.5 text-xs font-mono shadow"
        >←</kbd
      >
      <kbd
        class="bg-[rgba(45,45,45,0.7)] border border-white/20 rounded px-1.5 py-0.5 text-xs font-mono shadow"
        >→</kbd
      >
      Tilt
    </div>
    <div class="text-sm flex items-center gap-1">
      <kbd
        class="bg-[rgba(45,45,45,0.7)] border border-white/20 rounded px-1.5 py-0.5 text-xs font-mono shadow"
        >Space</kbd
      >
      Thrust
    </div>
    <div class="text-sm flex items-center gap-1">
      <kbd
        class="bg-[rgba(45,45,45,0.7)] border border-white/20 rounded px-1.5 py-0.5 text-xs font-mono shadow"
        >R</kbd
      >
      Reset
    </div>
  </div>
</template>
