import * as THREE from "three";
import * as CANNON from "cannon-es";
import { world, createPhysicsMaterial } from "./physics";
import {
  handleRenderingError,
  handlePhysicsError,
} from "../utils/errorHandler";
import { assetLoader } from "../utils/assetLoader";
import { ParticleSystem } from "./particleSystem";

/**
 * Parameters for creating a rocket
 */
interface RocketParams {
  position?: THREE.Vector3;
  color?: number;
}

/**
 * Class representing a rocket in the game
 */
export class Rocket {
  private mesh: THREE.Object3D;
  private body: CANNON.Body;
  private rocketMaterial: CANNON.Material;
  private thrusterParticles: ParticleSystem;

  /**
   * Create a new rocket
   * @param params Optional parameters to customize the rocket
   */
  constructor(params: RocketParams = {}) {
    try {
      // Set default values if not provided
      const position = params.position || new THREE.Vector3(0, 15, 0); // Higher starting position
      const color = params.color || 0xaaaaaa; // Gray color

      // Get the rocket model from the asset loader
      const rocketModel = assetLoader.getModel("rocket");

      if (!rocketModel) {
        throw new Error("Rocket model not loaded");
      }

      // Clone the model to avoid modifying the original
      this.mesh = rocketModel.clone();

      // Set up the mesh
      this.mesh.position.copy(position);

      // Apply shadow settings to all meshes in the model
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Scale the model if needed (adjust these values based on your model's size)
      this.mesh.scale.set(0.2, 0.2, 0.2);

      // Create physics material
      this.rocketMaterial = createPhysicsMaterial("rocket", 0.2, 0.5);

      // Create physics body using cylinder shape for collision
      // Note: We still use a cylinder for physics even though the visual is different
      this.body = new CANNON.Body({
        mass: 1, // kg
        material: this.rocketMaterial,
        shape: new CANNON.Cylinder(0.1, 0.1, 0.4, 8), // Scale dimensions to match visual model (0.2 * original size)
        position: new CANNON.Vec3(position.x, position.y, position.z),
        linearDamping: 0.1, // Air resistance for linear motion
        angularDamping: 0.5, // Air resistance for rotation
      });

      // Adjust the shape offset so the bottom of the cylinder contacts surfaces
      const cylinderHeight = 0.2; // Height of the cylinder shape (scaled to match visual)
      this.body.shapeOffsets[0].set(0, -cylinderHeight / 2, 0);
      this.body.updateMassProperties();
      this.body.updateBoundingRadius();

      // Add body to physics world
      world.addBody(this.body);

      // Store a reference to this object for easier access in collision handling
      this.mesh.userData.owner = this;
      // Use type assertion for userData since it's not in the type definition
      (this.body as any).userData = { type: "rocket", owner: this };

      // Create thruster particle system
      this.thrusterParticles = new ParticleSystem({
        count: 200,
        color: 0xffa500, // Orange color
        size: 0.2,
        lifetime: 0.8, // Short lifetime for better effect
      });
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
   * Get the thruster particle system
   * @returns The thruster particle system
   */
  getThrusterParticles(): ParticleSystem {
    return this.thrusterParticles;
  }

  /**
   * Emit thruster particles
   * @param count Number of particles to emit
   */
  emitThrusterParticles(count: number = 10): void {
    // Calculate position at the bottom of rocket in local space
    const localPosition = new THREE.Vector3(0, -1, 0);
    const worldPosition = this.mesh.localToWorld(localPosition.clone());

    // Get the rocket's down direction in world space (opposite of up)
    const localDirection = new THREE.Vector3(0, -1, 0);
    const worldDirection = this.mesh
      .localToWorld(localDirection.clone())
      .sub(this.mesh.position)
      .normalize();

    // Spawn particles at the calculated position, in the rocket's down direction
    this.thrusterParticles.spawn(
      worldPosition,
      worldDirection,
      Math.PI / 8, // Narrower spread for thruster
      3, // Higher speed for thruster particles
      count
    );
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
    scene.add(this.thrusterParticles.getMesh());
  }

  /**
   * Remove the rocket from a Three.js scene
   * @param scene The scene to remove the rocket from
   */
  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    scene.remove(this.thrusterParticles.getMesh());
  }

  /**
   * Dispose of resources used by the rocket
   */
  dispose(): void {
    // Remove from physics world
    world.removeBody(this.body);

    // Dispose of particle system
    this.thrusterParticles.dispose();

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
