<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted, watch } from "vue";

import { useGameStore } from "../../stores/gameStore";
import { useLeaderboardStore } from "../../stores/leaderboardStore";

const gameStore = useGameStore();
const leaderboardStore = useLeaderboardStore();
const {
  score,
  gameState,
  currentLevel,
  isLevelCompleted,
  crashMetrics,
  landingMetrics,
  totalLevels,
  environment,
  fuel,
  rocketModel
} = storeToRefs(gameStore);

// Format velocity for display
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

// Submit score to leaderboard on successful landing
const submitScoreToLeaderboard = async () => {
  if (gameState.value !== "landed" || !landingMetrics.value) return;

  const userId = localStorage.getItem("rocketLanderUserId");
  const username = localStorage.getItem("rocketLanderUsername");

  if (!userId || !username) return;

  await leaderboardStore.submitScore({
    uuid: userId,
    username: username,
    score: score.value,
    environment: environment.value,
    rocketId: rocketModel.value.id,
    fuelRemaining: fuel.value,
    landingVelocity: Math.abs(landingMetrics.value.velocity.y)
  });
};

// Watch for successful landings and submit score
watch(
  () => gameState.value,
  (newState) => {
    if (newState === "landed") {
      submitScoreToLeaderboard();
    }
  }
);

// Also check on component mount in case we missed the state change
onMounted(() => {
  if (gameState.value === "landed") {
    submitScoreToLeaderboard();
  }
});
</script>

<template>
  <div
    v-if="gameState === 'landed' || gameState === 'crashed'"
    class="bg-[rgba(23,23,23,0.8)] backdrop-blur-md border border-white/10 rounded-lg p-4 text-center shadow-lg"
  >
    <div v-if="gameState === 'landed'" class="text-emerald-400">
      <div class="flex flex-row gap-2 items-center justify-center mb-2">
        <div class="text-3xl text-shadow-lg">🎯</div>
        <div class="font-bold text-xl tracking-wider justify-center items-center">
          MISSION COMPLETE
        </div>
      </div>
      <div
        class="flex justify-between bg-emerald-400/10 border border-emerald-400/20 rounded p-2 px-3 text-white"
      >
        <span class="text-xl font-semibold tracking-wider">SCORE</span>
        <span class="text-xl font-bold tabular-nums">{{ score }}</span>
      </div>

      <!-- Landing Velocity Display -->
      <div
        v-if="landingMetrics"
        class="bg-emerald-400/10 border border-emerald-400/20 rounded p-2 my-3"
      >
        <div class="text-xs text-white/80 mb-1">Landing Velocity</div>
        <div class="flex justify-center text-sm">
          <div class="font-bold">{{ formatVelocity(landingMetrics.velocity).y }} m/s</div>
        </div>
      </div>

      <!-- Leaderboard Status - show if score submitted -->
      <div v-if="score > 150" class="text-sm text-yellow-400 my-2">
        Score added to leaderboard! 🏆
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
