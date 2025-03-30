<script setup lang="ts">
import { useGameStore } from "../stores/gameStore";
import { storeToRefs } from "pinia";
import type { TextureType } from "../stores/gameStore";

// Get the game store to access fuel, score, and game state
const gameStore = useGameStore();
const { score, gameState, textureChoice } = storeToRefs(gameStore);

// Texture options for UI display
const textureOptions = [
  { value: "metal", label: "Metal" },
  { value: "neon", label: "Neon" },
];

// Handle texture change
const changeTexture = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  gameStore.setTextureChoice(select.value as TextureType);
};
</script>

<template>
  <div class="absolute bottom-4 right-4">
    <!-- Fuel bar -->
    <div class="w-64 bg-gray-200 h-4 rounded">
      <div
        class="bg-green-500 h-4 rounded"
        :style="`width: ${gameStore.fuel}%`"
      ></div>
    </div>

    <!-- Fuel text -->
    <p class="text-white">Fuel: {{ Math.floor(gameStore.fuel) }}</p>

    <!-- Texture selection -->
    <div class="mt-2 max-w-40">
      <select
        v-model="textureChoice"
        @change="changeTexture"
        class="bg-gray-700 text-white rounded px-2 py-1 text-sm w-full"
      >
        <option
          v-for="option in textureOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>

    <!-- Score display (shown when landed or crashed) -->
    <div v-if="gameState === 'landed' || gameState === 'crashed'" class="mt-2">
      <p class="text-white text-lg font-bold">
        {{ gameState === "landed" ? "Score: " + score : "Crashed!" }}
      </p>
      <p class="text-white text-sm" v-if="gameState === 'crashed'">
        Press 'R' to try again
      </p>
    </div>

    <!-- Game state indicator -->
    <div
      class="mt-2 px-2 py-1 rounded text-xs font-medium"
      :class="{
        'bg-yellow-500': gameState === 'pre-launch',
        'bg-blue-500': gameState === 'flying',
        'bg-green-500': gameState === 'landed',
        'bg-red-500': gameState === 'crashed',
      }"
    >
      {{
        gameStore.gameState.charAt(0).toUpperCase() +
        gameStore.gameState.slice(1)
      }}
    </div>
  </div>
</template>
