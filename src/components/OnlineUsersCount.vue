<script setup lang="ts">
import { usePresenceStore } from "../stores/presenceStore";

const presenceStore = usePresenceStore();
</script>

<template>
  <div
    class="fixed bottom-4 left-4 bg-gray-800 bg-opacity-80 rounded-lg px-3 py-2 text-white font-mono flex items-center gap-2"
  >
    <span class="w-2 h-2 mt-1 bg-green-500 rounded-full animate-pulse"></span>
    <div>{{ presenceStore.onlineCount }} online</div>
  </div>
</template>
