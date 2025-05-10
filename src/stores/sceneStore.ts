import { defineStore } from "pinia";
import { ref } from "vue";

import type { SceneManager } from "../game/sceneManager";

export const useSceneStore = defineStore("scene", () => {
  const sceneManager = ref<SceneManager | null>(null);
  return { sceneManager };
});
