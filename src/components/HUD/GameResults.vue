<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useGameStore } from "../../stores/gameStore";

const gameStore = useGameStore();
const { score, gameState, currentLevel, isLevelCompleted, crashMetrics, totalLevels } =
  storeToRefs(gameStore);

// Format velocity for crash display
const formatVelocity = (velocity: { x: number; y: number; z: number }) => {
  return {
    x: velocity.x.toFixed(2),
    y: velocity.y.toFixed(2),
    z: velocity.z.toFixed(2)
  };
};

// Function to handle next level button
const handleNextLevel = () => {
  if (currentLevel.value < totalLevels.value) {
    // Set the next level
    gameStore.setCurrentLevel(currentLevel.value + 1);
    // Reset game state with a resetRocket flag to ensure the rocket gets repositioned
    gameStore.resetGame();
  }
};

// Function to replay current level
const handleReplay = () => {
  // Reset game state - this will set it back to "waiting" state
  gameStore.resetGame();
};

const handleRestartGame = () => {
  // Set back to level 1
  gameStore.setCurrentLevel(1);
  // Reset game state
  gameStore.resetGame();
};
</script>

<template>
  <div
    v-if="gameState === 'landed' || gameState === 'crashed'"
    class="bg-[rgba(23,23,23,0.8)] backdrop-blur-md border border-white/10 rounded-lg p-4 text-center shadow-lg"
  >
    <div v-if="gameState === 'landed'" class="text-emerald-400">
      <div class="text-3xl mb-2 text-shadow-lg">🎯</div>
      <div class="font-bold text-xl mb-3 tracking-wider">MISSION COMPLETE</div>
      <div
        class="flex justify-between bg-emerald-400/10 border border-emerald-400/20 rounded p-2 px-3 text-white"
      >
        <span class="text-xl font-semibold tracking-wider">SCORE</span>
        <span class="text-xl font-bold tabular-nums">{{ score }}</span>
      </div>

      <div
        v-if="isLevelCompleted && currentLevel === totalLevels"
        class="text-purple-400 font-semibold py-2 text-center"
      >
        All Levels Completed!
      </div>
      <!-- Add level progression controls -->
      <div class="flex flex-row gap-2 mt-4">
        <button
          v-if="isLevelCompleted && currentLevel < totalLevels"
          @click="handleNextLevel"
          class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Next Level [N]
        </button>
        <button
          v-else
          @click="handleRestartGame"
          class="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Restart Game
        </button>
        <button
          @click="handleReplay"
          class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Replay [R]
        </button>
        <template v-if="isLevelCompleted && currentLevel === totalLevels">
          <!-- <div class="text-purple-400 font-semibold py-2 text-center">
            All Levels Completed!
          </div> -->
          <div class="flex gap-2">
            <!-- <button
              @click="handleRestartGame"
              class="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              Restart Game
            </button> -->
            <!-- <button
              @click="handleReplay"
              class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              Replay [R]
            </button> -->
          </div>
        </template>

        <!-- <button
          v-else
          @click="handleReplay"
          class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Replay [R]
        </button> -->
      </div>
    </div>

    <div v-else class="text-red-400">
      <div class="text-3xl mb-2 text-shadow-lg">💥</div>
      <div class="font-bold text-xl mb-3 tracking-wider">MISSION FAILED</div>
      <div class="text-sm text-white/80 font-medium mb-2">Your rocket crashed!</div>

      <!-- Crash Velocity Display -->
      <div v-if="crashMetrics" class="bg-red-400/10 border border-red-400/20 rounded p-2 mb-4">
        <div class="text-xs text-white/80 mb-1">Landing too hard</div>
        <div class="flex justify-center text-sm">
          <div class="font-bold">{{ formatVelocity(crashMetrics.velocity).y }} m/s</div>
        </div>
      </div>

      <!-- Add retry control -->
      <div class="flex gap-2">
        <button
          @click="handleReplay"
          class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Retry [R]
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-shadow-lg {
  text-shadow: 0 0 10px currentColor;
}
</style>
