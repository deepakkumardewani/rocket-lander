<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from "vue";

import EnvironmentSelector from "./components/EnvironmentSelector.vue";

// import RocketUnlockNotification from "./components/RocketUnlockNotification.vue";
// import TextureUnlockNotification from "./components/TextureUnlockNotification.vue";
import { useGameStore } from "./stores/gameStore";
import { usePresenceStore } from "./stores/presenceStore";
import { useUserStore } from "./stores/userStore";

// Lazy load GameCanvas
const GameCanvas = defineAsyncComponent(() => import("./game/GameCanvas.vue"));

const gameStore = useGameStore();
const userStore = useUserStore();
const presenceStore = usePresenceStore();

// Initialize username from localStorage if available
onMounted(() => {
  userStore.initUsername();
  const userId = localStorage.getItem("rocketLanderUserId");
  const username = localStorage.getItem("rocketLanderUsername");
  if (userId && username) {
    presenceStore.initPresence(userId, username);
  }
});

// Show the game canvas when environment is selected and username is set
const showGameCanvas = computed(() => gameStore.showGameCanvas);

// Show environment selector when username is set but no environment is selected
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
      <Suspense v-else-if="showGameCanvas">
        <GameCanvas @game-end="resetToSelector" />
        <!-- <template #fallback>
          <div class="text-white text-center">Loading game...</div>
        </template> -->
      </Suspense>

      <!-- Unlock Notifications -->
      <!-- <TextureUnlockNotification />
      <RocketUnlockNotification /> -->
    </div>
  </div>
</template>

<style>
@import "./style.css";
</style>
