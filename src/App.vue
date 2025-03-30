<script setup lang="ts">
import GameCanvas from "./game/GameCanvas.vue";
</script>

<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <div class="w-full h-screen">
      <GameCanvas />
    </div>
  </div>
</template>

<style>
@import "./style.css";
</style>
