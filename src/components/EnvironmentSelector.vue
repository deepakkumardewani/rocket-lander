<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
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

// Animation for stars
const starsRef = ref<HTMLDivElement | null>(null);
let animationFrameId: number | null = null;

const animateStars = () => {
  if (!starsRef.value) return;

  const stars = starsRef.value.querySelectorAll(".star");
  stars.forEach((star) => {
    const speed = parseFloat((star as HTMLElement).dataset.speed || "0.5");
    let x = parseFloat((star as HTMLElement).style.left || "0");

    // Update star position
    x = (x - speed) % 100;
    if (x < 0) x = 100 + x;

    (star as HTMLElement).style.left = `${x}%`;
  });

  animationFrameId = requestAnimationFrame(animateStars);
};

// Generate stars for the background
const generateStars = () => {
  if (!starsRef.value) return;

  const starsContainer = starsRef.value;
  starsContainer.innerHTML = "";

  // Create a number of stars with random positions and sizes
  for (let i = 0; i < 100; i++) {
    const star = document.createElement("div");
    star.classList.add("star");

    // Random position
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    star.style.left = `${x}%`;
    star.style.top = `${y}%`;

    // Random size
    const size = 0.5 + Math.random() * 2;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;

    // Random speed
    const speed = 0.02 + Math.random() * 0.1;
    star.dataset.speed = speed.toString();

    // Random twinkle animation delay
    const delay = Math.random() * 5;
    star.style.animationDelay = `${delay}s`;

    starsContainer.appendChild(star);
  }

  // Start animation
  animateStars();
};

onMounted(() => {
  generateStars();
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<template>
  <div
    class="relative flex flex-col items-center justify-center h-full w-full overflow-hidden"
  >
    <!-- Animated background -->
    <div
      class="absolute inset-0 bg-gradient-to-b from-purple-900 via-blue-900 to-black"
    ></div>

    <!-- Star field -->
    <div ref="starsRef" class="absolute inset-0 overflow-hidden">
      <!-- Stars will be generated here -->
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
        <label
          for="environment"
          class="block text-lg mb-3 text-cyan-100 font-medium"
          >Choose Your Mission Environment:</label
        >
        <select
          id="environment"
          v-model="selectedEnvironment"
          @change="updateEnvironment"
          class="w-full px-4 py-3 rounded-lg bg-gray-800/80 border border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white backdrop-blur-sm transition-all hover:border-cyan-500"
        >
          <option value="space">Deep Space</option>
          <option value="sea">Ocean Platform</option>
        </select>
      </div>

      <button
        @click="startGame"
        :disabled="isStartButtonDisabled"
        class="w-full px-8 py-4 text-lg font-bold rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 hover:shadow-lg"
      >
        Launch Mission
      </button>
    </div>
  </div>
</template>

<style scoped>
.star {
  position: absolute;
  background-color: white;
  border-radius: 50%;
  animation: twinkle 3s infinite alternate;
}

@keyframes twinkle {
  0% {
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.2;
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
