import { defineStore } from "pinia";
import { ref } from "vue";

import { CameraView } from "../game/sceneManager";

export const useHudStore = defineStore("hud", () => {
  const altitude = ref(0);
  const fuel = ref(100);
  const velocity = ref(0);
  const rotation = ref(0);
  const crashWarning = ref(false);
  const landingGearDeployed = ref(false);
  const lastScore = ref(0);
  const showScore = ref(false);
  const showEffectsPanel = ref(false);
  const rocketVelocity = ref({ x: 0, y: 0, z: 0 });
  const cameraView = ref<CameraView>(CameraView.DEFAULT);

  function setAltitude(value: number) {
    altitude.value = value;
  }

  function setFuel(value: number) {
    fuel.value = value;
  }

  function setVelocity(value: number) {
    velocity.value = value;
  }

  function setRotation(value: number) {
    rotation.value = value;
  }

  function setCrashWarning(value: boolean) {
    crashWarning.value = value;
  }

  function setLandingGearDeployed(value: boolean) {
    landingGearDeployed.value = value;
  }

  function setLastScore(value: number) {
    lastScore.value = value;
  }

  function setShowScore(value: boolean) {
    showScore.value = value;
  }

  function setShowEffectsPanel(value: boolean) {
    showEffectsPanel.value = value;
  }

  return {
    altitude,
    fuel,
    velocity,
    rotation,
    crashWarning,
    landingGearDeployed,
    lastScore,
    showScore,
    showEffectsPanel,
    rocketVelocity,
    cameraView,
    setAltitude,
    setFuel,
    setVelocity,
    setRotation,
    setCrashWarning,
    setLandingGearDeployed,
    setLastScore,
    setShowScore,
    setShowEffectsPanel
  };
});
