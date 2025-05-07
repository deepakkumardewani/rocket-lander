// Game state types
export type GameState = "waiting" | "pre-launch" | "flying" | "landed" | "crashed";
export type TextureType =
  // Boat textures
  | "vintage"
  | "boat_1"
  | "boat_2"
  | "boat_3"
  // Platform textures
  | "metallic"
  | "metallic_1"
  | "metallic_2"
  | "metallic_3"
  | "gold"
  | "neon"
  | "night_sky"
  | "platform_1";
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
export interface RocketModel {
  id: string;
  name: string;
  url: string;
  position: { x: number; y: number; z: number };
  cameraPosition: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  lights?: {
    type: string;
    color: string;
    intensity?: number;
    position?: { x: number; y: number; z: number };
  }[];
}
export interface GameStateValues {
  fuel: number;
  score: number;
  isLanded: boolean;
  gameState: GameState;
  textureChoice: TextureType;
  environment: Environment;
  currentLevel: number;
  isLevelCompleted: boolean;
}

// New interfaces for texture unlocking
export interface UnlockedTextures {
  sea: TextureType[];
  space: TextureType[];
}

export interface TextureUnlockTiers {
  sea: {
    tier1: TextureType[];
    tier2: TextureType[];
  };
  space: {
    tier1: TextureType[];
    tier2: TextureType[];
  };
}

export interface TextureUnlockNotification {
  show: boolean;
  environment: Environment;
  textures: TextureType[];
}
