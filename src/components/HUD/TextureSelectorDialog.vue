<script setup lang="ts">
import { ArrowLeft, ArrowRight, X } from "lucide-vue-next";
import { computed, ref } from "vue";

import type { TextureType } from "../../types/storeTypes";

import { useGameStore } from "../../stores/gameStore";

import { seaTexturesOptions, spaceTexturesOptions } from "../../lib/textureConfig";

const gameStore = useGameStore();

const isOpen = ref(false);
const currentIndex = ref(0);

// Get the correct textures array based on the current environment
const texturesOptions = computed(() => {
  return gameStore.environment === "sea" ? seaTexturesOptions : spaceTexturesOptions;
});

// Compute the currently displayed texture
const currentTexture = computed(() => texturesOptions.value[currentIndex.value]);

// Check if this is the first or last texture to enable/disable navigation buttons
const isFirst = computed(() => currentIndex.value === 0);
const isLast = computed(() => currentIndex.value === texturesOptions.value.length - 1);

// Check if current texture is selected
const isSelected = computed(() => currentTexture.value.value === gameStore.textureChoice);

// Open the dialog
const openDialog = () => {
  isOpen.value = true;
  // Find index of selected texture
  const index = texturesOptions.value.findIndex(
    (texture) => texture.value === gameStore.textureChoice
  );
  if (index !== -1) {
    currentIndex.value = index;
  }
};

// Close the dialog
const closeDialog = () => {
  isOpen.value = false;
};

// Navigate to previous texture
const prevTexture = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};

// Navigate to next texture
const nextTexture = () => {
  if (currentIndex.value < texturesOptions.value.length - 1) {
    currentIndex.value++;
  }
};

// Select the current texture
const selectTexture = () => {
  gameStore.setTextureChoice(currentTexture.value.value as TextureType);
  closeDialog();
};
</script>

<template>
  <!-- Trigger button to open dialog -->
  <div class="texture-selector-button" @click="openDialog">Change Texture</div>

  <!-- Texture selector dialog -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 h-screen w-full"
  >
    <div class="bg-gray-900 rounded-lg p-5 max-w-2xl w-full">
      <div class="flex items-center mb-4">
        <div class="flex-1 flex items-center justify-center">
          <h3 class="text-white text-lg font-semibold">
            {{ currentTexture.label }}
          </h3>
        </div>

        <button @click="closeDialog" class="text-white hover:text-gray-300">
          <X class="h-6 w-6" />
        </button>
      </div>

      <div class="flex items-center">
        <!-- Left navigation button -->
        <button
          @click="prevTexture"
          :disabled="isFirst"
          class="bg-gray-800 p-2 rounded-full text-white mr-4 focus:outline-none"
          :class="{
            'opacity-30 cursor-not-allowed': isFirst,
            'hover:bg-gray-700': !isFirst
          }"
        >
          <ArrowLeft class="h-6 w-6" />
        </button>

        <!-- Texture display -->
        <div class="flex-1 bg-gray-800 rounded-lg p-4 flex flex-col">
          <!-- Image preview container -->
          <div class="bg-black rounded flex items-center justify-center relative h-60">
            <img :src="currentTexture.url" class="max-h-full max-w-full object-contain" />
          </div>

          <!-- Buttons -->
          <div class="flex justify-center mt-4">
            <button
              @click="selectTexture"
              class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
              :class="{ 'bg-green-600 hover:bg-green-700': isSelected }"
            >
              {{ isSelected ? "Selected" : "Select" }}
            </button>
          </div>
        </div>

        <!-- Right navigation button -->
        <button
          @click="nextTexture"
          :disabled="isLast"
          class="bg-gray-800 p-2 rounded-full text-white ml-4 focus:outline-none"
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
</template>

<style scoped>
.texture-selector-button {
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

.texture-selector-button:hover {
  background-color: rgba(0, 0, 0, 0.85);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.texture-selector-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
