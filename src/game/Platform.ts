import * as CANNON from "cannon-es";
import * as THREE from "three";

import { handleRenderingError } from "../utils/errorHandler";

import { ParticleSystem } from "./particleSystem";
import { createPhysicsMaterial, world } from "./physics";

/**
 * Parameters for creating a landing platform
 */
interface PlatformParams {
  position?: THREE.Vector3;
  width?: number;
  depth?: number;
  height?: number;
  color?: number;
  texture?: THREE.Texture;
  movement?: {
    type: "oscillate" | "drift" | "tilt";
    axis?: "x" | "z";
    amplitude: number;
    frequency: number;
  };
}

/**
 * Class representing a landing platform in the game
 */
export class Platform {
  private mesh: THREE.Mesh;
  private body: CANNON.Body;
  private platformMaterial: CANNON.Material;
  private initialPosition: CANNON.Vec3;
  private movement?: {
    type: "oscillate" | "drift" | "tilt";
    axis: "x" | "z";
    amplitude: number;
    frequency: number;
  };
  private dustParticles: ParticleSystem | null = null;

  /**
   * Create a new landing platform
   * @param params Optional parameters to customize the platform
   */
  constructor(params: PlatformParams = {}) {
    try {
      // Set default values if not provided
      const position = params.position || new THREE.Vector3(0, 0, 0);
      const width = params.width || 5;
      const depth = params.depth || 5;
      const height = params.height || 1;
      const color = params.color;

      // Store movement configuration if provided
      if (params.movement) {
        this.movement = {
          type: params.movement.type,
          axis: params.movement.axis || "x",
          amplitude: params.movement.amplitude,
          frequency: params.movement.frequency
        };
      }

      // Create geometry
      const geometry = new THREE.BoxGeometry(
        width, // width
        height, // height
        depth // depth
      );

      // Create material
      const material = new THREE.MeshPhongMaterial({
        color,
        shininess: 10,
        flatShading: false
      });

      // Apply texture if provided
      if (params.texture) {
        material.map = params.texture;
        material.needsUpdate = true;
      }

      // Create mesh
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.position.copy(position);
      this.mesh.position.y = 2; // Position platform above terrain
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;

      // Create physics material
      this.platformMaterial = createPhysicsMaterial("platform");

      // Create physics body (mass = 0 makes it static)
      const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
      this.body = new CANNON.Body({
        mass: 0, // Static body
        material: this.platformMaterial,
        shape: shape,
        position: new CANNON.Vec3(position.x, 2, position.z), // Match visual position
        type: CANNON.Body.STATIC,
        fixedRotation: false
      });

      // Store initial position for movement
      this.initialPosition = this.body.position.clone();

      // Add body to physics world
      world.addBody(this.body);

      // Initialize dust particles
      this.initDustParticles();

      // Store a reference to this object for easier access in collision handling
      this.mesh.userData.owner = this;
      // Use type assertion for userData since it's not in the type definition
      (this.body as any).userData = { type: "platform", owner: this };
    } catch (error) {
      handleRenderingError("Failed to create platform", error as Error);
      throw error; // Re-throw to prevent creating an invalid object
    }
  }

  /**
   * Initialize dust particle system for the landing effect
   */
  private initDustParticles(): void {
    this.dustParticles = new ParticleSystem({
      count: 200, // Higher count for more dense dust
      color: 0xeeeeee, // Light gray/white dust
      size: 0.5,
      lifetime: 3, // Longer lifetime to linger in the air
      maxParticlesPerFrame: 30,
      colorVariation: true,
      colorRange: [0xdddddd, 0xaaaaaa], // From light gray to medium gray
      sizeVariation: [0.2, 0.8], // Variation in particle sizes
      alphaVariation: true,
      alphaRange: [0.3, 0.7] // Semi-transparent particles
    });
  }

  /**
   * Trigger dust particles when rocket is near platform and using thrusters
   * @param rocketPosition Current rocket position
   * @param isThrusting Whether the rocket is currently thrusting
   * @param rocketVelocity Current rocket velocity vector
   */
  public triggerLandingDust(
    rocketPosition: THREE.Vector3,
    isThrusting: boolean,
    rocketVelocity: THREE.Vector3
  ): void {
    if (!this.dustParticles) return;

    // Get platform position and dimensions
    const platformPosition = new THREE.Vector3().copy(this.body.position as any);
    const platformSize = new THREE.Vector3(
      (this.body.shapes[0] as CANNON.Box).halfExtents.x * 2,
      (this.body.shapes[0] as CANNON.Box).halfExtents.y * 2,
      (this.body.shapes[0] as CANNON.Box).halfExtents.z * 2
    );

    // Calculate height of rocket above platform
    const heightAbovePlatform = rocketPosition.y - (platformPosition.y + platformSize.y / 2);

    // Only trigger dust if rocket is close to platform, thrusting, and moving downward
    const proximityThreshold = 5; // Distance at which dust starts to appear
    // const velocityThreshold = -0.5; // Negative velocity means moving downward

    if (
      heightAbovePlatform < proximityThreshold &&
      heightAbovePlatform > 0 &&
      isThrusting &&
      rocketVelocity.y < 0
    ) {
      // Calculate dust intensity based on proximity and velocity
      const proximityFactor = 1 - heightAbovePlatform / proximityThreshold;
      const velocityFactor = Math.min(Math.abs(rocketVelocity.y) / 5, 1);
      const intensity = proximityFactor * velocityFactor;

      // Calculate particles to spawn based on intensity
      const particlesToSpawn = Math.floor(25 * intensity);

      // Spawn particles at random positions across the platform top surface
      for (let i = 0; i < particlesToSpawn; i++) {
        // Random position on platform top surface
        const randomX = platformPosition.x + (Math.random() - 0.5) * platformSize.x * 0.8; // 80% of platform width
        const randomZ = platformPosition.z + (Math.random() - 0.5) * platformSize.z * 0.8; // 80% of platform depth

        // Position particles at the platform surface
        const spawnPos = new THREE.Vector3(
          randomX,
          platformPosition.y + platformSize.y / 2 + 0.1, // Just above platform
          randomZ
        );

        // Direction outward from center with upward component
        const dirToEdge = new THREE.Vector3(
          randomX - platformPosition.x,
          0.5 + Math.random() * 0.5, // Upward component
          randomZ - platformPosition.z
        ).normalize();

        // Spawn the particles
        this.dustParticles.spawn(
          spawnPos,
          dirToEdge,
          Math.PI / 4, // 45 degree spread
          2 + Math.random() * 3 * intensity, // Speed based on intensity
          1 // Spawn 1 particle per call to avoid clumping
        );
      }
    }
  }

  /**
   * Update platform position/rotation based on movement type
   * @param time Current time in seconds
   */
  update(time: number): void {
    if (!this.movement) return;

    const { type, axis, amplitude, frequency } = this.movement;

    switch (type) {
      case "oscillate":
        // Oscillate platform along the specified axis
        this.body.position[axis] =
          this.initialPosition[axis] + Math.sin(time * frequency) * amplitude;
        break;

      case "drift":
        // Slowly drift platform along the specified axis
        this.body.position[axis] += amplitude * 0.016; // Assume 60fps, so 0.016 seconds per frame

        // Reset position when platform drifts too far
        if (Math.abs(this.body.position[axis] - this.initialPosition[axis]) > 20) {
          this.body.position[axis] = this.initialPosition[axis];
        }
        break;

      case "tilt":
        // Tilt the platform around an axis
        if (axis === "x") {
          this.body.quaternion.setFromAxisAngle(
            new CANNON.Vec3(0, 0, 1),
            Math.sin(time * frequency) * amplitude
          );
        } else {
          this.body.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0),
            Math.sin(time * frequency) * amplitude
          );
        }
        break;
    }

    // Sync mesh position and rotation with physics body
    this.mesh.position.copy(this.body.position as unknown as THREE.Vector3);
    this.mesh.quaternion.copy(this.body.quaternion as unknown as THREE.Quaternion);
  }

  /**
   * Update dust particles if active
   * @param deltaTime Time elapsed since last update
   * @param camera Camera for culling particles
   */
  updateDust(deltaTime: number, camera?: THREE.Camera): void {
    if (this.dustParticles) {
      this.dustParticles.update(deltaTime, camera);
    }
  }

  /**
   * Change the platform's texture
   * @param texture The new texture to apply
   */
  updateTexture(texture: THREE.Texture): void {
    const material = this.mesh.material as THREE.MeshPhongMaterial;
    material.map = texture;
    material.needsUpdate = true;
  }

  /**
   * Get the Three.js mesh for the platform
   * @returns The platform's mesh
   */
  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  /**
   * Get the dust particles system
   * @returns The dust particle system or null if not initialized
   */
  getDustParticles(): ParticleSystem | null {
    return this.dustParticles;
  }

  /**
   * Get the Cannon.js body for the platform
   * @returns The platform's physics body
   */
  getBody(): CANNON.Body {
    return this.body;
  }

  /**
   * Set the position of the platform
   * @param position The new position
   */
  setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
    this.body.position.set(position.x, position.y, position.z);
    // Update initial position for movement calculations
    this.initialPosition = this.body.position.clone();
  }

  /**
   * Add the platform to a Three.js scene
   * @param scene The scene to add the platform to
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);

    // Add dust particles to the scene
    if (this.dustParticles) {
      scene.add(this.dustParticles.getMesh());
    }
  }

  /**
   * Remove the platform from a Three.js scene
   * @param scene The scene to remove the platform from
   */
  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);

    // Remove dust particles from the scene
    if (this.dustParticles) {
      scene.remove(this.dustParticles.getMesh());
    }
  }

  /**
   * Dispose of resources used by the platform
   */
  dispose(): void {
    // Remove from physics world
    world.removeBody(this.body);

    // Dispose of Three.js resources
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }

    if (this.mesh.material) {
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach((material) => material.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }

    // Dispose of dust particles
    if (this.dustParticles) {
      this.dustParticles.dispose();
      this.dustParticles = null;
    }
  }
}
