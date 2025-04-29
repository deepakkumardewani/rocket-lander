import * as THREE from "three";
import * as CANNON from "cannon-es";
import { world, createPhysicsMaterial } from "./physics";
import {
  handleRenderingError,
  handlePhysicsError,
} from "../utils/errorHandler";
import { assetLoader } from "../utils/assetLoader";
import { ParticleSystem } from "./ParticleSystem";
import { useGameStore } from "../stores/gameStore";
import type { RocketParams, RocketModelConfig } from "../types/rocketTypes";
import { ROCKET_MODELS_CONFIG } from "../lib/config";

/**
 * Class representing a rocket in the game
 */
export class Rocket {
  private mesh: THREE.Object3D;
  private body: CANNON.Body;
  private rocketMaterial: CANNON.Material;
  private thrusterParticles: ParticleSystem[];
  private modelConfig: RocketModelConfig;

  /**
   * Create a new rocket
   * @param params Optional parameters to customize the rocket
   */
  constructor(params: RocketParams = {}) {
    try {
      // Get appropriate configuration for the current rocket model
      const gameStore = useGameStore();
      const currentModel = gameStore.rocketModel;
      this.modelConfig =
        ROCKET_MODELS_CONFIG[currentModel.id] ||
        ROCKET_MODELS_CONFIG["default"];

      // Set default values if not provided
      const position =
        params.position ||
        new THREE.Vector3(
          this.modelConfig.position.x,
          this.modelConfig.position.y,
          this.modelConfig.position.z
        );

      console.log("position", position);
      // Get the rocket model from the asset loader
      const rocketModel = assetLoader.getModel("rocket");

      if (!rocketModel) {
        throw new Error("Rocket model not loaded");
      }

      // Always clone the model to ensure we have a fresh instance
      this.mesh = rocketModel.clone();

      // Set up the mesh position first
      this.mesh.position.copy(position);

      // Scale the model using the model-specific scale factor
      this.mesh.scale.set(
        this.modelConfig.scale,
        this.modelConfig.scale,
        this.modelConfig.scale
      );

      // Apply model-specific position offset AFTER scaling
      this.mesh.position.copy(this.modelConfig.position);

      // Apply model-specific rotation
      this.mesh.rotation.copy(this.modelConfig.rotation);

      // Apply shadow settings to all meshes in the model
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Create physics material
      this.rocketMaterial = createPhysicsMaterial("rocket", 0.2, 0.5);

      // Create physics body using cylinder shape for collision
      // Use physics body dimensions from model config
      const bodyRadius = this.modelConfig.physicsBody.radius;
      const bodyHeight = this.modelConfig.physicsBody.height;

      this.body = new CANNON.Body({
        mass: 1, // kg
        material: this.rocketMaterial,
        shape: new CANNON.Cylinder(bodyRadius, bodyRadius, bodyHeight, 8),
        position: new CANNON.Vec3(
          this.modelConfig.position.x,
          this.modelConfig.position.y,
          this.modelConfig.position.z
        ),
        linearDamping: 0.1, // Air resistance for linear motion
        angularDamping: 0.5, // Air resistance for rotation
      });

      // Set initial rotation from model config
      const quaternion = new THREE.Quaternion().setFromEuler(
        this.modelConfig.rotation
      );
      this.body.quaternion.set(
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      );

      // Adjust the shape offset so the bottom of the cylinder contacts surfaces
      const cylinderHeight = bodyHeight / 2;
      // Use collisionOffset from config if available, otherwise use default calculation
      const offsetY =
        this.modelConfig.physicsBody.collisionOffset !== undefined
          ? this.modelConfig.physicsBody.collisionOffset
          : -cylinderHeight / 2;
      this.body.shapeOffsets[0].set(0, offsetY, 0);
      this.body.updateMassProperties();
      this.body.updateBoundingRadius();

      // Add body to physics world
      world.addBody(this.body);

      // Store a reference to this object for easier access in collision handling
      this.mesh.userData.owner = this;
      // Use type assertion for userData since it's not in the type definition
      (this.body as any).userData = { type: "rocket", owner: this };

      // Create thruster particle systems with model-specific settings
      this.thrusterParticles = this.modelConfig.thrusters.map(
        (thrusterConfig) =>
          new ParticleSystem({
            count: thrusterConfig.count,
            color: thrusterConfig.color,
            size: thrusterConfig.size,
            lifetime: thrusterConfig.lifetime,
          })
      );
    } catch (error) {
      handleRenderingError("Failed to create rocket", error as Error);
      throw error; // Re-throw to prevent creating an invalid object
    }
  }

  /**
   * Get the Three.js object for the rocket
   * @returns The rocket's 3D object
   */
  getMesh(): THREE.Object3D {
    return this.mesh;
  }

  /**
   * Get the Cannon.js body for the rocket
   * @returns The rocket's physics body
   */
  getBody(): CANNON.Body {
    return this.body;
  }

  /**
   * Get all thruster particle systems
   * @returns Array of thruster particle systems
   */
  getThrusterParticles(): ParticleSystem[] {
    return this.thrusterParticles;
  }

  /**
   * Get the model configuration
   * @returns The rocket's model configuration
   */
  getModelConfig(): RocketModelConfig {
    return this.modelConfig;
  }

  /**
   * Emit particles from all thrusters
   * @param count Number of particles to emit per thruster
   */
  emitThrusterParticles(count: number = 10): void {
    this.modelConfig.thrusters.forEach((thrusterConfig, index) => {
      // Use the model-specific thruster position
      const localPosition = thrusterConfig.position.clone();

      // If diameter is specified, randomly distribute particles within the circular area
      if (thrusterConfig.diameter) {
        const radius = (thrusterConfig.diameter * Math.sqrt(Math.random())) / 2;
        const angle = Math.random() * Math.PI * 2;
        localPosition.x += radius * Math.cos(angle);
        localPosition.z += radius * Math.sin(angle);
      }

      const worldPosition = this.mesh.localToWorld(localPosition.clone());

      // Use the model-specific thruster direction
      const localDirection = thrusterConfig.direction.clone();
      const worldDirection = this.mesh
        .localToWorld(localDirection.clone())
        .sub(this.mesh.position)
        .normalize();

      // Spawn particles using model-specific settings
      this.thrusterParticles[index].spawn(
        worldPosition,
        worldDirection,
        thrusterConfig.spread,
        thrusterConfig.speed,
        count
      );
    });
  }

  /**
   * Set the position of the rocket
   * @param position The new position
   */
  setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
    this.body.position.set(position.x, position.y, position.z);
    this.body.previousPosition.set(position.x, position.y, position.z);
  }

  /**
   * Set the rotation of the rocket
   * @param rotation The new rotation as Euler angles
   */
  setRotation(rotation: THREE.Euler): void {
    this.mesh.rotation.copy(rotation);
    const quaternion = new THREE.Quaternion().setFromEuler(rotation);
    this.body.quaternion.set(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    );
    this.body.previousQuaternion.set(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    );
  }

  /**
   * Update the rocket's quaternion
   * @param quaternion The new quaternion
   */
  setQuaternion(quaternion: THREE.Quaternion): void {
    this.mesh.quaternion.copy(quaternion);
    this.body.quaternion.set(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    );
  }

  /**
   * Apply a force to the rocket in its local space
   * @param force Force vector in local space
   * @param worldPoint Point in world space to apply the force (default: body center)
   */
  applyLocalForce(force: CANNON.Vec3, worldPoint?: CANNON.Vec3): void {
    try {
      const worldForce = this.body.quaternion.vmult(force);
      this.body.applyForce(worldForce, worldPoint || this.body.position);
    } catch (error) {
      handlePhysicsError("Error applying force to rocket", error as Error);
    }
  }

  /**
   * Apply an impulse to the rocket in its local space
   * @param impulse Impulse vector in local space
   * @param worldPoint Point in world space to apply the impulse (default: body center)
   */
  applyLocalImpulse(impulse: CANNON.Vec3, worldPoint?: CANNON.Vec3): void {
    try {
      const worldImpulse = this.body.quaternion.vmult(impulse);
      this.body.applyImpulse(worldImpulse, worldPoint || this.body.position);
    } catch (error) {
      handlePhysicsError("Error applying impulse to rocket", error as Error);
    }
  }

  /**
   * Add the rocket to a Three.js scene
   * @param scene The scene to add the rocket to
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
    this.thrusterParticles.forEach((particles) => {
      scene.add(particles.getMesh());
    });
  }

  /**
   * Remove the rocket from a Three.js scene
   * @param scene The scene to remove the rocket from
   */
  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.thrusterParticles.forEach((particles) => {
      scene.remove(particles.getMesh());
    });
  }

  /**
   * Dispose of resources used by the rocket
   */
  dispose(): void {
    // Remove from physics world
    world.removeBody(this.body);

    // Dispose of particle systems
    this.thrusterParticles.forEach((particles) => {
      particles.dispose();
    });

    // Dispose of Three.js resources
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material: THREE.Material) =>
              material.dispose()
            );
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}
