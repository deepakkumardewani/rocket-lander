import { defineStore } from "pinia";
import { ref, computed } from "vue";

// Game state types
export type GameState =
  | "waiting"
  | "pre-launch"
  | "flying"
  | "landed"
  | "crashed";
export type TextureType = "metal" | "neon";
export type Environment = "space" | "sea" | "";

export interface LandingMetrics {
  position: {
    x: number;
    y: number;
    z: number;
  };
  velocity: {
    x: number;
    y: number;
    z: number;
  };
}

export interface GameStateValues {
  fuel: number;
  score: number;
  isLanded: boolean;
  gameState: GameState;
  textureChoice: TextureType;
  environment: Environment;
}

/**
 * Game state store to manage game data like fuel, score, and game state
 */
export const useGameStore = defineStore("game", () => {
  // State
  const fuel = ref<number>(100);
  const score = ref<number>(0);
  const isLanded = ref<boolean>(false);
  const gameState = ref<GameState>("waiting");
  const showGameCanvas = ref<boolean>(false);
  const textureChoice = ref<TextureType>("metal");
  const environment = ref<Environment>("");

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
   * Update the game state
   * @param newState - New game state
   */
  function setGameState(newState: GameState): void {
    gameState.value = newState;
    isLanded.value = newState === "landed";
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
    // Keep game state as waiting until explicitly started
    gameState.value = "waiting";
  }

  /**
   * Start the game from waiting state
   */
  function startGame(): void {
    // Don't transition to pre-launch, just ensure we're in waiting state
    gameState.value = "waiting";
    showGameCanvas.value = true;
  }

  /**
   * Reset the game state to initial values but maintain the environment if not reset explicitly
   * @returns The reset state values
   */
  function resetGame(): GameStateValues {
    fuel.value = 100;
    score.value = 0;
    isLanded.value = false;
    gameState.value = "waiting";
    // Keep environment as is (don't reset to empty)

    return {
      fuel: fuel.value,
      score: score.value,
      isLanded: isLanded.value,
      gameState: gameState.value,
      textureChoice: textureChoice.value,
      environment: environment.value,
    };
  }

  /**
   * Reset the game completely and go back to environment selection
   */
  function resetToSelection(): void {
    resetGame();
    environment.value = "";
    showGameCanvas.value = false;
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
  };
});
