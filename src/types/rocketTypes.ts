import * as THREE from "three";

export interface RocketParams {
  position?: THREE.Vector3;
  color?: number;
}

export interface ThrusterConfig {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  spread: number;
  speed: number;
  count: number;
  color: number;
  size: number;
  lifetime: number;
  diameter?: number;
}

export interface RocketModelConfig {
  scale: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  thrusters: ThrusterConfig[];
  physicsBody: {
    radius: number;
    height: number;
    collisionOffset?: number;
  };
}
