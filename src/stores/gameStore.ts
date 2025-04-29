import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { spaceLevels, seaLevels } from "../game/levels";
import type {
  Environment,
  LandingMetrics,
  RocketModel,
  GameState,
  TextureType,
  GameStateValues,
} from "../types/storeTypes";
import { rocketModels } from "../lib/config";
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
  const shouldResetRocket = ref<boolean>(false);
  const rocketModel = ref<RocketModel>(rocketModels[1]);
  const rocketModelUrl = ref<string>(rocketModel.value.url);

  // Getters (computed values)
  const hasFuel = computed(() => fuel.value > 0);
  const canFly = computed(
    () =>
      hasFuel.value &&
      gameState.value !== "landed" &&
      gameState.value !== "crashed"
  );

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
      Math.abs(velocity.y) < 5
        ? Math.max(0, 50 - 10 * Math.abs(velocity.y))
        : 0;

    // Calculate the total score
    score.value = Math.round(positionPrecision + fuelBonus + velocityBonus);

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
  }

  /**
   * Set the platform texture choice
   * @param texture - The texture choice to set
   */
  function setTextureChoice(texture: TextureType): void {
    textureChoice.value = texture;
  }

  /**
   * Set the environment choice
   * @param env - The environment choice to set
   */
  function setEnvironment(env: Environment): void {
    environment.value = env;
    // Set default texture based on environment
    if (env === "sea") {
      textureChoice.value = "vintage";
    } else if (env === "space") {
      textureChoice.value = "platform_1";
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
      const levelConfig = spaceLevels.find(
        (level) => level.levelNumber === currentLevel.value
      );
      if (levelConfig && levelConfig.startingFuel) {
        levelFuel = levelConfig.startingFuel;
      }
    } else if (environment.value === "sea") {
      const levelConfig = seaLevels.find(
        (level) => level.levelNumber === currentLevel.value
      );
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
      isLevelCompleted: isLevelCompleted.value,
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
    totalLevels,
    shouldResetRocket,
    rocketModelUrl,
    rocketModels,
    rocketModel,
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
  };
});
