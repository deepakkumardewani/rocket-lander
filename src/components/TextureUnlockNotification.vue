<script setup lang="ts">
import { Rocket } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";

import { seaTexturesOptions, spaceTexturesOptions } from "../lib/config";
import { useGameStore } from "../stores/gameStore";

const gameStore = useGameStore();
const isVisible = computed(() => gameStore.textureUnlockNotification.show);
const environment = computed(() => gameStore.textureUnlockNotification.environment);
const unlockedTextures = computed(() => gameStore.textureUnlockNotification.textures);

// Animation states
const isAnimating = ref(false);
const animationComplete = ref(false);

// Get texture names for display
const textureNames = computed(() => {
  return unlockedTextures.value.map((texture) => {
    if (environment.value === "sea") {
      const found = seaTexturesOptions.find((opt) => opt.value === texture);
      return found ? found.label : texture;
    } else {
      const found = spaceTexturesOptions.find((opt) => opt.value === texture);
      return found ? found.label : texture;
    }
  });
});

// Dismiss the notification
const dismiss = () => {
  isAnimating.value = false;
  gameStore.dismissUnlockNotification();
};

// Start animation when notification becomes visible
onMounted(() => {
  if (isVisible.value) {
    startAnimation();
  }
});

// Watch for changes in visibility
watch(isVisible, (newValue) => {
  if (newValue) {
    startAnimation();
  } else {
    isAnimating.value = false;
    animationComplete.value = false;
  }
});

// Start the unlock animation
const startAnimation = () => {
  isAnimating.value = true;
  // Set animation complete after animation duration
  setTimeout(() => {
    animationComplete.value = true;
  }, 500);
};
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
  >
    <div
      class="bg-gray-900 border-2 rounded-lg p-5 max-w-md w-full mx-4 transform transition-all duration-500"
      :class="[
        isAnimating ? 'scale-100 opacity-100' : 'scale-90 opacity-0',
        environment === 'sea' ? 'border-blue-400' : 'border-purple-400'
      ]"
    >
      <div class="flex flex-col items-center">
        <!-- Title with environment icon -->
        <div class="flex items-center mb-4">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center mr-3"
            :class="environment === 'sea' ? 'bg-blue-600' : 'bg-purple-600'"
          >
            <Rocket />
          </div>
          <h2 class="text-2xl font-bold text-white">
            New {{ environment === "sea" ? "Boat" : "Platform" }} Unlocked!
          </h2>
        </div>

        <!-- Unlocked textures list with animations -->
        <div class="w-full space-y-2 mb-5">
          <div
            v-for="(name, index) in textureNames"
            :key="index"
            class="bg-gray-800 rounded p-3 flex items-center transform transition-all duration-500"
            :class="animationComplete ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'"
            :style="{ transitionDelay: `${index * 0.15}s` }"
          >
            <div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mr-3">
              <span class="text-white text-sm">✓</span>
            </div>
            <span class="text-white">{{ name }}</span>
            <div class="ml-auto">
              <span class="text-green-400 text-sm">UNLOCKED</span>
            </div>
          </div>
        </div>

        <!-- Action button -->
        <button
          @click="dismiss"
          class="bg-gradient-to-r px-6 py-2 rounded-md text-white font-semibold transition-all hover:scale-105"
          :class="
            environment === 'sea' ? 'from-blue-600 to-blue-400' : 'from-purple-600 to-purple-400'
          "
        >
          Awesome!
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Fade-in animation for the notification panel */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Slide-in animation for unlocked items */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
