<script setup lang="ts">
import { Rocket } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { vue3dLoader } from "vue-3d-loader";
import ConfettiExplosion from "vue-confetti-explosion";

import { useGameStore } from "../stores/gameStore";

import { rocketModels } from "../lib/rocketConfig";

const gameStore = useGameStore();
const isVisible = computed(() => gameStore.rocketUnlockNotification.show);
const unlockedRockets = computed(() => gameStore.rocketUnlockNotification.rockets);

// Animation states
const isAnimating = ref(false);
const animationComplete = ref(false);
const isModelLoading = ref(true);
const rotationAnimationId = ref<number | null>(null);

// Get rocket name for display
const rocketName = computed(() => {
  const rocketId = unlockedRockets.value[0];
  const found = rocketModels.find((model) => model.id === rocketId);
  return found ? found.name : rocketId;
});

// Get the unlocked rocket model
const unlockedModel = computed(() => {
  const rocketId = unlockedRockets.value[0];
  return rocketModels.find((model) => model.id === rocketId);
});

// Compute the model properties
const cameraPosition = computed(() => unlockedModel.value?.cameraPosition || { x: 0, y: 0, z: 10 });
const position = computed(() => unlockedModel.value?.position || { x: 0, y: 0, z: 0 });
const lights = computed(
  () =>
    unlockedModel.value?.lights || [
      {
        type: "AmbientLight",
        color: "white"
      },
      {
        type: "DirectionalLight",
        position: { x: 100, y: 10, z: 100 },
        color: "#fffff0",
        intensity: 0.8
      }
    ]
);
const scale = computed(() => unlockedModel.value?.scale || { x: 0.9, y: 0.9, z: 0.9 });

// Controls for 3D viewer
const enablePan = ref(false);
const enableZoom = ref(false);
const enableRotate = ref(false);
const rotation = ref({
  x: 0,
  y: 0,
  z: 0
});

// Dismiss the notification
const dismiss = () => {
  if (rotationAnimationId.value) {
    cancelAnimationFrame(rotationAnimationId.value);
  }
  isAnimating.value = false;
  gameStore.dismissRocketUnlockNotification();
};

// Start animation when notification becomes visible
onMounted(() => {
  if (isVisible.value) {
    startAnimation();
    rotate();
  }
});

// Clean up on unmount
onUnmounted(() => {
  if (rotationAnimationId.value) {
    cancelAnimationFrame(rotationAnimationId.value);
  }
});

// Watch for changes in visibility
watch(isVisible, (newValue) => {
  if (newValue) {
    startAnimation();
    rotate();
  } else {
    isAnimating.value = false;
    animationComplete.value = false;
    if (rotationAnimationId.value) {
      cancelAnimationFrame(rotationAnimationId.value);
    }
  }
});

// Rotate the model
function rotate() {
  rotationAnimationId.value = requestAnimationFrame(rotate);
  if (unlockedModel.value?.id === "falcon_heavy") {
    rotation.value.y = 0;
  } else {
    rotation.value.y -= 0.009;
  }
}

// Start the unlock animation
const startAnimation = () => {
  isAnimating.value = true;
  // Set animation complete after animation duration
  setTimeout(() => {
    animationComplete.value = true;
  }, 500);
};

// Handle model load event
function onLoad() {
  isModelLoading.value = false;
}
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
  >
    <div
      class="bg-gray-900 border-2 border-red-400 rounded-lg p-5 max-w-md w-full mx-4 transform transition-all duration-500"
      :class="[isAnimating ? 'scale-100 opacity-100' : 'scale-90 opacity-0']"
    >
      <div class="flex flex-col items-center">
        <!-- Title with rocket icon -->
        <div class="flex items-center mb-4">
          <div class="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center mr-3">
            <Rocket />
          </div>
          <h2 class="text-2xl font-bold text-white">New Rocket Unlocked!</h2>
        </div>

        <!-- 3D Model Display -->
        <div
          v-if="unlockedModel"
          class="relative w-full h-48 bg-black rounded-lg mb-4 overflow-hidden"
        >
          <vue3dLoader
            :file-path="unlockedModel.url"
            :background-color="0x000000"
            :background-alpha="1"
            :rotation="rotation"
            :controlsOptions="{
              enablePan,
              enableZoom,
              enableRotate
            }"
            @load="onLoad"
            :position="position"
            :scale="scale"
            :cameraPosition="cameraPosition"
            :lights="lights"
            class="w-full h-full"
          ></vue3dLoader>
        </div>

        <!-- Rocket name and description -->
        <!-- <div class="text-center mb-5">
          <h3 class="text-xl font-bold text-white">{{ unlockedModel?.name }}</h3>
        </div> -->

        <!-- Unlocked rocket item with animation -->
        <div
          class="w-full bg-gray-800 rounded p-3 flex items-center transform transition-all duration-500 mb-5"
          :class="animationComplete ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'"
        >
          <div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mr-3">
            <span class="text-white text-sm">✓</span>
          </div>
          <span class="text-white">{{ rocketName }}</span>
          <div class="ml-auto">
            <span class="text-green-400 text-sm">UNLOCKED</span>
          </div>
        </div>

        <!-- Action button -->
        <button
          @click="dismiss"
          class="bg-gradient-to-r from-red-600 to-red-400 px-6 py-2 rounded-md text-white font-semibold transition-all hover:scale-105"
        >
          Awesome!
        </button>
      </div>
    </div>
    <div class="fixed inset-0 -z-10 flex items-center justify-center">
      <ConfettiExplosion />
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
