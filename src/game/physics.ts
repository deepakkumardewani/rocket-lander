import * as CANNON from "cannon-es";
import * as THREE from "three";
import { ErrorType, handlePhysicsError } from "../utils/errorHandler";

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

/**
 * Update the physics simulation by one time step
 * @param timeStep Time step in seconds (default: 1/60)
 */
export function updatePhysics(timeStep = 1 / 60): void {
  try {
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
export function syncMeshWithBody(
  mesh: THREE.Object3D,
  body: CANNON.Body
): void {
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
export function createPhysicsMaterial(
  name: string,
  restitution = 0.3,
  friction = 0.5
): CANNON.Material {
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
