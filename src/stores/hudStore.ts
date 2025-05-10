import { defineStore } from "pinia";
import { ref } from "vue";

export const useHudStore = defineStore("hud", () => {
  const rocketVelocity = ref({ x: 0, y: 0, z: 0 });

  return { rocketVelocity };
});
