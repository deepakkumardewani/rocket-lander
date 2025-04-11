import * as CANNON from "cannon-es";
import { Vec3 } from "cannon-es";
import * as THREE from "three";
import { onCollision } from "./physics";
import { ErrorType, handlePhysicsError } from "../utils/errorHandler";
import { useGameStore } from "../stores/gameStore";
import type { LandingMetrics } from "../stores/gameStore";
import { ParticleSystem } from "./particleSystem";

// Constants for successful landing criteria
const MAX_LANDING_VELOCITY = 5; // Maximum vertical velocity for a safe landing (m/s)
const MAX_LANDING_ANGLE = 5; // Maximum angle from vertical for a safe landing (degrees)

// Crash particle system for reuse across all collisions
let crashParticles: ParticleSystem | null = null;

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
  const angle = Math.acos(
    worldUpVector.dot(worldUp) / (worldUpVector.length() * worldUp.length())
  );
  const angleDegrees = angle * (180 / Math.PI);

  // Get the rocket's metrics for evaluation
  const metrics: LandingMetrics = {
    position: {
      x: rocketBody.position.x,
      y: rocketBody.position.y,
      z: rocketBody.position.z,
    },
    velocity: {
      x: rocketBody.velocity.x,
      y: rocketBody.velocity.y,
      z: rocketBody.velocity.z,
    },
  };

  // Check velocity (vertical component must be below threshold)
  const velocityCheck = Math.abs(rocketBody.velocity.y) < MAX_LANDING_VELOCITY;

  // Check orientation (must be mostly upright)
  const angleCheck = angleDegrees < MAX_LANDING_ANGLE;

  // Determine success and reason for failure if applicable
  const success = velocityCheck && angleCheck;
  let reason: string | undefined;

  if (!velocityCheck) {
    reason = `Landing too hard (${Math.abs(rocketBody.velocity.y).toFixed(
      2
    )} m/s)`;
  } else if (!angleCheck) {
    reason = `Rocket not upright (${angleDegrees.toFixed(1)} degrees)`;
  }

  return {
    success,
    metrics,
    reason,
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

  // Initialize crash particle system if not already created
  if (!crashParticles) {
    crashParticles = new ParticleSystem({
      count: 150,
      color: 0xff0000, // Red color for crash
      size: 0.3,
      lifetime: 1.5, // Longer lifetime for crash effect
    });
  }

  try {
    // Set up rocket collision event listener
    const cleanup = onCollision(rocketBody, (event) => {
      // Prevent handling multiple collisions after landing
      if (
        gameStore.gameState === "landed" ||
        gameStore.gameState === "crashed"
      ) {
        return;
      }

      // Check if the collision is with the platform
      if (event.body === platformBody) {
        console.log("Collision detected between rocket and platform");

        // Check if landing was successful
        const landingResult = checkLandingSuccess(rocketBody);

        if (landingResult.success) {
          // Successful landing - stop rocket movement
          rocketBody.velocity.setZero();
          rocketBody.angularVelocity.setZero();
          rocketBody.type = CANNON.Body.STATIC; // Make it static to prevent further movement

          // Update game state
          gameStore.setGameState("landed");

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
        // Collision with anything other than the platform (terrain, etc) is an automatic crash
        gameStore.setGameState("crashed");
        console.log("Rocket crashed into terrain or other object");

        // Spawn crash particles
        if (crashParticles) {
          const position = new THREE.Vector3(
            rocketBody.position.x,
            rocketBody.position.y,
            rocketBody.position.z
          );

          crashParticles.spawn(
            position,
            new THREE.Vector3(0, 1, 0),
            Math.PI,
            5,
            100
          );
        }

        // Call crash callback if provided
        if (onCrash) {
          onCrash();
        }
      }
    });

    return cleanup;
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
  return setupCollisionDetection(
    rocketBody,
    platformBody,
    onSuccessfulLanding,
    onCrash
  );
}

/**
 * Get the crash particle system
 * @returns The crash particle system or null if not created
 */
export function getCrashParticles(): ParticleSystem | null {
  return crashParticles;
}
