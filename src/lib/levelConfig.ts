/**
 * Level configuration types and data for Rocket Lander
 */

/**
 * Interface defining the configuration for a game level
 */
export interface LevelConfig {
  levelNumber: number;
  platformWidth: number;
  platformDepth: number;
  platformXPosition?: number;
  platformMovement?: {
    type: "oscillate" | "drift" | "tilt";
    axis?: "x" | "z";
    amplitude: number;
    frequency: number;
  };
  windStrength: number;
  gravity: number;
  startingFuel: number;
  waveHeight?: number;
  obstacles?: {
    type: "asteroid" | "platform";
    count: number;
    size: number;
  };
  visibility?: "normal" | "low";
}

/**
 * Space environment levels configuration
 */
export const spaceLevels: LevelConfig[] = [
  {
    levelNumber: 1,
    platformWidth: 10,
    platformDepth: 10,
    platformXPosition: 0,
    windStrength: 0,
    gravity: -9.81,
    startingFuel: 100
  },
  {
    levelNumber: 2,
    platformWidth: 7,
    platformDepth: 7,
    platformXPosition: -10,
    windStrength: 2,
    gravity: -9.81,
    startingFuel: 75
  },
  {
    levelNumber: 3,
    platformWidth: 5,
    platformDepth: 5,
    platformXPosition: 10,
    windStrength: 3,
    gravity: -9.81,
    startingFuel: 50
  }
];

/**
 * Sea environment levels configuration
 */
export const seaLevels: LevelConfig[] = [
  {
    levelNumber: 1,
    platformWidth: 20,
    platformDepth: 10,
    platformXPosition: 0,
    windStrength: 0,
    gravity: -9.81,
    startingFuel: 100,
    waveHeight: 0.2
  },
  {
    levelNumber: 2,
    platformWidth: 15,
    platformDepth: 8,
    platformXPosition: -10,
    windStrength: 2,
    gravity: -9.81,
    startingFuel: 75,
    waveHeight: 0.2
  },
  {
    levelNumber: 3,
    platformWidth: 10,
    platformDepth: 5,
    platformXPosition: 10,
    windStrength: 3,
    gravity: -9.81,
    startingFuel: 50,
    waveHeight: 0.5
  }
];
