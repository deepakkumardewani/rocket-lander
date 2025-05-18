import * as CANNON from "cannon-es";
import * as THREE from "three";

import { handlePhysicsError } from "../utils/errorHandler";

import { WIND_CHANGE_INTERVAL, WIND_CHANGE_SPEED } from "../constants";

// Create and configure the physics world
export const world = new CANNON.World();
world.gravity.set(0, -9.81, 0); // Set gravity along the Y axis
world.broadphase = new CANNON.NaiveBroadphase();
// Set advanced properties safely
try {
  // Using dynamic property access to avoid TypeScript errors
  (world.solver as any).iterations = 10;
} catch (error) {
  console.warn("Could not set solver iterations:", error);
}
world.defaultContactMaterial.contactEquationStiffness = 1e6;
world.defaultContactMaterial.contactEquationRelaxation = 3;

// Wind strength for environment effects (0 = no wind)
export let windStrength: number = 0;

// Current wind direction vector (normalized)
const currentWindDirection = new CANNON.Vec3(1, 0, 0);

// Time until next wind change
let windChangeTime = 0;

// Target wind direction for smooth transitions
let targetWindDirection = new CANNON.Vec3(1, 0, 0);

/**
 * Set the gravity for the physics world
 * @param gravity Gravity value along Y axis (negative for downward)
 */
export function setGravity(gravity: number): void {
  world.gravity.set(0, gravity, 0);
}

/**
 * Set the wind strength for the environment
 * @param strength Wind strength value (0 = no wind)
 */
export function setWindStrength(strength: number): void {
  windStrength = strength;
}

/**
 * Update the physics simulation by one time step
 * @param timeStep Time step in seconds (default: 1/60)
 */
export function updatePhysics(timeStep = 1 / 60): void {
  try {
    // Apply wind effects to dynamic bodies if wind strength > 0
    if (windStrength > 0) {
      // Update wind direction periodically
      windChangeTime -= timeStep;
      if (windChangeTime <= 0) {
        // Set new target wind direction
        const randomX = (Math.random() - 0.5) * 2;
        const randomZ = (Math.random() - 0.5) * 2;
        targetWindDirection.set(randomX, 0, randomZ);
        // Normalize manually
        const length = Math.sqrt(randomX * randomX + randomZ * randomZ);
        if (length > 0) {
          targetWindDirection.scale(1 / length, targetWindDirection);
        }
        windChangeTime = WIND_CHANGE_INTERVAL;
      }

      // Smoothly interpolate current wind direction toward target
      currentWindDirection.x +=
        (targetWindDirection.x - currentWindDirection.x) * WIND_CHANGE_SPEED;
      // currentWindDirection.z +=
      //   (targetWindDirection.z - currentWindDirection.z) * WIND_CHANGE_SPEED;

      // Normalize manually
      const length = Math.sqrt(currentWindDirection.x * currentWindDirection.x);
      if (length > 0) {
        currentWindDirection.scale(1 / length, currentWindDirection);
      }

      // Find and apply wind to rocket body
      const dynamicBodies = world.bodies.filter((body) => body.type === CANNON.Body.DYNAMIC);

      for (const body of dynamicBodies) {
        if ((body as any).userData?.type === "rocket") {
          // Apply wind force at the center of mass with current direction
          const windForce = new CANNON.Vec3(
            currentWindDirection.x * windStrength,
            currentWindDirection.y * windStrength,
            currentWindDirection.z * windStrength
          );
          body.applyForce(windForce, new CANNON.Vec3(0, 0, 0));
        }
      }
    }

    world.step(timeStep);
  } catch (error) {
    handlePhysicsError("Error updating physics world", error as Error);
  }
}

/**
 * Sync a THREE.js mesh with its corresponding CANNON.js body
 * @param mesh The THREE.js mesh to sync
 * @param body The CANNON.js body to sync with
 */
export function syncMeshWithBody(mesh: THREE.Object3D, body: CANNON.Body): void {
  mesh.position.copy(body.position as unknown as THREE.Vector3);
  mesh.quaternion.copy(body.quaternion as unknown as THREE.Quaternion);
}

/**
 * Register a collision listener for a body
 * @param body The body to listen for collisions
 * @param callback Function to call when a collision occurs
 * @returns A function to remove the event listener
 */
export function onCollision(
  body: CANNON.Body,
  callback: (event: {
    body: CANNON.Body;
    target: CANNON.Body;
    contact: CANNON.ContactEquation;
  }) => void
): () => void {
  body.addEventListener("collide", callback);
  return () => body.removeEventListener("collide", callback);
}

/**
 * Create a new physics material with the specified properties
 * @param name Name of the material
 * @param restitution Material restitution (bounciness)
 * @param friction Material friction
 * @returns The created physics material
 */
export function createPhysicsMaterial(name: string): CANNON.Material {
  return new CANNON.Material(name);
}

/**
 * Clean up physics resources
 */
export function disposePhysics(): void {
  // Remove all bodies from the world
  while (world.bodies.length > 0) {
    world.removeBody(world.bodies[0]);
  }
}
