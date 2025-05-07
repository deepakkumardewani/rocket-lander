<script setup lang="ts">
import { Fuel } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useGameStore } from "../../stores/gameStore";

const gameStore = useGameStore();
const { fuel } = storeToRefs(gameStore);

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
</script>

<template>
  <div
    class="bg-[rgba(23,23,23,0.75)] backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-lg"
  >
    <div class="flex items-center mb-2 gap-2">
      <div
        class="flex justify-center items-center w-6 h-6 bg-indigo-600/20 rounded-lg text-white/90"
      >
        <Fuel class="w-4 h-4" />
      </div>
      <div class="font-semibold text-sm tracking-wider text-white/90 uppercase">FUEL</div>
      <div class="ml-auto font-bold text-[0.9rem] tabular-nums">{{ formattedFuel }}%</div>
    </div>

    <div class="relative">
      <div class="h-4 bg-[rgba(30,30,30,0.6)] rounded-lg border border-white/10 overflow-hidden">
        <div
          class="h-full transition-all duration-300"
          :class="fuelStatusClass"
          :style="`width: ${fuel}%`"
        ></div>
      </div>

      <!-- Fuel level markers -->
      <div class="relative h-3.5 mt-1">
        <div class="absolute -translate-x-1/2 text-xs text-white/60" style="left: 0%">0</div>
        <div class="absolute -translate-x-1/2 text-xs text-white/60" style="left: 25%">25</div>
        <div class="absolute -translate-x-1/2 text-xs text-white/60" style="left: 50%">50</div>
        <div class="absolute -translate-x-1/2 text-xs text-white/60" style="left: 75%">75</div>
        <div class="absolute -translate-x-1/2 text-xs text-white/60" style="left: 100%">100</div>
      </div>
    </div>
  </div>
</template>
