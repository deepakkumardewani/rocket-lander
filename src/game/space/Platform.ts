import * as CANNON from "cannon-es";
import * as THREE from "three";

import { handleRenderingError } from "../../utils/errorHandler";
import { createPhysicsMaterial, world } from "../physics";

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
}

/**
 * Class representing a landing platform in the game
 */
export class Platform {
  private mesh: THREE.Mesh;
  private body: CANNON.Body;
  private platformMaterial: CANNON.Material;

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
      this.platformMaterial = createPhysicsMaterial("platform", 0.3, 0.8);

      // Create physics body (mass = 0 makes it static)
      const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
      this.body = new CANNON.Body({
        mass: 0, // Static body
        material: this.platformMaterial,
        shape: shape,
        position: new CANNON.Vec3(position.x, 2, position.z), // Match visual position
        type: CANNON.Body.STATIC
      });

      // Add body to physics world
      world.addBody(this.body);

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
  }

  /**
   * Add the platform to a Three.js scene
   * @param scene The scene to add the platform to
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  /**
   * Remove the platform from a Three.js scene
   * @param scene The scene to remove the platform from
   */
  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);
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
  }
}
