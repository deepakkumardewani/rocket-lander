<script setup lang="ts">
import { Users } from "lucide-vue-next";

import { usePresenceStore } from "../stores/presenceStore";

const presenceStore = usePresenceStore();
</script>

<template>
  <div
    title="online users"
    class="bg-green-600 rounded-lg px-4 py-2 text-white font-mono flex items-center gap-2"
  >
    <!-- <span class="w-2 h-2 mt-1 bg-green-500 rounded-full animate-pulse"></span> -->
    <Users class="w-4 h-4" />
    <div>{{ presenceStore.onlineCount }}</div>
  </div>
</template>
