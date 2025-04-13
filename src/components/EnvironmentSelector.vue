<script setup lang="ts">
import { ref, computed } from "vue";
import { useGameStore, type Environment } from "../stores/gameStore";

const gameStore = useGameStore();

// Default to space environment
const selectedEnvironment = ref<Environment>("sea");

// Start button is enabled when an environment is selected
const isStartButtonDisabled = computed(() => !selectedEnvironment.value);

// Update the store when environment is selected
const updateEnvironment = () => {
  gameStore.setEnvironment(selectedEnvironment.value);
};

// Start the game
const startGame = () => {
  if (selectedEnvironment.value) {
    // Ensure the environment is set
    gameStore.setEnvironment(selectedEnvironment.value);
    // Start the game - this will keep it in waiting state
    gameStore.startGame();
  }
};
</script>

<template>
  <div
    class="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-6"
  >
    <h1 class="text-4xl font-bold mb-8">Rocket Lander</h1>

    <div class="mb-6 w-64">
      <label for="environment" class="block text-lg mb-2"
        >Select Environment:</label
      >
      <select
        id="environment"
        v-model="selectedEnvironment"
        @change="updateEnvironment"
        class="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="space">Space</option>
        <option value="sea">Sea</option>
      </select>
    </div>

    <button
      @click="startGame"
      :disabled="isStartButtonDisabled"
      class="px-8 py-3 text-lg font-semibold rounded bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      Start Game
    </button>
  </div>
</template>
