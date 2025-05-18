<script setup lang="ts">
import { ref } from "vue";

import Leaderboard from "./Leaderboard.vue";

const showLeaderboard = ref(false);

const openDialog = () => {
  showLeaderboard.value = true;
};
const closeDialog = () => {
  showLeaderboard.value = false;
};
</script>

<template>
  <!-- Leaderboard Button -->
  <button @click="openDialog" title="Leaderboard" class="leaderboard-button">
    <span class="text-xl">🏆</span>
  </button>

  <!-- Leaderboard Modal -->
  <div
    v-if="showLeaderboard"
    class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20"
  >
    <div class="w-full max-w-4xl mx-4 relative">
      <button @click="closeDialog" class="absolute -top-12 right-0 text-white hover:text-red-400">
        Close ✕
      </button>
      <Leaderboard />
    </div>
  </div>
</template>

<style scoped>
.leaderboard-button {
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-family: "Arial", sans-serif;
  font-weight: 500;
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  z-index: 20;
  border: 2px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.leaderboard-button:hover {
  background-color: rgba(0, 0, 0, 0.85);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
