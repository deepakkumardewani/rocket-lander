<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useGameStore } from "../../stores/gameStore";
import { assetLoader } from "../../utils/assetLoader";
import { rocketModels } from "../../lib/config";
import type { RocketModel } from "../../types/storeTypes";
import { vue3dLoader } from "vue-3d-loader";
import { ArrowLeft, ArrowRight, X } from "lucide-vue-next";
const gameStore = useGameStore();

const isOpen = ref(false);
const isViewerOpen = ref(false);
const currentIndex = ref(0);
const selectedModel = ref<RocketModel>(rocketModels[0]);
const isModelLoading = ref(true);
const rotationAnimationId = ref<number | null>(null);
const cameraPosition = ref<{ x: number; y: number; z: number } | null>(null);
const position = ref<{ x: number; y: number; z: number } | null>(null);
const scale = ref({ x: 1, y: 1, z: 1 });
const enablePan = ref(false);
const enableZoom = ref(false);
const enableRotate = ref(false);
const rotation = ref({
  x: 0,
  y: 0,
  z: 0,
});
const viewerControls = ref({
  rotation: { x: 0, y: 0, z: 0 },
  position: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  autoRotate: true,
  autoRotateSpeed: 1,
  zoom: 1,
});

// Compute the currently displayed model
const currentModel = computed(() => rocketModels[currentIndex.value]);

// Check if this is the first or last rocket to enable/disable navigation buttons
const isFirst = computed(() => currentIndex.value === 0);
const isLast = computed(() => currentIndex.value === rocketModels.length - 1);

// Check if current model is selected
const isSelected = computed(
  () => currentModel.value.id === selectedModel.value.id
);

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
  const index = rocketModels.findIndex(
    (model) => model.id === selectedModel.value.id
  );
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
    isModelLoading.value = true;
  }
};

// Navigate to next rocket
const nextRocket = () => {
  if (currentIndex.value < rocketModels.length - 1) {
    currentIndex.value++;
    isModelLoading.value = true;
  }
};

// Select the current rocket
const selectRocket = () => {
  selectedModel.value = currentModel.value;
  gameStore.setRocketModel(currentModel.value);
  closeDialog();
};

// Open the fullscreen viewer for a model
const openViewer = () => {
  isViewerOpen.value = true;
  // Reset autoRotate in full screen viewer
  viewerControls.value.autoRotate = true;
};

// Close the fullscreen viewer
const closeViewer = () => {
  isViewerOpen.value = false;
};

// Handle model load event
function onLoad() {
  console.log("onLoad");
  //   rotate();
}
function rotate() {
  rotationAnimationId.value = requestAnimationFrame(rotate);
  if (currentModel.value.id === "falcon_heavy") {
    rotation.value.y = 0;
  } else {
    rotation.value.y -= 0.009;
  }
}

watch(currentModel, () => {
  if (currentModel.value.id === "falcon_heavy") {
    position.value = currentModel.value.position;
    cameraPosition.value = currentModel.value.cameraPosition;
  } else {
    position.value = currentModel.value.position;
    cameraPosition.value = currentModel.value.cameraPosition;
  }
});

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
  <div
    class="rocket-selector bg-black bg-opacity-50 p-3 rounded-lg backdrop-blur-sm"
  >
    <button
      @click="openDialog"
      class="w-full bg-black bg-opacity-50 text-white p-2 rounded border border-white border-opacity-20 focus:outline-none flex items-center justify-between"
    >
      <span>{{ selectedModel.name }}</span>
      <span>▼</span>
    </button>
  </div>

  <!-- Rocket selector dialog -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 h-screen w-full"
  >
    <div class="bg-gray-900 h-[90%] rounded-lg p-5 max-w-4xl w-full">
      <div class="flex items-center mb-4">
        <div class="flex-1 flex items-center justify-center">
          <h3 class="text-white text-lg font-semibold">
            {{ currentModel.name }}
          </h3>
        </div>

        <button @click="closeDialog" class="text-white hover:text-gray-300">
          <X class="h-6 w-6" />
        </button>
      </div>

      <div class="flex items-center">
        <!-- Left navigation button -->
        <button
          @click="prevRocket"
          :disabled="isFirst"
          class="bg-gray-800 p-2 rounded-full text-white mr-4 focus:outline-none"
          :class="{
            'opacity-30 cursor-not-allowed': isFirst,
            'hover:bg-gray-700': !isFirst,
          }"
        >
          <ArrowLeft class="h-6 w-6" />
        </button>

        <!-- Rocket display -->
        <div class="flex-1 bg-gray-800 rounded-lg p-4 h-full flex flex-col">
          <!-- 3D Model preview container -->
          <div
            class="flex-1 rounded bg-black flex items-center justify-center relative min-h-[500px]"
          >
            <vue3dLoader
              :background-color="0x000000"
              :background-alpha="1"
              @load="onLoad"
              :filePath="currentModel.url"
              :rotation="rotation"
              :controlsOptions="{
                enablePan,
                enableZoom,
                enableRotate,
              }"
              :position="position"
              :scale="scale"
              :cameraPosition="cameraPosition"
              :height="400"
              :width="700"
              class="flex items-center justify-center"
            ></vue3dLoader>
          </div>

          <!-- Buttons -->
          <div class="flex justify-center mt-4 space-x-4">
            <button
              @click="selectRocket"
              class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
              :class="{ 'bg-green-600 hover:bg-green-700': isSelected }"
            >
              {{ isSelected ? "Selected" : "Select" }}
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
          class="bg-gray-800 p-2 rounded-full text-white ml-4 focus:outline-none"
          :class="{
            'opacity-30 cursor-not-allowed': isLast,
            'hover:bg-gray-700': !isLast,
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
        :rotation="viewerControls.rotation"
        :position="viewerControls.position"
        :scale="viewerControls.scale"
        :zoom="viewerControls.zoom"
        :controls-options="{ enableDamping: true, dampingFactor: 0.05 }"
        class="w-full h-full"
      ></vue3dLoader>
    </div>
  </div>
</template>

<style scoped>
.rocket-selector {
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
