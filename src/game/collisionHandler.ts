import * as CANNON from "cannon-es";
import * as THREE from "three";

import { useGameStore } from "../stores/gameStore";
import type { LandingMetrics } from "../types/storeTypes";
import { handlePhysicsError } from "../utils/errorHandler";
import { ParticleSystem } from "./ParticleSystem";
import { onCollision } from "./physics";

// Constants for successful landing criteria
const MAX_LANDING_VELOCITY = 5; // Maximum vertical velocity for a safe landing (m/s)
const MAX_LANDING_ANGLE = 5; // Maximum angle from vertical for a safe landing (degrees)

// Crash particle system for reuse across all collisions
let crashParticles: ParticleSystem | null = null;

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
 * Checks if a body is a primary landing target
 * @param body The physics body to check
 * @returns True if body is the primary landing target
 */
function isPrimaryLandingTarget(body: CANNON.Body): boolean {
  return landingTargets.get(body) === true;
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

  // Initialize crash particle system if not already created
  if (!crashParticles) {
    crashParticles = new ParticleSystem({
      count: 150,
      color: 0xff0000, // Red color for crash
      size: 0.3,
      lifetime: 1.5 // Longer lifetime for crash effect
    });
  }

  try {
    // Set up rocket collision event listener
    const cleanup = onCollision(rocketBody, (event) => {
      // Prevent handling multiple collisions after landing
      if (gameStore.gameState === "landed" || gameStore.gameState === "crashed") {
        return;
      }

      // Check collision type based on the object hit
      if (isLandingTarget(event.body)) {
        console.log("Collision detected between rocket and potential landing surface");

        // For Sea Level 4, only allow landing on the primary target
        const isSeaLevel4 = gameStore.environment === "sea" && gameStore.currentLevel === 4;

        // Check if landing was successful
        const landingResult = checkLandingSuccess(rocketBody);

        // For Sea Level 4, if it's not the primary target, always count as crash
        if (isSeaLevel4 && !isPrimaryLandingTarget(event.body)) {
          gameStore.setGameState("crashed");
          console.log("Landing failed: Wrong platform - you must land on the green platform");

          // Store the landing metrics for crash display
          gameStore.calculateScore(landingResult.metrics);

          // Spawn crash particles
          if (crashParticles) {
            const position = new THREE.Vector3(
              rocketBody.position.x,
              rocketBody.position.y,
              rocketBody.position.z
            );

            crashParticles.spawn(position, new THREE.Vector3(0, 1, 0), Math.PI, 5, 100);
          }

          // Call crash callback if provided
          if (onCrash) {
            onCrash();
          }

          return;
        }

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

          // Spawn crash particles at the rocket's position
          if (crashParticles) {
            const position = new THREE.Vector3(
              rocketBody.position.x,
              rocketBody.position.y,
              rocketBody.position.z
            );

            // Spawn particles in all directions (explosion-like)
            crashParticles.spawn(
              position,
              new THREE.Vector3(0, 1, 0), // Direction doesn't matter as much with wide spread
              Math.PI, // Full 180-degree spread for explosion effect
              5, // Higher speed for explosion
              100 // Spawn many particles for dramatic effect
            );
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

        // Check if collision is with an obstacle
        const isMeshObstacle = event.body.collisionFilterGroup === 2;
        console.log(
          isMeshObstacle
            ? "Rocket crashed into an obstacle"
            : "Rocket crashed into terrain or other object"
        );

        // Spawn crash particles
        if (crashParticles) {
          const position = new THREE.Vector3(
            rocketBody.position.x,
            rocketBody.position.y,
            rocketBody.position.z
          );

          crashParticles.spawn(position, new THREE.Vector3(0, 1, 0), Math.PI, 5, 100);
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
 * Get the crash particle system
 * @returns The crash particle system or null if not created
 */
export function getCrashParticles(): ParticleSystem | null {
  return crashParticles;
}
