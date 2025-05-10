import { defineStore } from "pinia";
import { computed, ref } from "vue";

import type {
  Environment,
  GameState,
  GameStateValues,
  LandingMetrics,
  RocketModel,
  TextureType,
  TextureUnlockNotification,
  TextureUnlockTiers,
  UnlockedTextures
} from "../types/storeTypes";

import indexedDBService from "../utils/indexedDBService";

import { seaLevels, spaceLevels } from "../lib/levelConfig";
import { rocketModels } from "../lib/rocketConfig";

// Define the texture unlock tiers
const textureUnlockTiers: TextureUnlockTiers = {
  sea: {
    tier1: ["boat_1"],
    tier2: ["boat_2", "boat_3"]
  },
  space: {
    tier1: ["metallic", "metallic_1", "metallic_2", "metallic_3"],
    tier2: ["gold", "neon", "night_sky"]
  }
};

/**
 * Game state store to manage game data like fuel, score, and game state
 */
export const useGameStore = defineStore("game", () => {
  // State
  const fuel = ref<number>(100);
  const score = ref<number>(0);
  const isLanded = ref<boolean>(false);
  const totalLevels = ref<number>(3);
  const gameState = ref<GameState>("waiting");
  const showGameCanvas = ref<boolean>(false);
  const textureChoice = ref<TextureType>("platform_1");
  const environment = ref<Environment>("");
  const currentLevel = ref<number>(1);
  const isLevelCompleted = ref<boolean>(false);
  const crashMetrics = ref<LandingMetrics | null>(null);
  const landingMetrics = ref<LandingMetrics | null>(null);
  const shouldResetRocket = ref<boolean>(false);
  const rocketModel = ref<RocketModel>(rocketModels[0]);
  const rocketModelUrl = ref<string>(rocketModel.value.url);

  // Texture unlocking
  const unlockedTextures = ref<UnlockedTextures>({
    sea: ["vintage" as TextureType],
    space: ["platform_1" as TextureType]
  });
  const completedSeaLevels = ref<number>(0);
  const completedSpaceLevels = ref<number>(0);

  // Notification for unlocked textures
  const textureUnlockNotification = ref<TextureUnlockNotification>({
    show: false,
    environment: "",
    textures: []
  });

  // Getters (computed values)
  const hasFuel = computed(() => fuel.value > 0);
  const canFly = computed(
    () => hasFuel.value && gameState.value !== "landed" && gameState.value !== "crashed"
  );

  /**
   * Initializes the user data from IndexedDB
   */
  async function initUserData(): Promise<void> {
    try {
      const userProgress = await indexedDBService.getUserProgress();
      console.log("userProgress", userProgress);
      unlockedTextures.value.sea = userProgress.unlockedSeaTextures as TextureType[];
      unlockedTextures.value.space = userProgress.unlockedSpaceTextures as TextureType[];
      completedSeaLevels.value = userProgress.completedSeaLevels;
      completedSpaceLevels.value = userProgress.completedSpaceLevels;

      // Ensure the current texture choice is an unlocked one
      if (!isTextureUnlocked(textureChoice.value, environment.value)) {
        // Set to first unlocked texture for the current environment
        if (environment.value === "sea" && unlockedTextures.value.sea.length > 0) {
          textureChoice.value = unlockedTextures.value.sea[0];
        } else if (environment.value === "space" && unlockedTextures.value.space.length > 0) {
          textureChoice.value = unlockedTextures.value.space[0];
        }
      }
    } catch (error) {
      console.error("Failed to initialize user data:", error);
    }
  }

  /**
   * Saves the user progress to IndexedDB
   */
  async function saveUserProgress(): Promise<void> {
    try {
      const userId = localStorage.getItem("rocketLanderUserId");
      if (!userId) return;

      console.log("completedSeaLevels.value", completedSeaLevels.value);

      await indexedDBService.saveUserProgress({
        userId,
        unlockedSeaTextures: unlockedTextures.value.sea.map((texture) => texture as string),
        unlockedSpaceTextures: unlockedTextures.value.space.map((texture) => texture as string),
        completedSeaLevels: completedSeaLevels.value,
        completedSpaceLevels: completedSpaceLevels.value
      });
    } catch (error) {
      console.error("Failed to save user progress:", error);
    }
  }

  /**
   * Checks if a texture is unlocked for the given environment
   * @param texture - The texture to check
   * @param env - The environment (sea or space)
   * @returns Whether the texture is unlocked
   */
  function isTextureUnlocked(texture: TextureType, env: Environment): boolean {
    if (env === "sea") {
      return unlockedTextures.value.sea.includes(texture);
    } else if (env === "space") {
      return unlockedTextures.value.space.includes(texture);
    }
    return false;
  }

  /**
   * Check for texture unlocks based on level completions
   */
  function checkForTextureUnlocks(): void {
    let newlyUnlockedTextures: TextureType[] = [];
    let unlockEnvironment: Environment = "";

    // Check for sea texture unlocks
    if (environment.value === "sea") {
      // Check for tier 1 unlocks (after completing all levels once)
      if (completedSeaLevels.value === totalLevels.value) {
        newlyUnlockedTextures = textureUnlockTiers.sea.tier1.filter(
          (texture) => !unlockedTextures.value.sea.includes(texture)
        );

        if (newlyUnlockedTextures.length > 0) {
          unlockedTextures.value.sea.push(...newlyUnlockedTextures);
          unlockEnvironment = "sea";
        }
      }

      // Check for tier 2 unlocks (after completing all levels twice)
      if (completedSeaLevels.value === totalLevels.value * 2) {
        newlyUnlockedTextures = textureUnlockTiers.sea.tier2.filter(
          (texture) => !unlockedTextures.value.sea.includes(texture)
        );

        if (newlyUnlockedTextures.length > 0) {
          unlockedTextures.value.sea.push(...newlyUnlockedTextures);
          unlockEnvironment = "sea";
        }
      }
    }

    // Check for space texture unlocks
    if (environment.value === "space") {
      console.log("completedSpaceLevels.value", completedSpaceLevels.value);
      console.log("totalLevels.value", totalLevels.value);

      // Check for tier 1 unlocks (after completing all levels once)
      if (completedSpaceLevels.value === totalLevels.value) {
        newlyUnlockedTextures = textureUnlockTiers.space.tier1.filter(
          (texture) => !unlockedTextures.value.space.includes(texture)
        );

        if (newlyUnlockedTextures.length > 0) {
          unlockedTextures.value.space.push(...newlyUnlockedTextures);
          unlockEnvironment = "space";
        }
      }

      // Check for tier 2 unlocks (after completing all levels twice)
      if (completedSpaceLevels.value === totalLevels.value * 2) {
        newlyUnlockedTextures = textureUnlockTiers.space.tier2.filter(
          (texture) => !unlockedTextures.value.space.includes(texture)
        );

        if (newlyUnlockedTextures.length > 0) {
          unlockedTextures.value.space.push(...newlyUnlockedTextures);
          unlockEnvironment = "space";
        }
      }
    }

    // Show notification if new textures unlocked
    if (newlyUnlockedTextures.length > 0) {
      textureUnlockNotification.value = {
        show: true,
        environment: unlockEnvironment,
        textures: newlyUnlockedTextures
      };

      // Save progress to IndexedDB
      saveUserProgress();
    }
  }

  /**
   * Dismiss the texture unlock notification
   */
  function dismissUnlockNotification(): void {
    textureUnlockNotification.value.show = false;
  }

  /**
   * Update the fuel amount with higher precision
   * @param amount - Amount to change (negative for consumption)
   */
  function updateFuel(amount: number): void {
    // Keep full precision for calculations, only clamp values to valid range
    const newFuel = Math.max(0, Math.min(100, fuel.value + amount));

    // Update the fuel value with full precision (no rounding)
    fuel.value = newFuel;

    // If we run out of fuel, update the game state
    if (fuel.value <= 0 && gameState.value === "flying") {
      fuel.value = 0;
    }
  }

  /**
   * Calculate and update the score based on landing precision and remaining fuel
   * @param metrics - Landing metrics like position and velocity
   * @returns The calculated score
   */
  function calculateScore(metrics: LandingMetrics): number {
    const { position, velocity } = metrics;

    // Store crash metrics if game state is crashed
    if (gameState.value === "crashed") {
      crashMetrics.value = metrics;
      return 0;
    }

    // Position precision (center is best: 100 points, edges are 0)
    const positionPrecision = Math.max(0, 100 - 20 * Math.abs(position.x));

    // Fuel bonus (1 point per remaining fuel unit)
    const fuelBonus = fuel.value;

    // Velocity bonus (smoother landing = more points)
    // 5 m/s or more = 0 points, less than 1 m/s = 50 points
    const velocityBonus =
      Math.abs(velocity.y) < 5 ? Math.max(0, 50 - 10 * Math.abs(velocity.y)) : 0;

    // Calculate the total score
    score.value = Math.round(positionPrecision + fuelBonus + velocityBonus);
    landingMetrics.value = metrics;
    return score.value;
  }

  /**
   * Set the game state
   * @param newState - New game state
   */
  function setGameState(newState: GameState): void {
    // Validate state transitions
    if (newState === "pre-launch" && gameState.value !== "waiting") {
      return; // Only allow pre-launch from waiting state
    }
    if (newState === "flying" && gameState.value !== "pre-launch") {
      return; // Only allow flying from pre-launch state
    }

    gameState.value = newState;
    isLanded.value = newState === "landed";
    if (newState !== "crashed") {
      crashMetrics.value = null;
    }

    // Remove the texture unlock check from here as it's already
    // handled in GameCanvas.vue when the level is completed
    // This prevents double-counting of completed levels
  }

  /**
   * Set the platform texture choice
   * @param texture - The texture choice to set
   */
  function setTextureChoice(texture: TextureType): void {
    // Only allow setting texture if it's unlocked
    if (isTextureUnlocked(texture, environment.value)) {
      textureChoice.value = texture;
    }
  }

  /**
   * Set the environment choice
   * @param env - The environment choice to set
   */
  function setEnvironment(env: Environment): void {
    environment.value = env;

    // Set default texture based on environment and unlocked textures
    if (env === "sea") {
      // Find first unlocked sea texture
      if (unlockedTextures.value.sea.length > 0) {
        textureChoice.value = unlockedTextures.value.sea[0];
      }
    } else if (env === "space") {
      // Find first unlocked space texture
      if (unlockedTextures.value.space.length > 0) {
        textureChoice.value = unlockedTextures.value.space[0];
      }
    }

    // Keep game state as waiting until explicitly started
    gameState.value = "waiting";
  }

  /**
   * Start the game from waiting state
   */
  function startGame(): void {
    // Reset game state to ensure clean start
    resetGame();
    // Set to waiting state and show game canvas
    gameState.value = "waiting";
    showGameCanvas.value = true;
  }

  /**
   * Set the current level and reset level completion status
   * @param level - The level number to set
   */
  function setCurrentLevel(level: number): void {
    currentLevel.value = level;
    isLevelCompleted.value = false;
  }

  /**
   * Mark the current level as completed
   */
  function markLevelCompleted(): void {
    isLevelCompleted.value = true;
    if (environment.value === "sea") {
      completedSeaLevels.value++;
    } else if (environment.value === "space") {
      completedSpaceLevels.value++;
    }
  }

  /**
   * Reset the game state to initial values but maintain the environment if not reset explicitly
   * @param resetRocket - Whether to flag the rocket for repositioning
   * @returns The reset state values
   */
  function resetGame(): GameStateValues {
    // Get the current level configuration to set appropriate fuel
    let levelFuel = 100; // Default value
    if (environment.value === "space") {
      const levelConfig = spaceLevels.find((level) => level.levelNumber === currentLevel.value);
      if (levelConfig && levelConfig.startingFuel) {
        levelFuel = levelConfig.startingFuel;
      }
    } else if (environment.value === "sea") {
      const levelConfig = seaLevels.find((level) => level.levelNumber === currentLevel.value);
      if (levelConfig && levelConfig.startingFuel) {
        levelFuel = levelConfig.startingFuel;
      }
    }

    fuel.value = levelFuel;
    score.value = 0;
    isLanded.value = false;
    gameState.value = "waiting";
    crashMetrics.value = null;
    // Keep environment and level as is (don't reset)

    return {
      fuel: fuel.value,
      score: score.value,
      isLanded: isLanded.value,
      gameState: gameState.value,
      textureChoice: textureChoice.value,
      environment: environment.value,
      currentLevel: currentLevel.value,
      isLevelCompleted: isLevelCompleted.value
    };
  }

  /**
   * Reset the game completely and go back to environment selection
   */
  function resetToSelection(): void {
    resetGame();
    environment.value = "";
    showGameCanvas.value = false;
    currentLevel.value = 1;
    isLevelCompleted.value = false;
  }

  /**
   * Set the flag to reset the rocket position
   * @param shouldReset - Whether to reset the rocket position
   */
  function setResetRocketFlag(shouldReset: boolean): void {
    shouldResetRocket.value = shouldReset;
  }

  function setRocketModel(model: RocketModel): void {
    rocketModel.value = model;
    // Set the reset flag to true to trigger rocket model update
    shouldResetRocket.value = true;
  }

  // Initialize user data from IndexedDB
  initUserData();

  return {
    // State
    fuel,
    score,
    isLanded,
    gameState,
    textureChoice,
    environment,
    showGameCanvas,
    currentLevel,
    isLevelCompleted,
    crashMetrics,
    landingMetrics,
    totalLevels,
    shouldResetRocket,
    rocketModelUrl,
    rocketModels,
    rocketModel,
    unlockedTextures,
    textureUnlockNotification,
    completedSeaLevels,
    completedSpaceLevels,

    // Getters
    hasFuel,
    canFly,

    // Actions
    updateFuel,
    calculateScore,
    setGameState,
    setTextureChoice,
    setEnvironment,
    startGame,
    resetGame,
    resetToSelection,
    setCurrentLevel,
    markLevelCompleted,
    setResetRocketFlag,
    setRocketModel,
    isTextureUnlocked,
    dismissUnlockNotification,
    saveUserProgress,
    initUserData,
    checkForTextureUnlocks
  };
});
