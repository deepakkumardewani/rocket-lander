<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import type { Environment } from "../types/storeTypes";

import { useGameStore } from "../stores/gameStore";
import { useUserStore } from "../stores/userStore";

const gameStore = useGameStore();
const userStore = useUserStore();

const environmentSelectRef = ref<HTMLSelectElement | null>(null);
const startButtonRef = ref<HTMLButtonElement | null>(null);
const usernameInputRef = ref<HTMLInputElement | null>(null);

// Default to space environment
const selectedEnvironment = ref<Environment>("sea");
const username = ref("");
const errorMessage = ref("");

// Start button is enabled when an environment is selected and username is entered
const isStartButtonDisabled = computed(() => !selectedEnvironment.value || !username.value.trim());

// Update the store when environment is selected
const updateEnvironment = () => {
  gameStore.setEnvironment(selectedEnvironment.value);
};

// Start the game
const startGame = () => {
  // Clear previous error messages
  errorMessage.value = "";

  // Validate username
  if (!username.value.trim()) {
    errorMessage.value = "Please enter your name";
    return;
  }

  if (selectedEnvironment.value) {
    // Save the username
    userStore.setUsername(username.value.trim());
    // Ensure the environment is set
    gameStore.setEnvironment(selectedEnvironment.value);
    // Start the game - this will keep it in waiting state
    gameStore.startGame();
  }
};

// Animation for stars
// const starsRef = ref<HTMLDivElement | null>(null);
let animationFrameId: number | null = null;

// Handle keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  const key = event.key;
  const selectIsFocused = environmentSelectRef.value?.matches(":focus");
  const buttonIsFocused = startButtonRef.value?.matches(":focus");
  const inputIsFocused = usernameInputRef.value?.matches(":focus");

  // If input is not focused and a letter/number is pressed, focus it
  if (!inputIsFocused && event.key.length === 1 && event.key.match(/[a-zA-Z0-9]/)) {
    usernameInputRef.value?.focus();
    return;
  }

  // Only handle keyboard events when our elements are focused
  if (!selectIsFocused && !buttonIsFocused && !inputIsFocused) {
    return;
  }

  // Toggle between environment options with left/right arrow keys when select is focused
  if (selectIsFocused && (key === "ArrowLeft" || key === "ArrowRight")) {
    if (selectedEnvironment.value === "sea") {
      selectedEnvironment.value = "space";
    } else {
      selectedEnvironment.value = "sea";
    }
    updateEnvironment();
    event.preventDefault();
  }

  // Start game with Enter when button is focused
  if (selectIsFocused && key === "Enter" && !isStartButtonDisabled.value) {
    startGame();
    event.preventDefault();
  }
};

onMounted(() => {
  // Focus username input initially
  setTimeout(() => {
    username.value = userStore.username;
    if (userStore.username === "") {
      usernameInputRef.value?.focus();
    } else {
      environmentSelectRef.value?.focus();
    }
  }, 100);

  // Set up keyboard event listener
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  // Clean up keyboard event listener
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="relative flex flex-col items-center justify-center h-full w-full overflow-hidden">
    <!-- Animated background -->
    <div class="absolute inset-0 bg-gradient-to-b from-purple-900 via-blue-900 to-black"></div>

    <!-- Star field (simplified for this component) -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="stars"></div>
    </div>

    <!-- Nebula effect -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="nebula-1"></div>
      <div class="nebula-2"></div>
    </div>

    <!-- Content -->
    <div
      class="relative z-10 flex flex-col items-center justify-center px-8 py-12 rounded-xl bg-gray-900/60 backdrop-blur-lg border border-gray-700 shadow-xl max-w-md w-full"
    >
      <h1
        class="text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500"
      >
        Rocket Lander
      </h1>

      <div class="mb-8 w-full">
        <input
          ref="usernameInputRef"
          v-model="username"
          type="text"
          placeholder="Enter your name"
          class="w-full px-4 py-3 rounded-lg bg-gray-800/80 border border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white backdrop-blur-sm transition-all hover:border-cyan-500 mb-2"
          :class="{ 'border-red-500': errorMessage }"
        />
        <p v-if="errorMessage" class="mt-2 text-red-400 text-sm">{{ errorMessage }}</p>
      </div>

      <div class="mb-8 w-full">
        <label for="environment" class="block text-lg mb-3 text-cyan-100 font-medium"
          >Choose Your Mission Environment:</label
        >
        <select
          ref="environmentSelectRef"
          id="environment"
          v-model="selectedEnvironment"
          @change="updateEnvironment"
          class="w-full px-4 py-3 rounded-lg bg-gray-800/80 border border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white backdrop-blur-sm transition-all hover:border-cyan-500"
        >
          <option value="space">Deep Space</option>
          <option value="sea">Ocean</option>
        </select>
        <p class="mt-2 text-xs text-cyan-200/70">Use ← → arrows to change environment</p>
      </div>

      <button
        ref="startButtonRef"
        @click="startGame"
        :disabled="isStartButtonDisabled"
        class="w-full px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 hover:shadow-lg"
      >
        Launch Mission <span class="opacity-70">(↵)</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.stars {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: radial-gradient(2px 2px at 20px 30px, white, rgba(0, 0, 0, 0)),
    radial-gradient(2px 2px at 40px 70px, white, rgba(0, 0, 0, 0)),
    radial-gradient(2px 2px at 50px 160px, white, rgba(0, 0, 0, 0)),
    radial-gradient(2px 2px at 90px 40px, white, rgba(0, 0, 0, 0)),
    radial-gradient(2px 2px at 130px 80px, white, rgba(0, 0, 0, 0)),
    radial-gradient(2px 2px at 160px 120px, white, rgba(0, 0, 0, 0));
  background-repeat: repeat;
  background-size: 200px 200px;
  animation: twinkle 4s infinite;
}

@keyframes twinkle {
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.5;
  }
}

.nebula-1 {
  position: absolute;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(76, 29, 149, 0.05) 70%,
    rgba(0, 0, 0, 0) 100%
  );
  top: 10%;
  left: -20%;
  filter: blur(30px);
  animation: float 20s infinite alternate;
}

.nebula-2 {
  position: absolute;
  width: 60%;
  height: 60%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(14, 165, 233, 0.1) 0%,
    rgba(139, 92, 246, 0.05) 70%,
    rgba(0, 0, 0, 0) 100%
  );
  bottom: -10%;
  right: -10%;
  filter: blur(30px);
  animation: float 15s infinite alternate-reverse;
}

@keyframes float {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(10%, 10%);
  }
}
</style>
