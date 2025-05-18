<script setup lang="ts">
defineProps<{
  progress: number;
}>();
</script>

<template>
  <div
    class="absolute inset-0 flex justify-center items-center bg-gradient-to-b from-[#1b2735] to-[#090a0f] z-10 overflow-hidden"
  >
    <div class="flex flex-col items-center relative w-full max-w-[500px]">
      <div class="mb-8 h-[120px] w-[120px] relative">
        <div
          class="rocket absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-[100px] animate-hover"
        >
          <div
            class="relative w-full h-[70%] bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 rounded-t-full rounded-b-[30%] shadow-[0_0_10px_rgba(255,255,255,0.3)]"
          >
            <div
              class="absolute w-4 h-4 bg-blue-400 rounded-full top-1/4 left-1/2 -translate-x-1/2 border-2 border-gray-300 shadow-[0_0_10px_rgba(96,165,250,0.7)]"
            ></div>
          </div>
          <div class="absolute bottom-[30%] w-full">
            <div
              class="absolute h-5 w-[15px] bg-red-500 bottom-0 -left-[15px] rounded-tl-[10px] skew-x-[30deg]"
            ></div>
            <div
              class="absolute h-5 w-[15px] bg-red-500 bottom-0 -right-[15px] rounded-tr-[10px] -skew-x-[30deg]"
            ></div>
          </div>
          <div
            class="absolute -bottom-[30px] left-1/2 -translate-x-1/2 w-6 h-[30px] bg-gradient-to-b from-orange-500 via-amber-300 to-blue-50 rounded-b-full animate-flame shadow-[0_0_15px_#f97316]"
          ></div>
        </div>
      </div>

      <h2 class="text-white text-2xl mb-4 font-bold">Preparing for Launch</h2>

      <!-- <div class="text-[#a9c2ff] text-xl mb-6">Loading game assets: {{ progress.toFixed(2) }}%</div> -->

      <!-- <div
        class="w-full h-3 bg-white/10 rounded-xl overflow-hidden shadow-[0_0_10px_rgba(169,194,255,0.3)]"
      >
        <div
          class="h-full bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-xl transition-all duration-300 ease-out shadow-[0_0_8px_rgba(79,70,229,0.6)]"
          :style="`width: ${progress}%`"
        ></div>
      </div> -->

      <div class="absolute inset-0 -z-10">
        <div
          v-for="n in 20"
          :key="n"
          class="absolute w-[3px] h-[3px] bg-white rounded-full animate-twinkle"
          :style="`
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
          animation-delay: ${Math.random() * 2}s;
          animation-duration: ${2 + Math.random() * 3}s;
        `"
        ></div>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes hover {
  0%,
  100% {
    transform: translate(-50%, -50%) translateY(-5px);
  }
  50% {
    transform: translate(-50%, -50%) translateY(5px);
  }
}

@keyframes flame {
  0% {
    height: 25px;
    opacity: 0.8;
  }
  100% {
    height: 35px;
    opacity: 1;
  }
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.animate-hover {
  animation: hover 2s ease-in-out infinite;
}

.animate-flame {
  animation: flame 0.5s ease-in-out infinite alternate;
}

.animate-twinkle {
  animation: twinkle linear infinite;
}
</style>
