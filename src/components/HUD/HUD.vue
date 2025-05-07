<script setup lang="ts">
import { ref } from "vue";

import ControlsHint from "./ControlsHint.vue";
import FuelGauge from "./FuelGauge.vue";
import GameResults from "./GameResults.vue";
import LevelInfoBar from "./LevelInfoBar.vue";
// import RocketSelector from './RocketSelector.vue'
import StatusBar from "./StatusBar.vue";
import ZoomControl from "./ZoomControl.vue";

import type { SceneManager } from "../../game/sceneManager";

// Define props
defineProps<{
  sceneManager: SceneManager;
}>();

// Reference to the zoom control component
const zoomControlRef = ref();

// Method to update zoom value from external input
const updateZoomFromCamera = (cameraDistance: number) => {
  zoomControlRef.value?.updateZoomFromCamera(cameraDistance);
};

// Expose the method to parent components
defineExpose({
  updateZoomFromCamera
});
</script>

<template>
  <div
    class="absolute bottom-5 right-5 w-[350px] flex flex-col gap-4 font-mono text-white text-shadow"
  >
    <!-- <RocketSelector /> -->
    <LevelInfoBar />
    <StatusBar />
    <FuelGauge />
    <GameResults />
    <ControlsHint />
    <ZoomControl ref="zoomControlRef" :scene-manager="sceneManager" />
  </div>
</template>

<style>
.text-shadow {
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}
</style>
