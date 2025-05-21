<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

import { useGameStore } from "../stores/gameStore";

const gameStore = useGameStore();

const isVisible = ref(false);

// Show instructions on first load
onMounted(() => {
  if (gameStore.isInstructionsFirstLoad) {
    isVisible.value = true;
    gameStore.isInstructionsFirstLoad = false;
  }

  // Add enter key listener
  window.addEventListener("keydown", handleKeyPress);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyPress);
});

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === "Enter" && isVisible.value) {
    closeInstructions();
  }
};

// Function to toggle instruction visibility
const closeInstructions = () => {
  isVisible.value = false;
  emit("instructionsClosed");
};

// Function to show instructions again
const showInstructions = () => {
  isVisible.value = true;
};

// Emit events
const emit = defineEmits<{
  (e: "instructionsClosed"): void;
}>();

// Expose function to parent components
defineExpose({ showInstructions });
</script>

<template>
  <!-- Main instructions overlay -->
  <div v-if="isVisible" class="instructions-overlay">
    <div class="instructions-container">
      <button class="close-button" @click="closeInstructions">×</button>
      <div class="instructions-content">
        <h1 class="title">Welcome to Rocket Lander!</h1>

        <div class="sections-grid">
          <div class="section">
            <h2>Keyboard Controls</h2>
            <ul>
              <li>• <span class="key">←/→</span> : Tilt rocket left/right</li>
              <li>• <span class="key">Space</span> : Apply thrust</li>
              <li>• <span class="key">R</span> : Reset rocket position</li>
              <li>• <span class="key">ESC</span> : Back to environment selection</li>
            </ul>
          </div>

          <div class="section">
            <h2>Camera Control</h2>
            <ul>
              <li>• Click and drag to rotate camera view</li>
              <li>• Scroll to zoom in/out</li>
              <li>• Press the camera icon to switch views</li>
            </ul>
          </div>

          <div class="section">
            <h2>Mission</h2>
            <p>• Land safely on the platform!</p>
          </div>

          <div class="section">
            <h2>Landing Tips</h2>
            <ul>
              <li>• Land slowly with minimal horizontal velocity</li>
              <li>• Keep the rocket upright for a successful landing</li>
              <li>• Monitor your fuel level - don't run out before landing!</li>
              <li>• Use short bursts of thrust for precise control</li>
            </ul>
          </div>
        </div>

        <div class="start-prompt">Press Enter to close</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.instructions-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 15;
  backdrop-filter: blur(1px);
  overflow: hidden;
}

.instructions-container {
  background-color: rgba(0, 10, 30, 0.6);
  border-radius: 16px;
  padding: 2rem;
  max-width: 900px;
  width: 90%;
  color: white;
  border: 2px solid rgba(100, 200, 255, 0.3);
  box-shadow: 0 0 30px rgba(0, 150, 255, 0.3);
  position: relative;
}

.instructions-content {
  position: relative;
}

.sections-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin: 2rem 0;
}

.title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: #4db8ff;
  text-shadow: 0 0 10px rgba(0, 150, 255, 0.8);
}

.section {
  margin-bottom: 1.5rem;
}

h2 {
  font-size: 1.3rem;
  margin-bottom: 0.75rem;
  color: #4db8ff;
  border-bottom: 1px solid rgba(100, 200, 255, 0.3);
  padding-bottom: 0.5rem;
}

ul {
  padding-left: 1.5rem;
}

li {
  margin-bottom: 0.5rem;
}

.key {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.start-prompt {
  text-align: center;
  margin-top: 2rem;
  font-size: 1.5rem;
  color: #4db8ff;
  animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 24px;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.help-button {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(0, 100, 200, 0.8);
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  border: 2px solid rgba(255, 255, 255, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15;
  box-shadow: 0 0 15px rgba(0, 150, 255, 0.5);
  transition: all 0.2s ease;
}

.help-button:hover {
  transform: scale(1.1);
  background-color: rgba(0, 120, 230, 0.9);
}
</style>
