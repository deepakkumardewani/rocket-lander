<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";

import { useLeaderboardStore } from "../stores/leaderboardStore";

// Initialize stores
const leaderboardStore = useLeaderboardStore();
const { leaderboard, spaceLeaderboard, seaLeaderboard, isLoading } = storeToRefs(leaderboardStore);

// Active tab state
const activeTab = ref<"all" | "space" | "sea">("all");

// Computed properties for filtered leaderboard data and personal stats
const filteredLeaderboard = computed(() => {
  if (activeTab.value === "space") {
    return spaceLeaderboard.value;
  } else if (activeTab.value === "sea") {
    return seaLeaderboard.value;
  }
  return leaderboard.value;
});

// Get user's current score based on active tab
const currentScore = computed(() => {
  const userId = localStorage.getItem("rocketLanderUserId");
  if (!userId) return 0;

  const userEntry = leaderboard.value?.find((entry) => entry.uuid === userId);
  if (!userEntry) return 0;

  if (activeTab.value === "space") {
    return userEntry.spaceScore;
  } else if (activeTab.value === "sea") {
    return userEntry.seaScore;
  }
  return userEntry.totalScore;
});

// Format date for display
const formatDate = (timestamp: any) => {
  if (!timestamp) return "N/A";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  }).format(date);
};

// Format velocity for display
// const formatVelocity = (velocity: number) => {
//   return velocity.toFixed(2) + " m/s";
// };

// Get medal emoji based on position
const getMedal = (index: number) => {
  switch (index) {
    case 0:
      return "🥇";
    case 1:
      return "🥈";
    case 2:
      return "🥉";
    default:
      return "";
  }
};

// Check if an entry is the current user's
const isCurrentUser = (uuid: string) => {
  const currentUuid = localStorage.getItem("rocketLanderUserId");
  return uuid === currentUuid;
};

// Function to handle tab changes
const setActiveTab = (tab: "all" | "space" | "sea") => {
  activeTab.value = tab;
};

// Get user rank based on their score in current view
const userRank = computed(() => {
  const userId = localStorage.getItem("rocketLanderUserId");
  if (!userId) return "N/A";

  const index = filteredLeaderboard.value.findIndex((entry) => entry.uuid === userId);
  return index >= 0 ? `#${index + 1}` : "N/A";
});

// Initialize data
onMounted(async () => {
  const userId = localStorage.getItem("rocketLanderUserId");
  if (userId) {
    await leaderboardStore.fetchPersonalBest(userId);
  }
});
</script>

<template>
  <div class="bg-gray-900 text-white rounded-lg overflow-hidden shadow-xl border border-gray-800">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-900 to-indigo-900 p-4">
      <h2 class="text-2xl font-bold text-center">Global Leaderboard</h2>

      <!-- Personal Stats Card -->
      <div
        class="mt-4 bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between"
      >
        <div>
          <div class="text-xs text-blue-300">YOUR STATS</div>
          <div class="text-xl font-bold">
            {{ currentScore }} <span class="text-xs opacity-70">points</span>
          </div>
        </div>
        <div>
          <div class="text-xs text-blue-300">RANK</div>
          <div class="text-xl font-bold">{{ userRank }}</div>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="bg-gray-800 flex border-b border-gray-700">
      <button
        @click="setActiveTab('all')"
        class="flex-1 py-3 px-4 text-center transition-colors"
        :class="{ 'bg-gray-700 text-blue-400 font-medium': activeTab === 'all' }"
      >
        All Missions
      </button>
      <button
        @click="setActiveTab('space')"
        class="flex-1 py-3 px-4 text-center transition-colors"
        :class="{ 'bg-gray-700 text-blue-400 font-medium': activeTab === 'space' }"
      >
        Space
      </button>
      <button
        @click="setActiveTab('sea')"
        class="flex-1 py-3 px-4 text-center transition-colors"
        :class="{ 'bg-gray-700 text-blue-400 font-medium': activeTab === 'sea' }"
      >
        Sea
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center p-12 min-h-[200px]">
      <div class="relative w-12 h-12 mb-4">
        <div class="absolute w-full h-full border-4 border-blue-400/20 rounded-full"></div>
        <div
          class="absolute w-full h-full border-4 border-transparent border-t-blue-400 rounded-full animate-spin"
        ></div>
      </div>
      <div class="text-blue-400 font-medium">Loading leaderboard data...</div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!filteredLeaderboard.length" class="p-8 text-center">
      <div class="flex flex-col items-center justify-center py-8">
        <div class="text-5xl mb-3">🏆</div>
        <div class="text-xl font-bold mb-2">No scores yet!</div>
        <div class="text-gray-400">Be the first to land your rocket and set a score.</div>
      </div>
    </div>

    <!-- Leaderboard Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-800 text-xs uppercase">
          <tr>
            <th class="py-3 px-4 text-left">#</th>
            <th class="py-3 px-4 text-left">Pilot</th>
            <th class="py-3 px-4 text-right">Score</th>
            <!-- <th class="hidden md:table-cell py-3 px-4 text-right">Fuel</th>
            <th class="hidden md:table-cell py-3 px-4 text-right">Landing</th>
            <th class="hidden lg:table-cell py-3 px-4 text-right">Rocket</th> -->
            <th class="hidden lg:table-cell py-3 px-4 text-right">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(entry, index) in filteredLeaderboard"
            :key="entry.uuid"
            :class="[
              'border-t border-gray-700 hover:bg-gray-800/50 transition-colors',
              isCurrentUser(entry.uuid) ? 'bg-blue-900/20' : ''
            ]"
          >
            <!-- rank -->
            <td class="py-3 px-4 text-left">
              <span class="font-mono">{{ index + 1 }}</span>
              <span v-if="index < 3" class="ml-1">{{ getMedal(index) }}</span>
            </td>
            <!-- pilot -->
            <td class="py-3 px-4 text-left flex items-center">
              <span :class="isCurrentUser(entry.uuid) ? 'font-bold text-blue-400' : ''">
                {{ entry.username }}
                <span v-if="isCurrentUser(entry.uuid)" class="text-xs ml-1 text-blue-400"
                  >(you)</span
                >
              </span>
            </td>
            <!-- score -->
            <td class="py-3 px-4 text-right font-bold tabular-nums">{{ entry.totalScore }}</td>
            <!-- fuel -->
            <!-- <td class="hidden md:table-cell py-3 px-4 text-right tabular-nums">
              <span :class="entry.fuelRemaining > 50 ? 'text-green-400' : ''">
                {{ Math.round(entry.fuelRemaining) }}%
              </span>
            </td> -->
            <!-- landing -->
            <!-- <td class="hidden md:table-cell py-3 px-4 text-right tabular-nums">
              <span :class="entry.landingVelocity < 1.5 ? 'text-green-400' : ''">
                {{ formatVelocity(entry.landingVelocity) }}
              </span>
            </td> -->
            <!-- rocket -->
            <!-- <td class="hidden lg:table-cell py-3 px-4 text-right">
              {{ entry.rocketId.replace("_", " ") }}
            </td> -->
            <!-- last updated -->
            <td class="hidden lg:table-cell py-3 px-4 text-right text-gray-400 text-sm">
              {{ formatDate(entry.lastUpdated) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for table */
.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: rgba(31, 41, 55, 0.5);
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}
</style>
