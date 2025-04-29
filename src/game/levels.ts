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
    platformDepth: 5,
    windStrength: 0,
    gravity: -9.81,
    startingFuel: 100,
  },
  {
    levelNumber: 2,
    platformWidth: 7,
    platformDepth: 7,
    windStrength: 1,
    gravity: -9.81,
    startingFuel: 75,
  },
  {
    levelNumber: 3,
    platformWidth: 5,
    platformDepth: 5,
    // platformMovement: {
    //   type: "oscillate",
    //   axis: "x",
    //   amplitude: 5,
    //   frequency: 0.001,
    // },
    windStrength: 1.5,
    gravity: -9.81,
    startingFuel: 50,
  },
  // {
  //   levelNumber: 4,
  //   platformWidth: 5,
  //   platformDepth: 5,
  //   windStrength: 2,
  //   gravity: -9.81,
  //   startingFuel: 25,
  //   // obstacles: {
  //   //   type: "asteroid",
  //   //   count: 5,
  //   //   size: 2,
  //   // },
  // },
  // {
  //   levelNumber: 5,
  //   platformWidth: 3,
  //   platformDepth: 3,
  //   windStrength: 2,
  //   gravity: -10,
  //   startingFuel: 10,
  // },
];

/**
 * Sea environment levels configuration
 */
export const seaLevels: LevelConfig[] = [
  {
    levelNumber: 1,
    platformWidth: 20,
    platformDepth: 10,
    windStrength: 0,
    gravity: -9.81,
    startingFuel: 100,
    waveHeight: 0.2,
  },
  {
    levelNumber: 2,
    platformWidth: 15,
    platformDepth: 8,
    windStrength: 1,
    gravity: -9.81,
    startingFuel: 75,
    waveHeight: 0.2,
  },
  {
    levelNumber: 3,
    platformWidth: 10,
    platformDepth: 5,
    // platformMovement: {
    //   type: "tilt",
    //   axis: "z",
    //   amplitude: 0.1,
    //   frequency: 0.002,
    // },
    windStrength: 2,
    gravity: -9.81,
    startingFuel: 50,
    waveHeight: 0.5,
  },
  // {
  //   levelNumber: 4,
  //   platformWidth: 5,
  //   platformDepth: 5,
  //   windStrength: 3,
  //   gravity: -9.81,
  //   startingFuel: 25,
  //   waveHeight: 0.2,
  //   platformMovement: {
  //     type: "oscillate",
  //     axis: "x",
  //     amplitude: 0.1,
  //     frequency: 0.002,
  //   },
  // },
  // {
  //   levelNumber: 5,
  //   platformWidth: 5,
  //   platformDepth: 3,
  //   windStrength: 4,
  //   gravity: -9.81,
  //   startingFuel: 10,
  //   waveHeight: 1,
  //   visibility: "low",
  //   platformMovement: {
  //     type: "drift",
  //     axis: "x",
  //     amplitude: 0.1,
  //     frequency: 0.002,
  //   },
  // },
];
