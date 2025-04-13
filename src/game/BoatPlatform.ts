import * as THREE from "three";
import * as CANNON from "cannon-es";
import { world, createPhysicsMaterial } from "./physics";
import { handleRenderingError } from "../utils/errorHandler";

/**
 * Parameters for creating a boat platform
 */
interface BoatPlatformParams {
  position?: THREE.Vector3;
  size?: THREE.Vector3;
  color?: number;
  texture?: THREE.Texture;
}

/**
 * Class representing a boat platform in the sea environment
 */
export class BoatPlatform {
  private mesh: THREE.Mesh;
  private body: CANNON.Body;
  private platformMaterial: CANNON.Material;

  /**
   * Create a new boat platform
   * @param params Optional parameters to customize the boat
   */
  constructor(params: BoatPlatformParams = {}) {
    try {
      // Set default values if not provided
      const position = params.position || new THREE.Vector3(0, 0.5, 0);
      const size = params.size || new THREE.Vector3(10, 1, 20);
      const color = params.color || 0x8b4513; // Wooden brown color

      // Create geometry
      const geometry = new THREE.BoxGeometry(
        size.x, // width
        size.y, // height
        size.z // depth
      );

      // Create material
      const material = new THREE.MeshPhongMaterial({
        color,
        shininess: 5,
        flatShading: false,
      });

      // Apply texture if provided
      if (params.texture) {
        material.map = params.texture;
        material.needsUpdate = true;
      }

      // Create mesh
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.position.copy(position);
      this.mesh.position.y = 0.5; // Position boat to float on sea surface
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;

      // Create physics material
      this.platformMaterial = createPhysicsMaterial("boat", 0.3, 0.8);

      // Create physics body (mass = 0 makes it static)
      const shape = new CANNON.Box(
        new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
      );
      this.body = new CANNON.Body({
        mass: 0, // Static body
        material: this.platformMaterial,
        shape: shape,
        position: new CANNON.Vec3(position.x, 0.5, position.z), // Match visual position
        type: CANNON.Body.STATIC,
      });

      // Add body to physics world
      world.addBody(this.body);

      // Store a reference to this object for easier access in collision handling
      this.mesh.userData.owner = this;
      (this.body as any).userData = { type: "boat", owner: this };
    } catch (error) {
      handleRenderingError("Failed to create boat platform", error as Error);
      throw error;
    }
  }

  /**
   * Change the boat's texture
   * @param texture The new texture to apply
   */
  updateTexture(texture: THREE.Texture): void {
    const material = this.mesh.material as THREE.MeshPhongMaterial;
    material.map = texture;
    material.needsUpdate = true;
  }

  /**
   * Get the Three.js mesh for the boat
   * @returns The boat's mesh
   */
  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  /**
   * Get the Cannon.js body for the boat
   * @returns The boat's physics body
   */
  getBody(): CANNON.Body {
    return this.body;
  }

  /**
   * Set the position of the boat
   * @param position The new position
   */
  setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
    this.body.position.set(position.x, position.y, position.z);
  }

  /**
   * Add the boat to a Three.js scene
   * @param scene The scene to add the boat to
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  /**
   * Remove the boat from a Three.js scene
   * @param scene The scene to remove the boat from
   */
  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }

  /**
   * Dispose of resources used by the boat
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
