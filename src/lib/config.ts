import type { RocketModelConfig } from "../types/rocketTypes";
import type { RocketModel } from "../types/storeTypes";
import * as THREE from "three";
export const rocketModels: RocketModel[] = [
  {
    id: "classic",
    name: "Classic Rocket",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085716/rocket-lander/models/rocket_wrazkf.glb",
    position: { x: 0, y: -15, z: 0 },
    cameraPosition: { x: 0, y: 0, z: -40 },
  },
  {
    id: "old",
    name: "Vintage Rocket",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745086362/rocket-lander/models/old_rocket_jmzeww.glb",
    position: { x: 0, y: 0.05, z: 0 },
    cameraPosition: { x: 0, y: 0, z: 0.3 },
  },
  {
    id: "starship",
    name: "Starship",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745086350/rocket-lander/models/starship_-_space_x_yqf9iv.glb",
    position: { x: 0, y: 0, z: 0 },
    cameraPosition: { x: 0, y: 0, z: 0 },
  },
  {
    id: "grasshopper",
    name: "Grasshopper",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745086347/rocket-lander/models/spacex_grasshopper_uurywz.glb",
    position: { x: 0, y: 0, z: 0 },
    cameraPosition: { x: 0, y: 0, z: 0 },
  },
  {
    id: "falcon_heavy",
    name: "Falcon Heavy",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745086346/rocket-lander/models/spacex_falcon_heavy.glb",
    position: { x: 100, y: -90, z: 0 },
    cameraPosition: { x: 0, y: 0, z: 400 },
  },
  {
    id: "sci_fi",
    name: "Sci-Fi Rocket",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745086344/rocket-lander/models/sci-fi_rocket_jueep4.glb",
    position: { x: 0, y: -5, z: 0 },
    cameraPosition: { x: 0, y: 0, z: 0 },
  },
];

export const ROCKET_MODELS_CONFIG: Record<string, RocketModelConfig> = {
  // Specific rocket model configurations
  classic: {
    scale: 0.2,
    position: new THREE.Vector3(0, 15, 0),
    rotation: new THREE.Euler(0, 0, 0),
    thrusters: [
      {
        position: new THREE.Vector3(0, -1, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 4,
        speed: 3,
        count: 300,
        color: 0xffa500, // Orange
        size: 0.3,
        lifetime: 0.8,
      },
    ],
    physicsBody: {
      radius: 0.1,
      height: 0.4,
      collisionOffset: 0.1, // Slightly raised collision point
    },
  },
  old: {
    scale: 50,
    position: new THREE.Vector3(0, 25, 0),
    rotation: new THREE.Euler(0, 0, 0),
    thrusters: [
      {
        position: new THREE.Vector3(0, -0.06, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: 400,
        speed: 2.5,
        count: 400,
        color: 0xdd5500,
        size: 0.4,
        lifetime: 0.7,
        diameter: 0.03,
      },
    ],
    physicsBody: {
      radius: 0.075,
      height: 0.3,
      collisionOffset: -5, // Raised collision point to avoid going below platform
    },
  },
  starship: {
    scale: 100,
    position: new THREE.Vector3(0, 15, 0),
    rotation: new THREE.Euler(0, 0, 0),
    thrusters: [
      {
        position: new THREE.Vector3(0, -0.001, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: 500,
        speed: 3.5,
        count: 400,
        color: 0xdd5500,
        size: 0.45,
        lifetime: 0.9,
      },
      {
        position: new THREE.Vector3(0.005, -0.001, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 3.5,
        count: 400,
        color: 0xdd5500,
        size: 0.45,
        lifetime: 0.9,
      },
      {
        position: new THREE.Vector3(-0.005, -0.001, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 3.5,
        count: 400,
        color: 0xdd5500,
        size: 0.45,
        lifetime: 0.9,
      },
      {
        position: new THREE.Vector3(-0.005, -0.001, 0.01),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 3.5,
        count: 400,
        color: 0xdd5500,
        size: 0.45,
        lifetime: 0.9,
      },
      {
        position: new THREE.Vector3(0.005, -0.001, 0.01),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 3.5,
        count: 400,
        color: 0xdd5500,
        size: 0.45,
        lifetime: 0.9,
      },
      {
        position: new THREE.Vector3(0, -0.001, 0.01),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 3.5,
        count: 400,
        color: 0xdd5500,
        size: 0.45,
        lifetime: 0.9,
      },
    ],
    physicsBody: {
      radius: 0.03,
      height: 0.12,
      collisionOffset: -0.3, // Adjusted for starship model
    },
  },
  grasshopper: {
    scale: 0.5,
    position: new THREE.Vector3(0, 25, 0),
    rotation: new THREE.Euler(0, 200, 0),
    thrusters: [
      {
        position: new THREE.Vector3(0, -12.5, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 2.8,
        count: 400,
        color: 0xff9900, // Yellow-orange
        size: 0.5,
        lifetime: 0.85,
      },
    ],
    physicsBody: {
      radius: 0.25,
      height: 1.0,
      collisionOffset: -8, // Adjusted for grasshopper model
    },
  },
  falcon_heavy: {
    scale: 0.05,
    position: new THREE.Vector3(-6, 20, 0),
    rotation: new THREE.Euler(0, Math.PI, 0),
    thrusters: [
      {
        // Center core thruster
        position: new THREE.Vector3(-100, -2.2, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 10,
        speed: 6,
        count: 560,
        color: 0xffab44, // Light orange
        size: 0.5,
        lifetime: 1.0,
      },
      {
        // Left booster thruster
        position: new THREE.Vector3(-115, -2.2, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 10,
        speed: 6,
        count: 560,
        color: 0xffab44,
        size: 0.5,
        lifetime: 1.0,
        diameter: 1.5, // Slightly smaller diameter for boosters
      },
      {
        // Right booster thruster
        position: new THREE.Vector3(-135, -2.2, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 10,
        speed: 6,
        count: 560,
        color: 0xffab44,
        size: 0.5,
        lifetime: 1.0,
        diameter: 1.5, // Slightly smaller diameter for boosters
      },
    ],
    physicsBody: {
      radius: 0.025,
      height: 0.1,
      collisionOffset: 0.025, // Adjusted for falcon heavy model
    },
  },
  sci_fi: {
    scale: 0.6,
    position: new THREE.Vector3(0, 20, 0),
    rotation: new THREE.Euler(0, 0, 0),
    thrusters: [
      {
        position: new THREE.Vector3(0, -2.2, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 3.2,
        count: 500,
        color: 0xffa500, // Cyan-green
        size: 0.3,
        lifetime: 0.95,
        diameter: 2.0, // Large diameter for center core
      },
    ],
    physicsBody: {
      radius: 0.25,
      height: 1.0,
      collisionOffset: -1,
    },
  },
};

export const seaTexturesOptions = [
  {
    value: "vintage",
    label: "Vintage Boat",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085498/rocket-lander/textures/boat/vintage_auf2gz.jpg",
  },
  {
    value: "boat_1",
    label: "Classic Boat",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085499/rocket-lander/textures/boat/boat_1_k1eghe.jpg",
  },
  {
    value: "boat_2",
    label: "Modern Boat",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085499/rocket-lander/textures/boat/boat_2_iquqno.jpg",
  },
  {
    value: "boat_3",
    label: "Future Boat",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085497/rocket-lander/textures/boat/boat_3_itdza8.jpg",
  },
];

export const spaceTexturesOptions = [
  {
    value: "metallic",
    label: "Metallic",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085498/rocket-lander/textures/platform/metallic_srmsbz.jpg",
  },
  {
    value: "metallic_1",
    label: "Steel",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085500/rocket-lander/textures/platform/metallic_1_slnhbg.jpg",
  },
  {
    value: "metallic_2",
    label: "Chrome",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085501/rocket-lander/textures/platform/metallic_2_rccd4n.jpg",
  },
  {
    value: "metallic_3",
    label: "Iron",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085500/rocket-lander/textures/platform/metallic_3_uxp7te.jpg",
  },
  {
    value: "gold",
    label: "Gold",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085498/rocket-lander/textures/platform/gold_ffg9ej.jpg",
  },
  {
    value: "neon",
    label: "Neon",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085500/rocket-lander/textures/platform/neon_ejbfzn.jpg",
  },
  {
    value: "night_sky",
    label: "Night Sky",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085501/rocket-lander/textures/platform/night_sky_uab4f6.jpg",
  },
  {
    value: "platform_1",
    label: "Classic",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085500/rocket-lander/textures/platform/platform_1_tafwy8.jpg",
  },
];
