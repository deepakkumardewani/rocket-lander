<script setup lang="ts">
import { useGameStore } from "../stores/gameStore";
import { storeToRefs } from "pinia";
import type { TextureType } from "../stores/gameStore";
import { computed, ref } from "vue";
import type { SceneManager } from "../game/sceneManager";
import { Eye, Fuel } from "lucide-vue-next";

// Define props
const props = defineProps<{
  sceneManager: SceneManager;
}>();

// Get the game store to access fuel, score, and game state
const gameStore = useGameStore();
const { score, gameState, textureChoice, fuel, environment } =
  storeToRefs(gameStore);

// Compute platform name based on environment
const platformName = computed(() => {
  return environment.value === "sea" ? "Boat" : "Platform";
});

// Environment display name with capitalization
// const environmentDisplay = computed(() => {
//   if (!environment.value) return "";
//   return environment.value.charAt(0).toUpperCase() + environment.value.slice(1);
// });

// Texture options for UI display
const textureOptions = [
  { value: "metal", label: "Metal" },
  { value: "neon", label: "Neon" },
];

// Handle texture change
const changeTexture = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  gameStore.setTextureChoice(select.value as TextureType);
};

// Format fuel display with decimal places
const formattedFuel = computed(() => {
  return fuel.value.toFixed(2);
});

// Determine fuel status class
const fuelStatusClass = computed(() => {
  if (fuel.value > 70) return "bg-green-500";
  if (fuel.value > 30) return "bg-yellow-500";
  return "bg-red-500";
});

// Game state label with proper formatting
const gameStateLabel = computed(() => {
  const state = gameState.value;
  return state.charAt(0).toUpperCase() + state.slice(1);
});

// Determine if game is in active play state
const isPlaying = computed(() => {
  return gameState.value === "flying" || gameState.value === "pre-launch";
});

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
        (props.sceneManager.controls.maxDistance -
          props.sceneManager.controls.minDistance);
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
      (props.sceneManager.controls.maxDistance -
        props.sceneManager.controls.minDistance)) *
      (MAX_ZOOM - MIN_ZOOM) +
      MIN_ZOOM
  );
  zoomValue.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoom));
};

// Expose the method to parent components
defineExpose({
  updateZoomFromCamera,
});
</script>

<template>
  <div
    class="absolute bottom-5 right-5 w-80 flex flex-col gap-4 font-mono text-white text-shadow"
  >
    <!-- Top status bar for game state -->
    <div
      class="flex justify-between items-center bg-[rgba(23,23,23,0.75)] backdrop-blur-md border border-white/10 rounded-lg p-1.5 px-3 shadow-lg"
    >
      <div class="flex items-center gap-2">
        <div
          class="px-2.5 py-1 rounded font-semibold tracking-wider text-sm uppercase text-white"
          :class="{
            'bg-yellow-500': gameState === 'pre-launch',
            'bg-blue-500': gameState === 'flying',
            'bg-green-500': gameState === 'landed',
            'bg-red-500': gameState === 'crashed',
          }"
        >
          {{ gameStateLabel }}
        </div>
        <!-- <div
          v-if="environment"
          class="px-2.5 py-1 rounded font-semibold tracking-wider text-sm uppercase text-white bg-indigo-500"
        >
          {{ environmentDisplay }}
        </div> -->
      </div>

      <!-- Texture selection dropdown -->
      <div class="flex items-center gap-2">
        <label for="texture-choice" class="text-xs opacity-90"
          >{{ platformName }}:</label
        >
        <select
          id="texture-choice"
          v-model="textureChoice"
          @change="changeTexture"
          class="bg-[rgba(45,45,45,0.7)] border border-white/20 text-white rounded px-1.5 py-0.5 text-xs cursor-pointer outline-none focus:border-indigo-500/80 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.2)]"
        >
          <option
            v-for="option in textureOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Fuel gauge panel -->
    <div
      class="bg-[rgba(23,23,23,0.75)] backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-lg"
    >
      <div class="flex items-center mb-2 gap-2">
        <div
          class="flex justify-center items-center w-6 h-6 bg-indigo-600/20 rounded-lg text-white/90"
        >
          <Fuel class="w-4 h-4" />
        </div>
        <div
          class="font-semibold text-sm tracking-wider text-white/90 uppercase"
        >
          FUEL
        </div>
        <div class="ml-auto font-bold text-[0.9rem] tabular-nums">
          {{ formattedFuel }}%
        </div>
      </div>

      <div class="relative">
        <div
          class="h-4 bg-[rgba(30,30,30,0.6)] rounded-lg border border-white/10 overflow-hidden"
        >
          <div
            class="h-full transition-all duration-300"
            :class="fuelStatusClass"
            :style="`width: ${fuel}%`"
          ></div>
        </div>

        <!-- Fuel level markers -->
        <div class="relative h-3.5 mt-1">
          <div
            class="absolute -translate-x-1/2 text-xs text-white/60"
            style="left: 0%"
          >
            0
          </div>
          <div
            class="absolute -translate-x-1/2 text-xs text-white/60"
            style="left: 25%"
          >
            25
          </div>
          <div
            class="absolute -translate-x-1/2 text-xs text-white/60"
            style="left: 50%"
          >
            50
          </div>
          <div
            class="absolute -translate-x-1/2 text-xs text-white/60"
            style="left: 75%"
          >
            75
          </div>
          <div
            class="absolute -translate-x-1/2 text-xs text-white/60"
            style="left: 100%"
          >
            100
          </div>
        </div>
      </div>
    </div>

    <!-- Game results panel (shown when landed or crashed) -->
    <div
      v-if="gameState === 'landed' || gameState === 'crashed'"
      class="bg-[rgba(23,23,23,0.8)] backdrop-blur-md border border-white/10 rounded-lg p-4 text-center shadow-lg"
    >
      <div v-if="gameState === 'landed'" class="text-emerald-400">
        <div class="text-3xl mb-2 text-shadow-lg">🎯</div>
        <div class="font-bold text-xl mb-3 tracking-wider">
          MISSION COMPLETE
        </div>
        <div
          class="flex justify-between bg-emerald-400/10 border border-emerald-400/20 rounded p-2 px-3 text-white"
        >
          <span class="text-sm font-semibold tracking-wider">SCORE</span>
          <span class="text-xl font-bold tabular-nums">{{ score }}</span>
        </div>
      </div>

      <div v-else class="text-red-400">
        <div class="text-3xl mb-2 text-shadow-lg">💥</div>
        <div class="font-bold text-xl mb-3 tracking-wider">MISSION FAILED</div>
        <div class="text-sm text-white/80 font-medium">
          Your rocket crashed! Land safely on the {{ platformName }} to complete
          the mission.
        </div>
        <div class="text-sm text-white/80 font-medium mt-2">
          Press 'R' to try again
        </div>
      </div>
    </div>

    <!-- Controls hint panel -->
    <div
      v-if="isPlaying"
      class="bg-[rgba(23,23,23,0.6)] backdrop-blur-md border border-white/10 rounded-lg p-2.5 flex justify-around shadow-lg"
    >
      <div class="text-sm flex items-center gap-1">
        <kbd
          class="bg-[rgba(45,45,45,0.7)] border border-white/20 rounded px-1.5 py-0.5 text-xs font-mono shadow"
          >←</kbd
        >
        <kbd
          class="bg-[rgba(45,45,45,0.7)] border border-white/20 rounded px-1.5 py-0.5 text-xs font-mono shadow"
          >→</kbd
        >
        Tilt
      </div>
      <div class="text-sm flex items-center gap-1">
        <kbd
          class="bg-[rgba(45,45,45,0.7)] border border-white/20 rounded px-1.5 py-0.5 text-xs font-mono shadow"
          >Space</kbd
        >
        Thrust
      </div>
      <div class="text-sm flex items-center gap-1">
        <kbd
          class="bg-[rgba(45,45,45,0.7)] border border-white/20 rounded px-1.5 py-0.5 text-xs font-mono shadow"
          >R</kbd
        >
        Reset
      </div>
    </div>

    <!-- Add zoom control panel before the controls-panel -->
    <div
      class="bg-[rgba(23,23,23,0.75)] backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-lg"
    >
      <div class="flex items-center mb-2 gap-2">
        <div
          class="flex justify-center items-center w-6 h-6 bg-indigo-600/20 rounded-lg text-white/90"
        >
          <Eye class="w-4 h-4" />
        </div>
        <div
          class="font-semibold text-sm tracking-wider text-white/90 uppercase"
        >
          ZOOM
        </div>
        <div class="ml-auto font-bold text-[0.9rem] tabular-nums">
          {{ zoomValue }}%
        </div>
      </div>
      <input
        type="range"
        :min="MIN_ZOOM"
        :max="MAX_ZOOM"
        v-model="zoomValue"
        @input="handleZoomChange"
        class="w-full h-1 bg-[rgba(30,30,30,0.6)] rounded cursor-pointer outline-none appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:hover:shadow-[0_0_10px_rgba(79,70,229,0.4)] [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-200 [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:hover:shadow-[0_0_10px_rgba(79,70,229,0.4)]"
      />
    </div>
  </div>
</template>

<style>
.text-shadow {
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}
.text-shadow-lg {
  text-shadow: 0 0 10px currentColor;
}
</style>
