import { defineStore } from "pinia";
import { ref, computed } from "vue";

// Game state types
export type GameState = "pre-launch" | "flying" | "landed" | "crashed";
export type TextureType = "metal" | "neon";

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
}

/**
 * Game state store to manage game data like fuel, score, and game state
 */
export const useGameStore = defineStore("game", () => {
  // State
  const fuel = ref<number>(100);
  const score = ref<number>(0);
  const isLanded = ref<boolean>(false);
  const gameState = ref<GameState>("pre-launch");
  const textureChoice = ref<TextureType>("metal");

  // Getters (computed values)
  const hasFuel = computed(() => fuel.value > 0);
  const canFly = computed(
    () =>
      hasFuel.value &&
      gameState.value !== "landed" &&
      gameState.value !== "crashed"
  );

  /**
   * Update the fuel amount
   * @param amount - Amount to change (negative for consumption)
   */
  function updateFuel(amount: number): void {
    fuel.value = Math.max(0, Math.min(100, fuel.value + amount));

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
   * Reset the game state to initial values
   * @returns The reset state values
   */
  function resetGame(): GameStateValues {
    fuel.value = 100;
    score.value = 0;
    isLanded.value = false;
    gameState.value = "pre-launch";
    // Keep texture choice as is when resetting game

    return {
      fuel: fuel.value,
      score: score.value,
      isLanded: isLanded.value,
      gameState: gameState.value,
      textureChoice: textureChoice.value,
    };
  }

  return {
    // State
    fuel,
    score,
    isLanded,
    gameState,
    textureChoice,

    // Getters
    hasFuel,
    canFly,

    // Actions
    updateFuel,
    calculateScore,
    setGameState,
    setTextureChoice,
    resetGame,
  };
});
