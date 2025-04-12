<script setup lang="ts">
import { ref, onMounted, defineProps } from "vue";
import type { SceneManager } from "../game/sceneManager";

const props = defineProps<{
  sceneManager: SceneManager;
}>();

type EffectType =
  | "nebula"
  | "aurora"
  | "lensFlare"
  | "shootingStars"
  | "starField";
const effectTypes: EffectType[] = [
  "nebula",
  "aurora",
  "lensFlare",
  "shootingStars",
  "starField",
];

const intensityValue = ref(100);
const isPanelVisible = ref(false);
const fpsValue = ref(60);

const effectsState = ref({
  nebula: true,
  aurora: true,
  lensFlare: true,
  shootingStars: true,
  starField: true,
});

// Toggle panel visibility
function togglePanel() {
  isPanelVisible.value = !isPanelVisible.value;
}

// Update effects intensity
function updateIntensity() {
  if (props.sceneManager) {
    // Convert to 0-1 range
    props.sceneManager.setEffectsIntensity(intensityValue.value / 100);
  }
}

// Toggle performance mode
function togglePerformanceMode(enabled: boolean) {
  if (props.sceneManager) {
    props.sceneManager.setPerformanceMode(enabled);
  }
}

// Toggle individual effects
function toggleEffect(effect: EffectType) {
  if (props.sceneManager) {
    effectsState.value[effect] = !effectsState.value[effect];
    props.sceneManager.toggleEffect(effect, effectsState.value[effect]);
  }
}

// Update FPS counter
onMounted(() => {
  // Update FPS counter every second
  setInterval(() => {
    if (props.sceneManager) {
      fpsValue.value = props.sceneManager.getFPS();
    }
  }, 1000);
});
</script>

<template>
  <div class="effects-panel">
    <button
      @click="togglePanel"
      class="toggle-button"
      :class="{ active: isPanelVisible }"
    >
      <span>FPS: {{ fpsValue }}</span>
      <span v-if="!isPanelVisible">⚙️</span>
      <span v-else>✕</span>
    </button>

    <div v-if="isPanelVisible" class="panel-content">
      <h3>Visual Effects</h3>

      <div class="control-group">
        <label>Effects Intensity: {{ intensityValue }}%</label>
        <input
          type="range"
          min="0"
          max="100"
          v-model="intensityValue"
          @input="updateIntensity"
        />
      </div>

      <div class="control-group">
        <button
          @click="togglePerformanceMode(true)"
          class="mode-button"
          :class="{ active: fpsValue < 30 }"
        >
          Performance Mode
        </button>
        <button
          @click="togglePerformanceMode(false)"
          class="mode-button"
          :class="{ active: fpsValue >= 30 }"
        >
          Quality Mode
        </button>
      </div>

      <div class="control-group effects-toggles">
        <div v-for="effect in effectTypes" :key="effect" class="effect-toggle">
          <label>
            <input
              type="checkbox"
              :checked="effectsState[effect]"
              @change="toggleEffect(effect)"
            />
            {{ effect.charAt(0).toUpperCase() + effect.slice(1) }}
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.effects-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(10, 10, 20, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(100, 120, 255, 0.4);
  z-index: 100;
  font-family: "Arial", sans-serif;
  box-shadow: 0 0 20px rgba(80, 100, 255, 0.4);
  backdrop-filter: blur(10px);
  color: #fff;
}

.toggle-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.toggle-button.active {
  background-color: rgba(100, 120, 255, 0.2);
}

.panel-content {
  padding: 10px 15px;
  width: 250px;
}

h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  text-align: center;
  color: #88aaff;
}

.control-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
}

input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
}

.mode-button {
  padding: 6px 10px;
  margin-right: 5px;
  background-color: rgba(40, 40, 60, 0.5);
  border: 1px solid rgba(100, 120, 255, 0.3);
  border-radius: 4px;
  color: #ddd;
  cursor: pointer;
  font-size: 12px;
}

.mode-button.active {
  background-color: rgba(60, 80, 255, 0.3);
  color: #fff;
}

.effects-toggles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.effect-toggle {
  font-size: 12px;
}

input[type="checkbox"] {
  margin-right: 5px;
}
</style>
