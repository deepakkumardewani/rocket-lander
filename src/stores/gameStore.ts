import { defineStore } from "pinia";
import { computed, ref } from "vue";

import type {
  Environment,
  GameState,
  GameStateValues,
  LandingMetrics,
  RocketModel,
  RocketUnlockNotification,
  TextureType,
  TextureUnlockNotification,
  TextureUnlockTiers,
  UnlockedTextures
} from "../types/storeTypes";

import indexedDBService from "../utils/indexedDBService";

import { setWindStrength } from "../game/physics";
import { seaLevels, spaceLevels } from "../lib/levelConfig";
import { rocketModels } from "../lib/rocketConfig";

// Define the texture unlock tiers
export const textureUnlockTiers: TextureUnlockTiers = {
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
  const isInstructionsFirstLoad = ref<boolean>(true);
  // Texture unlocking
  const unlockedTextures = ref<UnlockedTextures>({
    sea: ["vintage" as TextureType],
    space: ["platform_1" as TextureType]
  });
  const completedSeaLevels = ref<number>(0);
  const completedSpaceLevels = ref<number>(0);

  // Rocket unlocking
  const unlockedRockets = ref<string[]>(["classic"]);
  const achievements = ref({
    perfectLandings: 0,
    highFuelLandings: 0,
    lowVelocityLandings: 0,
    highScores: [] as number[],
    totalLandings: 0,
    completedAllLevels: false,
    lowVelocityInSpaceLevel3: false,
    highFuelInSpaceLevel3: false
  });

  // Notification for unlocked textures
  const textureUnlockNotification = ref<TextureUnlockNotification>({
    show: false,
    environment: "",
    textures: []
  });

  // Notification for unlocked rockets
  const rocketUnlockNotification = ref<RocketUnlockNotification>({
    show: false,
    rockets: []
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
      unlockedTextures.value.sea = userProgress.unlockedSeaTextures as TextureType[];
      unlockedTextures.value.space = userProgress.unlockedSpaceTextures as TextureType[];
      completedSeaLevels.value = userProgress.completedSeaLevels;
      completedSpaceLevels.value = userProgress.completedSpaceLevels;

      // Initialize rocket unlocks and achievements
      if (userProgress.unlockedRockets) {
        unlockedRockets.value = userProgress.unlockedRockets;
      }

      if (userProgress.achievements) {
        achievements.value = {
          perfectLandings: userProgress.achievements.perfectLandings || 0,
          highFuelLandings: userProgress.achievements.highFuelLandings || 0,
          lowVelocityLandings: userProgress.achievements.lowVelocityLandings || 0,
          highScores: userProgress.achievements.highScores || [],
          totalLandings: userProgress.achievements.totalLandings || 0,
          completedAllLevels: userProgress.achievements.completedAllLevels || false,
          lowVelocityInSpaceLevel3: userProgress.achievements.lowVelocityInSpaceLevel3 || false,
          highFuelInSpaceLevel3: userProgress.achievements.highFuelInSpaceLevel3 || false
        };
      }

      // Ensure the current texture choice is an unlocked one
      if (!isTextureUnlocked(textureChoice.value, environment.value)) {
        // Set to first unlocked texture for the current environment
        if (environment.value === "sea" && unlockedTextures.value.sea.length > 0) {
          textureChoice.value = unlockedTextures.value.sea[0];
        } else if (environment.value === "space" && unlockedTextures.value.space.length > 0) {
          textureChoice.value = unlockedTextures.value.space[0];
        }
      }

      // Ensure the current rocket model is an unlocked one
      if (!isRocketUnlocked(rocketModel.value.id)) {
        // Set to the first unlocked rocket
        if (unlockedRockets.value.length > 0) {
          const defaultRocket = rocketModels.find((model) => model.id === unlockedRockets.value[0]);
          if (defaultRocket) {
            rocketModel.value = defaultRocket;
            rocketModelUrl.value = defaultRocket.url;
          }
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
      const username = localStorage.getItem("rocketLanderUsername");
      if (!userId || !username) return;

      // Create a clean serializable copy of the data
      const serializedHighScores = [...achievements.value.highScores];

      await indexedDBService.saveUserProgress({
        username,
        userId,
        unlockedSeaTextures: [...unlockedTextures.value.sea].map((texture) => texture as string),
        unlockedSpaceTextures: [...unlockedTextures.value.space].map(
          (texture) => texture as string
        ),
        completedSeaLevels: completedSeaLevels.value,
        completedSpaceLevels: completedSpaceLevels.value,
        unlockedRockets: [...unlockedRockets.value],
        achievements: {
          perfectLandings: achievements.value.perfectLandings,
          highFuelLandings: achievements.value.highFuelLandings,
          lowVelocityLandings: achievements.value.lowVelocityLandings,
          highScores: serializedHighScores,
          totalLandings: achievements.value.totalLandings,
          completedAllLevels: achievements.value.completedAllLevels,
          lowVelocityInSpaceLevel3: achievements.value.lowVelocityInSpaceLevel3,
          highFuelInSpaceLevel3: achievements.value.highFuelInSpaceLevel3
        }
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
   * Checks if a rocket is unlocked
   * @param rocketId - The rocket ID to check
   * @returns Whether the rocket is unlocked
   */
  function isRocketUnlocked(rocketId: string): boolean {
    return unlockedRockets.value.includes(rocketId);
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
   * Check for rocket unlocks based on achievements
   * @param landingMetrics - Metrics from the landing
   */
  function checkForRocketUnlocks(landingMetrics?: LandingMetrics): void {
    let newlyUnlockedRockets: string[] = [];

    // Update achievement stats if landing metrics provided
    if (landingMetrics) {
      // Increment total landings
      achievements.value.totalLandings++;

      // Check for perfect landing (position.x close to 1)
      if (Math.abs(landingMetrics.position.x) < 1) {
        achievements.value.perfectLandings++;
      }

      // Check for high fuel landing
      if (fuel.value >= 50) {
        achievements.value.highFuelLandings++;
      }

      // Check for low velocity landing
      if (Math.abs(landingMetrics.velocity.y) < 1.0) {
        achievements.value.lowVelocityLandings++;
      }

      // Track specific achievements for level 3 in space
      if (
        environment.value === "space" &&
        currentLevel.value === 3 &&
        gameState.value === "landed"
      ) {
        // Track landing with velocity under 1.5 m/s in space level 3 (sci-fi requirement)
        if (Math.abs(landingMetrics.velocity.y) < 1.5) {
          achievements.value.lowVelocityInSpaceLevel3 = true;
        }

        // Track landing with over 30% fuel in space level 3 (falcon_heavy requirement)
        if (fuel.value > 30) {
          achievements.value.highFuelInSpaceLevel3 = true;
        }
      }

      // Check for vintage rocket unlock
      if (
        !unlockedRockets.value.includes("vintage") &&
        completedSeaLevels.value >= 3 &&
        achievements.value.highFuelLandings > 0 &&
        achievements.value.highScores.some((score) => score > 150)
      ) {
        newlyUnlockedRockets.push("vintage");
      }

      // Update sci-fi rocket unlock logic to include specific level 3 requirement
      if (
        !unlockedRockets.value.includes("sci_fi") &&
        completedSpaceLevels.value >= totalLevels.value &&
        achievements.value.perfectLandings > 0 &&
        achievements.value.lowVelocityInSpaceLevel3 // Must land with velocity under 1.5 m/s at third level in space
      ) {
        newlyUnlockedRockets.push("sci_fi");
      }

      // Check for grasshopper unlock
      if (
        !unlockedRockets.value.includes("grasshopper") &&
        achievements.value.completedAllLevels &&
        achievements.value.lowVelocityLandings >= 3 &&
        fuel.value >= 70
      ) {
        newlyUnlockedRockets.push("grasshopper");
      }

      // Check for starship unlock
      if (
        !unlockedRockets.value.includes("starship") &&
        completedSeaLevels.value >= totalLevels.value * 2 &&
        completedSpaceLevels.value >= totalLevels.value * 2 &&
        achievements.value.highScores.filter((score) => score > 200).length >= 3 &&
        achievements.value.totalLandings >= 10
      ) {
        newlyUnlockedRockets.push("starship");
      }

      // Update falcon heavy unlock logic to include specific level 3 fuel requirement
      if (
        !unlockedRockets.value.includes("falcon_heavy") &&
        achievements.value.perfectLandings >= 5 &&
        achievements.value.highFuelLandings >= 1 &&
        achievements.value.highFuelInSpaceLevel3 && // Must land with over 30% fuel in level 3
        unlockedRockets.value.includes("vintage") &&
        unlockedRockets.value.includes("sci_fi") &&
        unlockedRockets.value.includes("grasshopper") &&
        unlockedRockets.value.includes("starship")
      ) {
        newlyUnlockedRockets.push("falcon_heavy");
      }

      // Add high score if applicable
      if (score.value > 150 && !achievements.value.highScores.includes(score.value)) {
        achievements.value.highScores.push(score.value);
      }
    }

    // Check if all levels completed
    if (
      completedSeaLevels.value >= totalLevels.value &&
      completedSpaceLevels.value >= totalLevels.value
    ) {
      achievements.value.completedAllLevels = true;
    }

    // Add newly unlocked rockets to the unlocked list
    if (newlyUnlockedRockets.length > 0) {
      unlockedRockets.value.push(...newlyUnlockedRockets);

      // Show notification
      rocketUnlockNotification.value = {
        show: true,
        rockets: newlyUnlockedRockets
      };
    }

    // Save progress to IndexedDB after any achievement update
    saveUserProgress();
  }

  /**
   * Dismiss the texture unlock notification
   */
  function dismissUnlockNotification(): void {
    textureUnlockNotification.value.show = false;
  }

  /**
   * Dismiss the rocket unlock notification
   */
  function dismissRocketUnlockNotification(): void {
    rocketUnlockNotification.value.show = false;
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

    // Check for rocket unlocks after successful landing
    if (gameState.value === "landed") {
      checkForRocketUnlocks(metrics);
    }

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

    setWindStrength(0);
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
    if (isRocketUnlocked(model.id)) {
      rocketModel.value = model;
      rocketModelUrl.value = model.url;
      // Set the reset flag to true to trigger rocket model update
      shouldResetRocket.value = true;
    }
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
    unlockedRockets,
    achievements,
    rocketUnlockNotification,
    isInstructionsFirstLoad,
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
    isRocketUnlocked,
    dismissUnlockNotification,
    dismissRocketUnlockNotification,
    saveUserProgress,
    initUserData,
    checkForTextureUnlocks,
    checkForRocketUnlocks
  };
});
