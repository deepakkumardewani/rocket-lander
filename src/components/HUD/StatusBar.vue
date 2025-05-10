<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useGameStore } from "../../stores/gameStore";

const gameStore = useGameStore();
const { gameState } = storeToRefs(gameStore);

// Game state label with proper formatting
const gameStateLabel = computed(() => {
  const state = gameState.value;
  return state.charAt(0).toUpperCase() + state.slice(1);
});
</script>

<template>
  <div
    class="flex justify-between items-center bg-[rgba(23,23,23,0.75)] backdrop-blur-md border border-white/10 rounded-lg p-1.5 px-3 shadow-lg"
  >
    <div class="flex items-center gap-2">
      <div
        class="px-2.5 py-1 rounded font-semibold tracking-wider text-sm uppercase text-white"
        :class="{
          'bg-yellow-500': gameState === 'pre-launch',
          'bg-blue-500': gameState === 'flying',
          'bg-green-500': gameState === 'landed',
          'bg-red-500': gameState === 'crashed'
        }"
      >
        {{ gameStateLabel }}
      </div>
    </div>
  </div>
</template>
