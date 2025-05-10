<script setup lang="ts">
import { Gauge } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useGameStore } from "../../stores/gameStore";
import { useHudStore } from "../../stores/hudStore";

const gameStore = useGameStore();
const hudStore = useHudStore();
const { gameState } = storeToRefs(gameStore);
const { rocketVelocity } = storeToRefs(hudStore);

// Determine if game is in active flying state
const isFlying = computed(() => {
  return gameState.value === "flying";
});

// Format velocity display with two decimal places
const formattedVelocityY = computed(() => {
  return Math.abs(rocketVelocity.value.y).toFixed(2);
});

// Compute velocity magnitude (total speed)
const velocityMagnitude = computed(() => {
  const { x, y, z } = rocketVelocity.value;
  return Math.sqrt(x * x + y * y + z * z).toFixed(2);
});

// Determine velocity status class based on vertical velocity
const velocityStatusClass = computed(() => {
  const absVelocityY = Math.abs(rocketVelocity.value.y);
  if (absVelocityY < 2) return "bg-green-500"; // Safe landing speed
  if (absVelocityY < 5) return "bg-yellow-500"; // Caution
  return "bg-red-500"; // Dangerous
});

// Direction indicator (ascending or descending)
const isAscending = computed(() => rocketVelocity.value.y > 0);
</script>

<template>
  <div
    v-if="isFlying"
    class="bg-[rgba(23,23,23,0.75)] backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-lg"
  >
    <div class="flex items-center mb-2 gap-2">
      <div
        class="flex justify-center items-center w-6 h-6 bg-indigo-600/20 rounded-lg text-white/90"
      >
        <Gauge class="w-4 h-4" />
      </div>
      <div class="font-semibold text-sm tracking-wider text-white/90 uppercase">VELOCITY</div>
      <div class="ml-auto font-bold text-[0.9rem] tabular-nums flex items-center">
        {{ formattedVelocityY }} m/s
        <span class="ml-1">{{ isAscending ? "↑" : "↓" }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <!-- Vertical velocity gauge -->
      <div class="relative">
        <div class="h-4 bg-[rgba(30,30,30,0.6)] rounded-lg border border-white/10 overflow-hidden">
          <div
            class="h-full transition-all duration-300"
            :class="velocityStatusClass"
            :style="`width: ${Math.min(Math.abs(rocketVelocity.y) * 10, 100)}%`"
          ></div>
        </div>

        <!-- Velocity markers -->
        <div class="relative h-3.5 mt-1">
          <div class="absolute -translate-x-1/2 text-xs text-white/60" style="left: 0%">0</div>
          <div class="absolute -translate-x-1/2 text-xs text-white/60" style="left: 25%">2.5</div>
          <div class="absolute -translate-x-1/2 text-xs text-white/60" style="left: 50%">5</div>
          <div class="absolute -translate-x-1/2 text-xs text-white/60" style="left: 75%">7.5</div>
          <div class="absolute -translate-x-1/2 text-xs text-white/60" style="left: 100%">10+</div>
        </div>
      </div>

      <!-- Additional velocity data -->
      <div class="grid grid-cols-2 gap-3 text-xs mt-1">
        <div>
          <span class="text-white/60">Total:</span>
          <span class="ml-1 font-mono font-semibold text-white">{{ velocityMagnitude }} m/s</span>
        </div>
        <div>
          <span class="text-white/60">Horizontal:</span>
          <span class="ml-1 font-mono font-semibold text-white"
            >{{
              Math.sqrt(
                rocketVelocity.x * rocketVelocity.x + rocketVelocity.z * rocketVelocity.z
              ).toFixed(2)
            }}
            m/s</span
          >
        </div>
      </div>
    </div>
  </div>
</template>
