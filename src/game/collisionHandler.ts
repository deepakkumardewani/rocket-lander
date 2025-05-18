import * as CANNON from "cannon-es";
import * as THREE from "three";

import type { LandingMetrics } from "../types/storeTypes";

import { useGameStore } from "../stores/gameStore";

import { handlePhysicsError } from "../utils/errorHandler";

import {
  createCrashEffect,
  disposeCrashEffects,
  getCrashEffectMeshes,
  initCrashEffects,
  updateCrashEffects
} from "./enhancedCrashEffect";
// import { ParticleSystem } from "./particleSystem";
import { onCollision } from "./physics";

// Constants for successful landing criteria
const MAX_LANDING_VELOCITY = 5; // Maximum vertical velocity for a safe landing (m/s)
const MAX_LANDING_ANGLE = 5; // Maximum angle from vertical for a safe landing (degrees)

// Map to track objects that should be treated as landing platforms
const landingTargets = new Map<CANNON.Body, boolean>();

/**
 * Registers a platform as a valid landing target
 * @param body The physics body of the platform
 * @param isTarget Whether this is a primary landing target
 */
export function registerLandingTarget(body: CANNON.Body, isTarget: boolean = true): void {
  landingTargets.set(body, isTarget);
}

/**
 * Clears all registered landing targets
 */
export function clearLandingTargets(): void {
  landingTargets.clear();
}

/**
 * Checks if a body is a registered landing target
 * @param body The physics body to check
 * @returns True if body is a valid landing target
 */
function isLandingTarget(body: CANNON.Body): boolean {
  return landingTargets.has(body);
}

/**
 * Checks if a landing was successful based on criteria
 * @param rocketBody The rocket's physics body
 * @returns Object with success flag and detailed metrics
 */
function checkLandingSuccess(rocketBody: CANNON.Body): {
  success: boolean;
  metrics: LandingMetrics;
  reason?: string;
} {
  // Convert the rocket's up vector (local Y) to world space
  const localUpVector = new CANNON.Vec3(0, 1, 0);
  const worldUpVector = rocketBody.quaternion.vmult(localUpVector);

  // Calculate angle between rocket's up vector and world up vector
  const worldUp = new CANNON.Vec3(0, 1, 0);
  const angle = Math.acos(worldUpVector.dot(worldUp) / (worldUpVector.length() * worldUp.length()));
  const angleDegrees = angle * (180 / Math.PI);

  // Get the rocket's metrics for evaluation
  const metrics: LandingMetrics = {
    position: {
      x: rocketBody.position.x,
      y: rocketBody.position.y,
      z: rocketBody.position.z
    },
    velocity: {
      x: rocketBody.velocity.x,
      y: rocketBody.velocity.y,
      z: rocketBody.velocity.z
    }
  };

  // Check velocity (vertical component must be below threshold)
  const velocityCheck = Math.abs(rocketBody.velocity.y) < MAX_LANDING_VELOCITY;

  // Check orientation (must be mostly upright)
  const angleCheck = angleDegrees < MAX_LANDING_ANGLE;

  // Determine success and reason for failure if applicable
  const success = velocityCheck && angleCheck;
  let reason: string | undefined;

  if (!velocityCheck) {
    reason = `Landing too hard (${Math.abs(rocketBody.velocity.y).toFixed(2)} m/s)`;
  } else if (!angleCheck) {
    reason = `Rocket not upright (${angleDegrees.toFixed(1)} degrees)`;
  }

  return {
    success,
    metrics,
    reason
  };
}

/**
 * Sets up collision detection between rocket and platform
 * @param rocketBody The rocket's physics body
 * @param platformBody The platform's physics body
 * @param onSuccessfulLanding Callback function to execute on successful landing
 * @param onCrash Callback function to execute on crash
 * @returns A cleanup function to remove event listeners
 */
export function setupCollisionDetection(
  rocketBody: CANNON.Body,
  platformBody: CANNON.Body,
  onSuccessfulLanding?: () => void,
  onCrash?: () => void
): () => void {
  const gameStore = useGameStore();

  // Register the platform as a landing target by default
  registerLandingTarget(platformBody, true);

  // Initialize enhanced crash effects
  initCrashEffects();

  try {
    // Set up rocket collision event listener
    const cleanup = onCollision(rocketBody, (event) => {
      // Prevent handling multiple collisions after landing
      if (gameStore.gameState === "landed" || gameStore.gameState === "crashed") {
        return;
      }

      // Check collision type based on the object hit
      if (isLandingTarget(event.body)) {
        // console.log("Collision detected between rocket and potential landing surface");

        // Check if landing was successful
        const landingResult = checkLandingSuccess(rocketBody);

        if (landingResult.success) {
          // Successful landing - stop rocket movement
          rocketBody.velocity.setZero();
          rocketBody.angularVelocity.setZero();
          rocketBody.type = CANNON.Body.STATIC; // Make it static to prevent further movement

          // Update game state
          gameStore.setGameState("landed");

          // Mark level as completed on successful landing
          gameStore.markLevelCompleted();

          // Check for texture unlocks if all levels in the environment are completed
          if (gameStore.currentLevel === gameStore.totalLevels) {
            gameStore.checkForTextureUnlocks();
          }

          // Calculate score based on landing metrics
          gameStore.calculateScore(landingResult.metrics);

          console.log("Successful landing! Score:", gameStore.score);

          // Call success callback if provided
          if (onSuccessfulLanding) {
            onSuccessfulLanding();
          }
        } else {
          // Failed landing - rocket crashed
          gameStore.setGameState("crashed");
          console.log("Landing failed:", landingResult.reason);

          // Store the landing metrics for crash display
          gameStore.calculateScore(landingResult.metrics);

          // Get rocket mesh from userData
          const rocketMesh = (rocketBody as any).userData?.owner?.mesh;
          const scene = rocketMesh?.parent;

          // Create enhanced crash effect
          const position = new THREE.Vector3(
            rocketBody.position.x,
            rocketBody.position.y,
            rocketBody.position.z
          );

          createCrashEffect({
            position,
            rocketMesh,
            scene
          });

          // Hide the original rocket mesh
          if (rocketMesh) {
            rocketMesh.visible = false;
          }

          // Call crash callback if provided
          if (onCrash) {
            onCrash();
          }
        }
      } else {
        // Collision with anything other than a landing target is an automatic crash
        gameStore.setGameState("crashed");

        // Get final metrics for crash display
        const crashMetrics: LandingMetrics = {
          position: {
            x: rocketBody.position.x,
            y: rocketBody.position.y,
            z: rocketBody.position.z
          },
          velocity: {
            x: rocketBody.velocity.x,
            y: rocketBody.velocity.y,
            z: rocketBody.velocity.z
          }
        };
        gameStore.calculateScore(crashMetrics);

        // Get rocket mesh from userData
        const rocketMesh = (rocketBody as any).userData?.owner?.mesh;
        const scene = rocketMesh?.parent;

        // Create enhanced crash effect
        const position = new THREE.Vector3(
          rocketBody.position.x,
          rocketBody.position.y,
          rocketBody.position.z
        );

        createCrashEffect({
          position,
          rocketMesh,
          scene
        });

        // Hide the original rocket mesh
        if (rocketMesh) {
          rocketMesh.visible = false;
        }

        // Call crash callback if provided
        if (onCrash) {
          onCrash();
        }
      }
    });

    return () => {
      cleanup();
      // Remove the platform from landing targets on cleanup
      landingTargets.delete(platformBody);
    };
  } catch (error) {
    handlePhysicsError("Error setting up collision detection", error as Error);
    // Return empty cleanup function in case of error
    return () => {};
  }
}

/**
 * Registers collision detection for the rocket and platform
 * This is a convenience function to be called from GameCanvas
 * @param rocketBody The rocket's physics body
 * @param platformBody The platform's physics body
 * @param onSuccessfulLanding Callback function to execute on successful landing
 * @param onCrash Callback function to execute on crash
 * @returns A cleanup function to remove event listeners
 */
export function registerCollisionHandlers(
  rocketBody: CANNON.Body,
  platformBody: CANNON.Body,
  onSuccessfulLanding?: () => void,
  onCrash?: () => void
): () => void {
  return setupCollisionDetection(rocketBody, platformBody, onSuccessfulLanding, onCrash);
}

/**
 * Get the meshes for crash effects to add to the scene
 * @returns Array of THREE.Object3D instances
 */
export function getCrashParticlesAndFragments(): THREE.Object3D[] {
  return getCrashEffectMeshes();
}

/**
 * Update crash effects (particles and fragments)
 * @param deltaTime Time since last update in seconds
 * @param camera Camera for frustum culling
 */
export function updateCrashParticlesAndFragments(deltaTime: number, camera: THREE.Camera): void {
  updateCrashEffects(deltaTime, camera);
}

/**
 * Clean up all crash effect resources
 */
export function cleanupCrashEffects(): void {
  disposeCrashEffects();
}

/**
 * Resets the rocket visibility after a crash
 * @param rocketBody The rocket's physics body
 */
export function resetRocketVisibility(rocketBody: CANNON.Body): void {
  // Get rocket mesh from userData
  const rocketMesh = (rocketBody as any).userData?.owner?.mesh;

  // Make rocket visible again
  if (rocketMesh) {
    rocketMesh.visible = true;
  }
}
