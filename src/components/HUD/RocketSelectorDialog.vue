<script setup lang="ts">
import { ArrowLeft, ArrowRight, CheckCircle, Lock, X } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { vue3dLoader } from "vue-3d-loader";

import type { RocketAchievements, RocketModel } from "../../types/storeTypes";

import { useGameStore } from "../../stores/gameStore";

import { assetLoader } from "../../utils/assetLoader";

import { rocketAchievements } from "../../lib/rocketConfig";
import { rocketModels } from "../../lib/rocketConfig";

const gameStore = useGameStore();

const isHidden = ref(false);
const isOpen = ref(false);
const isViewerOpen = ref(false);
const currentIndex = ref(0);
const selectedModel = ref<RocketModel>(rocketModels[0]);
const isModelLoading = ref(true);
const rotationAnimationId = ref<number | null>(null);
const enablePan = ref(false);
const enableZoom = ref(false);
const enableRotate = ref(false);
const rotation = ref({
  x: 0,
  y: 0,
  z: 0
});

// Compute the currently displayed model
const currentModel = computed(() => rocketModels[currentIndex.value]);
const cameraPosition = computed(() => currentModel.value.cameraPosition);
const position = computed(() => currentModel.value.position);
const lights = computed(() => currentModel.value.lights);
const scale = computed(() => currentModel.value.scale);

// Check if this is the first or last rocket to enable/disable navigation buttons
const isFirst = computed(() => currentIndex.value === 0);
const isLast = computed(() => currentIndex.value === rocketModels.length - 1);

// Check if current model is selected
const isSelected = computed(() => currentModel.value.id === selectedModel.value.id);

// Check if current model is unlocked
const isUnlocked = computed(() => gameStore.isRocketUnlocked(currentModel.value.id));

// Get unlock requirements for the current rocket model
const unlockRequirements = computed(() => {
  if (isUnlocked.value) {
    return null; // Already unlocked
  }

  const rocketId = currentModel.value.id;
  return (rocketAchievements as RocketAchievements)[rocketId]?.requirements || [];
});

// Check which requirements are completed for the current rocket
const completedRequirements = computed(() => {
  if (!unlockRequirements.value) return [];

  const rocketId = currentModel.value.id;

  // Use specific checker functions for each rocket type
  switch (rocketId) {
    case "vintage":
      return checkVintageRequirements();
    case "sci_fi":
      return checkSciFiRequirements();
    case "grasshopper":
      return checkGrasshopperRequirements();
    case "starship":
      return checkStarshipRequirements();
    case "falcon_heavy":
      return checkFalconHeavyRequirements();
    default:
      return unlockRequirements.value.map(() => false);
  }
});

// Check vintage rocket requirements
function checkVintageRequirements() {
  return [
    gameStore.completedSeaLevels >= 3,
    gameStore.achievements.highFuelLandings > 0,
    gameStore.achievements.highScores.some((score) => score > 150)
  ];
}

// Check sci-fi rocket requirements
function checkSciFiRequirements() {
  return [
    gameStore.completedSpaceLevels >= gameStore.totalLevels,
    gameStore.achievements.lowVelocityLandings > 0,
    gameStore.achievements.perfectLandings > 0
  ];
}

// Check grasshopper rocket requirements
function checkGrasshopperRequirements() {
  return [
    gameStore.achievements.completedAllLevels,
    gameStore.achievements.lowVelocityLandings >= 3,
    gameStore.achievements.highFuelLandings > 0 && gameStore.fuel >= 70
  ];
}

// Check starship rocket requirements
function checkStarshipRequirements() {
  return [
    gameStore.completedSeaLevels >= gameStore.totalLevels * 2 &&
      gameStore.completedSpaceLevels >= gameStore.totalLevels * 2,
    gameStore.achievements.highScores.filter((score) => score > 200).length >= 3,
    gameStore.achievements.totalLandings >= 10
  ];
}

// Check falcon heavy rocket requirements
function checkFalconHeavyRequirements() {
  const otherRockets = ["classic", "vintage", "sci_fi", "grasshopper", "starship"];
  return [
    gameStore.achievements.perfectLandings >= 5,
    gameStore.achievements.highFuelLandings > 0 && gameStore.fuel >= 80,
    otherRockets.every((id) => gameStore.isRocketUnlocked(id))
  ];
}

// Preload all rocket models in the background to improve user experience
const preloadRocketModels = async () => {
  try {
    // We'll load the current model first, then load others in background
    const currentUrl = gameStore.rocketModelUrl;
    await assetLoader.getOrLoadModelByUrl(currentUrl, "rocket");

    // Then load the rest in the background (no await)
    for (const model of rocketModels) {
      if (model.url !== currentUrl) {
        // Use a unique key for each model based on ID
        assetLoader.getOrLoadModelByUrl(model.url, `rocket-${model.id}`);
      }
    }
  } catch (error) {
    console.error("Error preloading rocket models:", error);
  }
};

// Open the dialog
const openDialog = () => {
  isOpen.value = true;
  // Find index of selected model
  const index = rocketModels.findIndex((model) => model.id === selectedModel.value.id);
  if (index !== -1) {
    currentIndex.value = index;
  }
};

// Close the dialog
const closeDialog = () => {
  isOpen.value = false;
};

// Navigate to previous rocket
const prevRocket = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    isHidden.value = true;
    isModelLoading.value = true;

    setTimeout(() => {
      isHidden.value = false;
    }, 1);
  }
};

// Navigate to next rocket
const nextRocket = () => {
  if (currentIndex.value < rocketModels.length - 1) {
    currentIndex.value++;
    isHidden.value = true;
    isModelLoading.value = true;

    setTimeout(() => {
      isHidden.value = false;
    }, 1);
  }
};

// Select the current rocket
const selectRocket = () => {
  if (isUnlocked.value) {
    selectedModel.value = currentModel.value;
    gameStore.setRocketModel(currentModel.value);
    closeDialog();
  }
};

// Open the fullscreen viewer for a model
const openViewer = () => {
  isViewerOpen.value = true;
  // Reset autoRotate in full screen viewer
  // viewerControls.value.autoRotate = true
};

// Close the fullscreen viewer
const closeViewer = () => {
  isViewerOpen.value = false;
};

// Handle model load event
function onLoad() {
  // console.log('onLoad')
  // isModelLoading.value = false
}
function rotate() {
  rotationAnimationId.value = requestAnimationFrame(rotate);
  if (currentModel.value.id === "falcon_heavy") {
    rotation.value.y = 0;
  } else {
    rotation.value.y -= 0.009;
  }
}

onMounted(() => {
  rotate();
  // Set the selected model based on the current URL in the store
  const currentUrl = gameStore.rocketModelUrl;
  const matchingModel = rocketModels.find((model) => model.url === currentUrl);
  if (matchingModel) {
    selectedModel.value = matchingModel;
  }

  // Start preloading models
  preloadRocketModels();
});

onUnmounted(() => {
  if (rotationAnimationId.value) {
    cancelAnimationFrame(rotationAnimationId.value);
  }
});
</script>

<template>
  <!-- Trigger button to open dialog -->
  <!-- Back to Selection Button -->
  <div class="rocket-selector-button" @click="openDialog">Change Rocket</div>
  <!-- <div class="rocket-selector bg-black bg-opacity-50 p-3 rounded-lg backdrop-blur-sm">
    <button
      @click="openDialog"
      class="w-full bg-black bg-opacity-50 text-white p-2 rounded border border-white border-opacity-20 focus:outline-none flex items-center justify-between"
    >
      <span>{{ selectedModel.name }}</span>
      <span>▼</span>
    </button>
  </div> -->

  <!-- Rocket selector dialog -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 h-screen w-full"
  >
    <div class="bg-gray-900 h-[90%] rounded-lg p-5 max-w-4xl w-full flex flex-col">
      <div class="flex items-center mb-4">
        <div class="flex-1 flex items-center justify-center">
          <h3 class="text-white text-xl font-semibold">
            {{ currentModel.name }}
          </h3>
        </div>

        <button @click="closeDialog" class="text-white hover:text-gray-300">
          <X class="h-6 w-6" />
        </button>
      </div>

      <div class="flex items-center flex-1 overflow-hidden">
        <!-- Left navigation button -->
        <button
          @click="prevRocket"
          :disabled="isFirst"
          class="bg-gray-800 p-2 rounded-full text-white mr-4 focus:outline-none shrink-0"
          :class="{
            'opacity-30 cursor-not-allowed': isFirst,
            'hover:bg-gray-700': !isFirst
          }"
        >
          <ArrowLeft class="h-6 w-6" />
        </button>

        <!-- Rocket display -->
        <div class="flex-1 bg-gray-800 rounded-lg p-4 h-full flex flex-col overflow-hidden">
          <!-- 3D Model preview container -->
          <div
            class="flex-1 rounded bg-black flex items-center justify-center relative mb-4"
            style="min-height: 300px"
          >
            <vue3dLoader
              v-if="!isHidden"
              :background-color="0x000000"
              :background-alpha="1"
              :filePath="currentModel.url"
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
              :height="300"
              :width="700"
              :lights="lights"
              class="flex items-center justify-center"
              :class="{ 'opacity-60': !isUnlocked }"
            ></vue3dLoader>

            <!-- Lock overlay for locked rockets -->
            <div v-if="!isUnlocked" class="absolute inset-0 flex items-center justify-center">
              <div class="bg-black bg-opacity-50 p-3 rounded-full">
                <Lock class="h-12 w-12 text-white" />
              </div>
            </div>
          </div>

          <!-- Unlock requirements for locked rockets -->
          <div v-if="!isUnlocked && unlockRequirements" class="mt-1 mb-4 text-white">
            <div class="text-center font-semibold mb-3 text-amber-400">UNLOCK REQUIREMENTS</div>
            <ul class="space-y-2">
              <li
                v-for="(requirement, index) in unlockRequirements"
                :key="index"
                class="flex items-center gap-3 pl-4"
              >
                <div v-if="completedRequirements[index]" class="text-green-500 flex-shrink-0">
                  <CheckCircle class="h-5 w-5" />
                </div>
                <div
                  v-else
                  class="text-gray-500 flex-shrink-0 border border-gray-500 rounded-full h-5 w-5 flex items-center justify-center"
                ></div>
                <span
                  :class="{
                    'text-green-400': completedRequirements[index],
                    'text-gray-300': !completedRequirements[index]
                  }"
                >
                  {{ requirement }}
                </span>
              </li>
            </ul>
          </div>

          <!-- Buttons -->
          <div class="flex justify-center mt-auto space-x-4 py-2">
            <button
              @click="selectRocket"
              class="px-4 py-2 rounded text-white focus:outline-none"
              :class="{
                'bg-green-600 hover:bg-green-700': isSelected,
                'bg-blue-600 hover:bg-blue-700': !isSelected && isUnlocked,
                'bg-blue-600 opacity-50 cursor-not-allowed': !isUnlocked
              }"
            >
              <span v-if="isSelected">Selected</span>
              <span v-else-if="isUnlocked">Select</span>
              <span v-else>Select</span>
            </button>
            <button
              @click="openViewer"
              class="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 focus:outline-none"
            >
              View
            </button>
          </div>
        </div>

        <!-- Right navigation button -->
        <button
          @click="nextRocket"
          :disabled="isLast"
          class="bg-gray-800 p-2 rounded-full text-white ml-4 focus:outline-none shrink-0"
          :class="{
            'opacity-30 cursor-not-allowed': isLast,
            'hover:bg-gray-700': !isLast
          }"
        >
          <ArrowRight class="h-6 w-6" />
        </button>
      </div>
    </div>
  </div>

  <!-- Fullscreen model viewer -->
  <div v-if="isViewerOpen" class="fixed inset-0 z-50 bg-black">
    <div class="absolute top-4 right-4 z-10">
      <button
        @click="closeViewer"
        class="bg-red-600 p-2 rounded-full text-white hover:bg-red-700 focus:outline-none"
      >
        <X class="h-6 w-6" />
      </button>
    </div>
    <div class="w-full h-full">
      <vue3dLoader
        :file-path="currentModel.url"
        :background-color="0x111111"
        :background-alpha="1"
        :rotation="rotation"
        :position="position"
        :scale="scale"
        :enableDamping="true"
        :dampingFactor="0.05"
        class="w-full h-full"
      ></vue3dLoader>
    </div>
  </div>
</template>

<style scoped>
.rocket-selector {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.rocket-selector-button {
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

.rocket-selector-button:hover {
  background-color: rgba(0, 0, 0, 0.85);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.rocket-selector-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
