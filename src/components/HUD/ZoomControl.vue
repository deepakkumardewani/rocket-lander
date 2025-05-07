<script setup lang="ts">
import { Eye } from "lucide-vue-next";
import { ref } from "vue";

import type { SceneManager } from "../../game/sceneManager";

const props = defineProps<{
  sceneManager: SceneManager;
}>();

// Add zoom control state and handler
const zoomValue = ref(80); // Default zoom value
const MIN_ZOOM = 20;
const MAX_ZOOM = 100;

// Emit zoom change event
const handleZoomChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const newZoom = parseFloat(input.value);
  zoomValue.value = newZoom;

  // Update camera position with mapped zoom
  if (props.sceneManager?.camera) {
    const direction = props.sceneManager.camera.position.clone().normalize();
    // Map zoom value (MIN_ZOOM to MAX_ZOOM) to distance (maxDistance to minDistance)
    const distance =
      props.sceneManager.controls.maxDistance -
      ((newZoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) *
        (props.sceneManager.controls.maxDistance - props.sceneManager.controls.minDistance);
    props.sceneManager.camera.position.copy(direction.multiplyScalar(distance));
  }
};

// Method to update zoom value from external input (e.g. trackpad/mouse)
const updateZoomFromCamera = (cameraDistance: number) => {
  // Convert camera distance back to slider value
  // Since MIN_ZOOM maps to MAX_DISTANCE and MAX_ZOOM maps to MIN_DISTANCE
  // we need to invert the relationship
  const calculatedZoom = Math.round(
    ((props.sceneManager.controls.maxDistance - cameraDistance) /
      (props.sceneManager.controls.maxDistance - props.sceneManager.controls.minDistance)) *
      (MAX_ZOOM - MIN_ZOOM) +
      MIN_ZOOM
  );
  zoomValue.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoom));
};

defineExpose({
  updateZoomFromCamera
});
</script>

<template>
  <div
    class="bg-[rgba(23,23,23,0.75)] backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-lg"
  >
    <div class="flex items-center mb-2 gap-2">
      <div
        class="flex justify-center items-center w-6 h-6 bg-indigo-600/20 rounded-lg text-white/90"
      >
        <Eye class="w-4 h-4" />
      </div>
      <div class="font-semibold text-sm tracking-wider text-white/90 uppercase">ZOOM</div>
      <div class="ml-auto font-bold text-[0.9rem] tabular-nums">{{ zoomValue }}%</div>
    </div>
    <input
      type="range"
      :min="MIN_ZOOM"
      :max="MAX_ZOOM"
      v-model="zoomValue"
      @input="handleZoomChange"
      class="w-full h-1 bg-indigo-600/20 rounded cursor-pointer outline-none appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:hover:shadow-[0_0_10px_rgba(79,70,229,0.4)] [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-200 [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:hover:shadow-[0_0_10px_rgba(79,70,229,0.4)]"
    />
  </div>
</template>
