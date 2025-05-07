<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { seaTexturesOptions, spaceTexturesOptions } from "../../lib/config";
import { useGameStore } from "../../stores/gameStore";
import type { TextureType } from "../../types/storeTypes";

const gameStore = useGameStore();
const { textureChoice, environment, gameState, unlockedTextures } = storeToRefs(gameStore);

// Compute platform name based on environment
const platformName = computed(() => {
  return environment.value === "sea" ? "Boat" : "Platform";
});

// Filter texture options to only show unlocked ones
const textureOptions = computed(() => {
  if (environment.value === "sea") {
    return seaTexturesOptions.filter((option) =>
      unlockedTextures.value.sea.includes(option.value as TextureType)
    );
  } else {
    return spaceTexturesOptions.filter((option) =>
      unlockedTextures.value.space.includes(option.value as TextureType)
    );
  }
});

// Game state label with proper formatting
const gameStateLabel = computed(() => {
  const state = gameState.value;
  return state.charAt(0).toUpperCase() + state.slice(1);
});

// Handle texture change
const changeTexture = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  gameStore.setTextureChoice(select.value as TextureType);
};
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

    <!-- Texture selection dropdown -->
    <div class="flex items-center gap-2">
      <label for="texture-choice" class="text-xs opacity-90">{{ platformName }}:</label>
      <select
        id="texture-choice"
        v-model="textureChoice"
        @change="changeTexture"
        class="bg-[rgba(45,45,45,0.7)] border border-white/20 text-white rounded px-1.5 py-0.5 text-xs cursor-pointer outline-none focus:border-indigo-500/80 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.2)]"
      >
        <option v-for="option in textureOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>
  </div>
</template>
