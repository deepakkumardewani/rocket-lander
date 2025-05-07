<script setup lang="ts">
import { computed, watch } from "vue";

import EnvironmentSelector from "./components/EnvironmentSelector.vue";
import TextureUnlockNotification from "./components/TextureUnlockNotification.vue";
import GameCanvas from "./game/GameCanvas.vue";

import { useGameStore } from "./stores/gameStore";

const gameStore = useGameStore();

// For debugging
console.log("Initial environment:", gameStore.environment);
watch(
  () => gameStore.environment,
  (newEnv) => {
    console.log("Environment changed to:", newEnv);
  }
);

// Show the game canvas when environment is selected
const showGameCanvas = computed(() => gameStore.showGameCanvas);

// Show environment selector when no environment is selected
const showEnvironmentSelector = computed(() => gameStore.showGameCanvas === false);

// Reset game to environment selection when game ends
const resetToSelector = () => {
  gameStore.resetToSelection();
};
</script>

<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <div class="w-full h-screen">
      <!-- Environment Selection UI -->
      <EnvironmentSelector v-if="showEnvironmentSelector" />

      <!-- Game Canvas -->
      <GameCanvas v-if="showGameCanvas" @game-end="resetToSelector" />

      <!-- Unlock Notification -->
      <TextureUnlockNotification />
    </div>
  </div>
</template>

<style>
@import "./style.css";
</style>
