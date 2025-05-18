<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ref, watch } from "vue";

import { useSceneStore } from "../../stores/sceneStore";

import ControlsHint from "./ControlsHint.vue";
import FuelGauge from "./FuelGauge.vue";
import GameResults from "./GameResults.vue";
import LevelInfoBar from "./LevelInfoBar.vue";
import VelocityIndicator from "./VelocityIndicator.vue";
import ZoomControl from "./ZoomControl.vue";

// import { CameraView } from "../../game/sceneManager";

const sceneStore = useSceneStore();
const { sceneManager } = storeToRefs(sceneStore);

// Reference to the zoom control component
const zoomControlRef = ref();

// Add computed property for current camera view
// const currentCameraView = computed(() => {
//   if (sceneManager.value) {
//     // Get the view from scene manager and convert to display name
//     const view = sceneManager.value.getCurrentCameraView();

//     switch (view) {
//       case CameraView.DEFAULT:
//         return "Default";
//       case CameraView.TOP_DOWN:
//         return "Top Down";
//       case CameraView.CHASE:
//         return "Chase";
//       default:
//         return "Unknown";
//     }
//   }
//   return "";
// });

// Method to update zoom value from external input
const updateZoomFromCamera = (cameraDistance: number) => {
  zoomControlRef.value?.updateZoomFromCamera(cameraDistance);
};

watch(
  () => sceneManager.value?.getCurrentCameraView(),
  (newView) => {
    console.log("newView", newView);
  }
);
// Expose the methods to parent components
defineExpose({
  updateZoomFromCamera
});
</script>

<template>
  <div
    class="absolute bottom-5 right-5 w-[350px] flex flex-col gap-4 font-mono text-white text-shadow"
  >
    <!-- <div class="camera-view-indicator" v-if="sceneManager && currentCameraView">
      Camera: {{ currentCameraView }}
    </div> -->
    <!-- <RocketSelector /> -->
    <LevelInfoBar />
    <!-- <StatusBar /> -->
    <VelocityIndicator />
    <FuelGauge />
    <GameResults />
    <ControlsHint />
    <ZoomControl ref="zoomControlRef" />
  </div>
</template>

<style>
.text-shadow {
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.camera-view-indicator {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.8rem;
  z-index: 10;
}
</style>
