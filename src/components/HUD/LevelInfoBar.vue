<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { seaLevels, spaceLevels } from "../../game/levels";
import { useGameStore } from "../../stores/gameStore";

const gameStore = useGameStore();
const { environment, currentLevel } = storeToRefs(gameStore);

// Compute level objective based on environment and level
const levelObjective = computed(() => {
  if (!environment.value || !currentLevel.value) return "Land safely";

  const platformName = environment.value === "sea" ? "Boat" : "Platform";
  return `Land safely on the ${platformName}`;
  // if (environment.value === "space" && currentLevel.value === 4) {
  //   return "Avoid asteroids, land on platform";
  // } else if (environment.value === "sea" && currentLevel.value === 4) {
  //   return "Land on the green platform";
  // } else if (environment.value === "sea" && currentLevel.value === 5) {
  //   return "Land safely in low visibility";
  // } else {
  //   return `Land safely on the ${platformName}`;
  // }
});

// Compute level details for display
const levelDetails = computed(() => {
  const currentLevels = environment.value === "space" ? spaceLevels : seaLevels;
  const levelConfig = currentLevels.find((level) => level.levelNumber === currentLevel.value);
  if (!levelConfig) return null;

  return {
    windStrength: `${levelConfig.windStrength} m/s`,
    gravity: `${Math.abs(levelConfig.gravity)} m/s²`,
    platformSize: `${levelConfig.platformWidth}x${levelConfig.platformDepth}m`,
    waveHeight: levelConfig.waveHeight ? `${levelConfig.waveHeight}m` : null
  };
});
</script>

<template>
  <div
    class="flex flex-col gap-2 bg-[rgba(23,23,23,0.75)] backdrop-blur-md border border-white/10 rounded-lg p-1.5 px-3 shadow-lg"
  >
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-3">
        <div
          class="px-2.5 py-1 rounded font-semibold tracking-wider text-sm text-white bg-indigo-500"
        >
          Level {{ currentLevel }}
        </div>
      </div>
      <div class="text-sm opacity-90">{{ levelObjective }}</div>
    </div>

    <hr class="border-white/10" />
    <!-- Level Details -->
    <div v-if="levelDetails" class="grid grid-cols-2 gap-2 text-xs">
      <div class="flex items-center gap-1.5">
        <span class="opacity-70">Wind:</span>
        <span class="font-semibold">{{ levelDetails.windStrength }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="opacity-70">Gravity:</span>
        <span class="font-semibold">{{ levelDetails.gravity }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="opacity-70">Platform:</span>
        <span class="font-semibold">{{ levelDetails.platformSize }}</span>
      </div>
      <div v-if="levelDetails.waveHeight" class="flex items-center gap-1.5">
        <span class="opacity-70">Waves:</span>
        <span class="font-semibold">{{ levelDetails.waveHeight }}</span>
      </div>
    </div>
  </div>
</template>
