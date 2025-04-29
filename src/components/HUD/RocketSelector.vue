<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useGameStore } from "../../stores/gameStore";
import { assetLoader } from "../../utils/assetLoader";
import { rocketModels } from "../../lib/config";
import type { RocketModel } from "../../types/storeTypes";
const gameStore = useGameStore();

const selectedModel = ref<RocketModel>(rocketModels[0]);

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

// Set the selected model based on the current URL in the store
onMounted(() => {
  const currentUrl = gameStore.rocketModelUrl;
  const matchingModel = rocketModels.find((model) => model.url === currentUrl);
  if (matchingModel) {
    selectedModel.value = matchingModel;
  }

  // Start preloading models
  preloadRocketModels();
});

const handleModelChange = () => {
  const model = rocketModels.find((m) => m.id === selectedModel.value.id);
  if (model) {
    gameStore.setRocketModel(model);
  }
};
</script>

<template>
  <div
    class="rocket-selector bg-black bg-opacity-50 p-3 rounded-lg backdrop-blur-sm"
  >
    <select
      v-model="selectedModel"
      @change="handleModelChange"
      class="w-full bg-black bg-opacity-50 text-white p-2 rounded border border-white border-opacity-20 focus:outline-none focus:border-opacity-50"
    >
      <option v-for="model in rocketModels" :key="model.id" :value="model">
        {{ model.name }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.rocket-selector {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

select option {
  background-color: rgba(0, 0, 0, 0.9);
}
</style>
