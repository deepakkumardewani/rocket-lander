import * as THREE from "three";

import type { RocketModelConfig } from "../types/rocketTypes";
import type { RocketModel } from "../types/storeTypes";

const orange = 0xdd5500;
const yellowOrange = 0xff9900;
const white = "#fffff0";

export const rocketModels: RocketModel[] = [
  {
    id: "classic",
    name: "Classic Rocket",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745085716/rocket-lander/models/rocket_wrazkf.glb",
    position: { x: 0, y: 3, z: 0 },
    scale: { x: 0.9, y: 0.9, z: 0.9 },
    cameraPosition: { x: 0, y: 0, z: -40 }
  },
  {
    id: "vintage",
    name: "Vintage Rocket",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745086362/rocket-lander/models/old_rocket_jmzeww.glb",
    position: { x: 0, y: 0.007, z: 0 },
    scale: { x: 0.9, y: 0.9, z: 0.9 },
    cameraPosition: { x: 0, y: 0, z: 0.3 },
    lights: [
      {
        type: "AmbientLight",
        color: "white"
      },
      {
        type: "DirectionalLight",
        position: { x: 100, y: 10, z: 100 },
        color: white,
        intensity: 0.8
      },
      {
        type: "PointLight",
        color: white,
        position: { x: 200, y: -200, z: 100 },
        intensity: 1
      }
    ]
  },
  {
    id: "sci_fi",
    name: "Sci-Fi Rocket",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745086344/rocket-lander/models/sci-fi_rocket_jueep4.glb",
    position: { x: 0, y: 1, z: 0 },
    scale: { x: 0.8, y: 0.8, z: 0.8 },
    cameraPosition: { x: 0, y: 0, z: 0 },
    lights: [
      {
        type: "AmbientLight",
        color: "white"
      },
      {
        type: "DirectionalLight",
        position: { x: 100, y: 10, z: 100 },
        color: white,
        intensity: 0.8
      }
    ]
  },
  {
    id: "grasshopper",
    name: "Grasshopper",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745086347/rocket-lander/models/spacex_grasshopper_uurywz.glb",
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 0.8, y: 0.8, z: 0.8 },
    cameraPosition: { x: 0, y: 0, z: 0 }
  },
  {
    id: "starship",
    name: "Starship",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1745086350/rocket-lander/models/starship_-_space_x_yqf9iv.glb",
    position: { x: 0, y: 0.01, z: 0 },
    scale: { x: 0.8, y: 0.8, z: 0.8 },
    cameraPosition: { x: 0, y: 0, z: 0 },
    lights: [
      {
        type: "AmbientLight",
        color: "white"
      },
      {
        type: "DirectionalLight",
        position: { x: 100, y: 10, z: 100 },
        color: white,
        intensity: 0.8
      },
      {
        type: "PointLight",
        color: white,
        position: { x: 200, y: -200, z: 100 },
        intensity: 1
      }
    ]
  },
  {
    id: "falcon_heavy",
    name: "Falcon Heavy",
    url: "https://res.cloudinary.com/ddzuitkzt/image/upload/v1747072613/rocket-lander/models/spacex_falcon_heavy_1.glb",
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 0.7, y: 0.7, z: 0.7 },
    cameraPosition: { x: 0, y: 0, z: 0 },
    lights: [
      {
        type: "AmbientLight",
        color: "white"
      },
      {
        type: "DirectionalLight",
        position: { x: 100, y: 10, z: 100 },
        color: white,
        intensity: 0.8
      },
      {
        type: "PointLight",
        color: white,
        position: { x: 200, y: -200, z: 100 },
        intensity: 1
      }
    ]
  }
];

export const ROCKET_MODELS_CONFIG: Record<string, RocketModelConfig> = {
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
        color: orange, // Orange
        size: 0.3,
        lifetime: 0.8
      }
    ],
    physicsBody: {
      radius: 0.1,
      height: 0.4,
      collisionOffset: 0.1 // Slightly raised collision point
    }
  },
  vintage: {
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
        color: orange,
        size: 0.4,
        lifetime: 0.7,
        diameter: 0.03
      }
    ],
    physicsBody: {
      radius: 0.075,
      height: 0.3,
      collisionOffset: -5 // Raised collision point to avoid going below platform
    }
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
        color: orange,
        size: 0.45,
        lifetime: 0.9
      },
      {
        position: new THREE.Vector3(0.005, -0.001, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 3.5,
        count: 400,
        color: orange,
        size: 0.45,
        lifetime: 0.9
      },
      {
        position: new THREE.Vector3(-0.005, -0.001, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 3.5,
        count: 400,
        color: orange,
        size: 0.45,
        lifetime: 0.9
      },
      {
        position: new THREE.Vector3(-0.005, -0.001, 0.01),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 3.5,
        count: 400,
        color: orange,
        size: 0.45,
        lifetime: 0.9
      },
      {
        position: new THREE.Vector3(0.005, -0.001, 0.01),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 3.5,
        count: 400,
        color: orange,
        size: 0.45,
        lifetime: 0.9
      },
      {
        position: new THREE.Vector3(0, -0.001, 0.01),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 2,
        speed: 3.5,
        count: 400,
        color: orange,
        size: 0.45,
        lifetime: 0.9
      }
    ],
    physicsBody: {
      radius: 0.03,
      height: 0.12,
      collisionOffset: -0.3 // Adjusted for starship model
    }
  },
  grasshopper: {
    scale: 0.5,
    position: new THREE.Vector3(0, 25, 0),
    rotation: new THREE.Euler(0, 200, 0),
    thrusters: [
      {
        position: new THREE.Vector3(0, -12.5, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: 250,
        speed: 2.8,
        count: 500,
        color: yellowOrange, // Yellow-orange
        size: 0.5,
        lifetime: 0.85
      }
    ],
    physicsBody: {
      radius: 0.25,
      height: 1.0,
      collisionOffset: -7 // Adjusted for grasshopper model
    }
  },
  falcon_heavy: {
    scale: 0.05,
    position: new THREE.Vector3(0, 30, 0),
    rotation: new THREE.Euler(0, 0, 0),
    thrusters: [
      {
        // Left booster thruster
        position: new THREE.Vector3(18, -200, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 10,
        speed: 6,
        count: 560,
        color: yellowOrange,
        size: 0.5,
        lifetime: 1.0,
        diameter: 1.5 // Slightly smaller diameter for boosters
      },
      {
        // Center core thruster
        position: new THREE.Vector3(0, -200, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 10,
        speed: 6,
        count: 560,
        color: yellowOrange, // Light orange
        size: 0.5,
        lifetime: 1.0
      },
      {
        // Right booster thruster
        position: new THREE.Vector3(-18, -200, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: Math.PI / 10,
        speed: 6,
        count: 560,
        color: yellowOrange,
        size: 0.5,
        lifetime: 1.0,
        diameter: 1.5 // Slightly smaller diameter for boosters
      }
    ],
    physicsBody: {
      radius: 0.025,
      height: 0.1,
      collisionOffset: -10 // Adjusted for falcon heavy model
    }
  },
  sci_fi: {
    scale: 0.6,
    position: new THREE.Vector3(0, 20, 0),
    rotation: new THREE.Euler(0, 0, 0),
    thrusters: [
      {
        position: new THREE.Vector3(0, -2.2, 0),
        direction: new THREE.Vector3(0, -1, 0),
        spread: 250,
        speed: 3.2,
        count: 800,
        color: yellowOrange,
        size: 0.5,
        lifetime: 0.95,
        diameter: 2.0 // Large diameter for center core
      }
    ],
    physicsBody: {
      radius: 0.25,
      height: 1.0,
      collisionOffset: -1
    }
  }
};

// Define rocket achievement requirements
export const rocketAchievements = {
  vintage: {
    name: "Vintage Rocket",
    requirements: [
      "Complete 3 sea levels",
      "Land with at least 50% fuel remaining",
      "Score above 150 points in any level"
    ]
  },
  sci_fi: {
    name: "Sci-Fi Rocket",
    requirements: [
      "Complete all space levels",
      "Land with velocity under 1.5 m/s at third level in space",
      "Achieve perfect landing (centered on platform)"
    ]
  },
  grasshopper: {
    name: "Grasshopper",
    requirements: [
      "Complete both sea and space environment levels",
      "Land with velocity under 1 m/s three times",
      "Complete any level with 70% fuel remaining"
    ]
  },
  starship: {
    name: "Starship",
    requirements: [
      "Complete all sea and space levels twice",
      "Score above 200 points three times in either sea or space",
      "Perform 10 successful landings in either sea or space"
    ]
  },
  falcon_heavy: {
    name: "Falcon Heavy",
    requirements: [
      "Complete all levels with perfect landings (centered on platform)",
      "Land with over 30% fuel in the third level in space",
      "Unlock all other rockets first"
    ]
  }
};
